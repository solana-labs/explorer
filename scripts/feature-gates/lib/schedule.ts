/* eslint-disable unicorn/no-null -- null literals match the nullable feature-gate schema fields */
import { array, assert, type Infer, nullable, number, record, string, type, union, unknown } from 'superstruct';

import type { FeatureGateDraft } from '../../../app/entities/feature-gate/lib/feature-gates-schema';
import { fetchSimdProposals, resolveSimdLinks } from './simd-proposals';

const SCHEDULE_URL = 'https://raw.githubusercontent.com/wiki/anza-xyz/agave/feature-gate-tracker-schedule.json';

/**
 * Fetch the Agave feature-gate schedule and the SIMD proposals listing, then
 * parse them into feature records. Throws if the schedule is unreachable or
 * malformed (it's the essential data source); a failed proposals lookup just
 * yields empty links.
 *
 * Returns the proposals map alongside the features so the orchestrator can
 * also use it to back-fill any previously-stored rows whose `simd_link` is
 * still empty (e.g. a feature first scraped during a transient GitHub outage).
 */
export async function fetchScheduledFeatures(): Promise<{
    features: FeatureGateDraft[];
    proposals: Map<string, string>;
}> {
    const response = await fetch(SCHEDULE_URL);
    if (!response.ok) {
        throw new Error(`Failed to fetch feature-gate schedule: HTTP ${response.status}`);
    }
    const schedule = await response.json();
    const proposals = await fetchSimdProposals();
    const features = featuresFromSchedule(schedule, proposals);
    // Zero pending rows is legitimate (everything queued reached mainnet), so it
    // isn't an error — but it's also what a truncated upstream document looks
    // like, and the two are indistinguishable from the document alone. Log the
    // count so a drop to zero is visible in the run rather than silent.
    console.log(`Parsed ${features.length} pending features from the Agave schedule.`);
    return { features, proposals };
}

/**
 * Turn the Agave feature-gate schedule JSON into feature records. Only the
 * "Pending …" sections are imported (the "Fully Activated" section is skipped);
 * selection is by section name, not position, so an added or reordered section
 * can't silently shift which rows we pick up.
 *
 * Throws when no pending section exists at all, or when a pending row doesn't
 * match {@link ScheduleEntrySchema} — we'd rather the cron PR fail loudly on an
 * upstream rename than silently emit rows with blank titles/keys.
 */
export function featuresFromSchedule(schedule: unknown, proposals: Map<string, string>): FeatureGateDraft[] {
    assert(schedule, ScheduleSchema);

    const pending = Object.entries(schedule).filter(([section]) => isPendingSection(section));
    if (pending.length === 0) {
        throw new Error(
            `Feature-gate schedule has no "Pending …" section. Found sections: ${Object.keys(schedule).join(', ')}.`,
        );
    }

    const features: FeatureGateDraft[] = [];
    for (const [section, rows] of pending) {
        for (const entry of parsePendingSection(section, rows)) {
            const simds = compact(entry.SIMDs);
            features.push(scheduleEntryToFeature(entry, resolveSimdLinks(simds.join(','), proposals)));
        }
    }
    return features;
}

/**
 * Convert one schedule row into the on-disk feature shape. Mainnet activation
 * is absent from the schedule (it only tracks devnet/testnet), so it stays null
 * here and is filled in later from on-chain reads; the same goes for
 * `comms_required` and `planned_testnet_order`, which are explorer-side fields.
 *
 * `Description` is populated upstream for only a handful of rows; when it's
 * empty the long-form description gets back-filled from the linked SIMD
 * markdown later in the pipeline.
 */
export function scheduleEntryToFeature(entry: ScheduleEntry, simdLinks: string[]): FeatureGateDraft {
    const simds = compact(entry.SIMDs);
    return {
        comms_required: null,
        description: (entry.Description ?? '').trim(),
        devnet_activation_epoch: parseEpoch(entry['Devnet Epoch']),
        key: entry['Feature ID'].trim(),
        mainnet_activation_epoch: null,
        min_agave_versions: compact(entry['Min Agave Versions']),
        min_fd_versions: compact(entry['Min FD Versions']),
        min_jito_versions: compact(entry['Min Jito Versions']),
        owners: compact(entry.Owners),
        planned_testnet_order: null,
        // Keep `simd_link` index-aligned with `simds`: readers pair the two arrays
        // positionally, so an unpaired '' placeholder for a SIMD-less row is noise.
        simd_link: simds.length === 0 ? [] : simdLinks,
        simds,
        testnet_activation_epoch: parseEpoch(entry['Testnet Epoch']),
        title: entry.Title.trim(),
    };
}

/**
 * Epoch cells carry a number, `null`, or `''` — the schedule mirrors the wiki
 * table it's generated from, blank cells included. Non-numeric text (e.g. a
 * hand-written "TBD") also lands as "no epoch yet" rather than failing the run.
 */
export function parseEpoch(value: number | string | null): number | null {
    if (value === null) return null;
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    const trimmed = value.trim();
    if (trimmed === '') return null;
    const parsed = Number.parseInt(trimmed, 10);
    return Number.isNaN(parsed) ? null : parsed;
}

/** Trim each entry and drop the blanks — upstream spells "no value" as `['']`. */
export function compact(values: string[]): string[] {
    return values.map(value => value.trim()).filter(value => value.length > 0);
}

const EpochCellSchema = nullable(union([number(), string()]));

/**
 * One row of a pending section.
 *
 * `type` (not `object`) on purpose: this is somebody else's document and Anza
 * adds columns to it over time (`Min FRD Versions` arrived that way), so an
 * unknown key must not break the nightly cron. A *renamed* key we read below
 * still fails, which is the drift we actually want caught.
 */
const ScheduleEntrySchema = type({
    Description: nullable(string()),
    'Devnet Epoch': EpochCellSchema,
    'Feature ID': string(),
    'Min Agave Versions': array(string()),
    'Min FD Versions': array(string()),
    'Min Jito Versions': array(string()),
    Owners: array(string()),
    SIMDs: array(string()),
    'Testnet Epoch': EpochCellSchema,
    Title: string(),
});

/**
 * Section name -> rows. Rows stay `unknown` at this level so that a shape change
 * in a section we never import ("Fully Activated") can't fail the run; only the
 * pending sections are validated against {@link ScheduleEntrySchema}.
 */
const ScheduleSchema = record(string(), array(unknown()));

export type ScheduleEntry = Infer<typeof ScheduleEntrySchema>;

function isPendingSection(section: string): boolean {
    return section.toLowerCase().startsWith('pending');
}

function parsePendingSection(section: string, rows: unknown[]): ScheduleEntry[] {
    try {
        assert(rows, array(ScheduleEntrySchema));
        return rows;
    } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        throw new Error(`Pending schedule section "${section}" does not match the expected row shape: ${detail}`);
    }
}
