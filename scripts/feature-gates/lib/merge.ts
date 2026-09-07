import type { FeatureGateDraft } from '../../../app/entities/feature-gate/lib/feature-gates-schema';
import type { FeatureProbeResult } from './rpc';

export type RefreshMode = 'default' | 'refresh-activated';

/**
 * Append schedule features we haven't persisted before. Existing records are
 * left as-is: schedule metadata (`title`, `simds`, version floors, owners) is
 * deliberately not merged back into existing rows, because a failed
 * SIMD-proposals lookup yields empty links that would otherwise clobber good
 * persisted data. The exception is `simd_link`, whose empty slots are healed
 * by the separate `resolveMissingSimdLinks` pass — that pass is guarded so
 * non-empty links are never overwritten. Features without a `key` are dropped.
 */
export function appendNewFeatures(existing: FeatureGateDraft[], scraped: FeatureGateDraft[]): FeatureGateDraft[] {
    const knownKeys = new Set(existing.map(feature => feature.key));
    const newFeatures = scraped.filter(feature => feature.key && !knownKeys.has(feature.key));
    if (newFeatures.length > 0) {
        console.log('New features:');
        for (const feature of newFeatures) {
            console.log(`  ${feature.key} - ${feature.title}`);
        }
    }
    return [...existing, ...newFeatures];
}

/**
 * Decide what value to store for a feature/cluster pair based on the probe and
 * the run mode.
 *
 * - `activated`: trust the freshly-derived epoch unconditionally.
 * - `unreachable`: keep the existing value — a transient RPC blip must not
 *   wipe known-good data, regardless of mode.
 * - `missing` / `unactivated`: in default mode preserve existing data (we
 *   could be hitting one bad cluster among three; not worth the diff churn);
 *   in refresh mode trust the chain and clear the field. This is the path
 *   that corrects stale activation epochs for accounts that have since
 *   disappeared from chain (e.g. testnet reset, feature pruned upstream).
 */
export function resolveEpoch(probe: FeatureProbeResult, backup: number | null, mode: RefreshMode): number | null {
    if (probe.kind === 'activated') return probe.epoch;
    if (probe.kind === 'unreachable') return backup;
    // eslint-disable-next-line unicorn/no-null -- the schema uses nullable(number()); null is the on-disk "no activation" value
    return mode === 'refresh-activated' ? null : backup;
}

export function hasDescription(feature: FeatureGateDraft): boolean {
    return Boolean(feature.description && feature.description.trim());
}
