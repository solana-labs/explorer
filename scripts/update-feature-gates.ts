#!/usr/bin/env -S pnpm exec tsx

/**
 * Regenerate `app/entities/feature-gate/feature-gates.json`. Single entry point
 * for the daily `update-feature-gates` workflow — reads the JSON once, runs the
 * full pipeline in memory, and writes once:
 *
 *   1. Read the "pending mainnet/devnet/testnet" sections from the Agave
 *      feature-gate schedule JSON, resolve the SIMD numbers to GitHub URLs,
 *      and merge any newly-listed features into the persisted set.
 *   2. Back-fill any `simd_link` slots that are still empty on already-stored
 *      rows (recovery path for first-import runs where the proposals fetch
 *      failed). Non-empty entries are never overwritten.
 *   3. Refresh activation epochs for every cluster (devnet, testnet, mainnet)
 *      in parallel via on-chain account reads. The three RPCs are independent
 *      hosts, so parallel passes don't contend on each other; within a pass,
 *      requests stay sequential to respect per-host rate limits.
 *   4. Back-fill any missing `description` fields from the linked SIMD markdown,
 *      with bounded concurrency to keep GitHub traffic gentle.
 *
 * Run from the repo root:
 *   pnpm exec tsx scripts/update-feature-gates.ts                 # CI / cron mode
 *   pnpm exec tsx scripts/update-feature-gates.ts --refresh-activated
 *     ↑ Re-reads every feature on every cluster (not just pending ones), and
 *       trusts the chain over the stored value: when an account is missing or
 *       unactivated, the corresponding field is set to `null` instead of being
 *       preserved. Manual rebuild — multiplies RPC traffic ~3×, never enabled
 *       on the daily cron.
 */

import type { FeatureGateDraft } from '../app/entities/feature-gate/lib/feature-gates-schema';
import { readFeatureGates, writeFeatureGates } from './feature-gates/lib/feature-store';
import { appendNewFeatures, hasDescription, type RefreshMode, resolveEpoch } from './feature-gates/lib/merge';
import { connectCluster, type FeatureProbeResult, probeFeatureActivation } from './feature-gates/lib/rpc';
import { fetchScheduledFeatures } from './feature-gates/lib/schedule';
import { resolveMissingSimdLinks } from './feature-gates/lib/simd-proposals';
import { fetchSimdSummary } from './feature-gates/lib/simd-summary';

const DEVNET_RPC_URL = process.env.SOLANA_DEVNET_RPC ?? 'https://api.devnet.solana.com';
const TESTNET_RPC_URL = process.env.SOLANA_TESTNET_RPC ?? 'https://api.testnet.solana.com';
const MAINNET_RPC_URL = process.env.SOLANA_MAINNET_RPC ?? 'https://api.mainnet-beta.solana.com';
const DESCRIPTION_FETCH_CONCURRENCY = 6;

async function main() {
    const mode: RefreshMode = process.argv.includes('--refresh-activated') ? 'refresh-activated' : 'default';
    if (mode === 'refresh-activated') {
        console.log('Refresh mode: re-reading every feature on every cluster; stale values will be cleared.');
    }

    const { features: scheduledFeatures, proposals } = await fetchScheduledFeatures();
    const seeded = appendNewFeatures(readFeatureGates(), scheduledFeatures);
    const relinked = resolveMissingSimdLinks(seeded, proposals);
    const withEpochs = await refreshAllEpochs(relinked, mode);
    const enriched = await enrichDescriptions(withEpochs);
    writeFeatureGates(enriched);
}

type EpochField = 'devnet_activation_epoch' | 'mainnet_activation_epoch' | 'testnet_activation_epoch';
type EligibilityCheck = (feature: FeatureGateDraft) => boolean;

/** Worth re-checking on devnet/testnet only while the feature hasn't shipped to mainnet. */
const stillPending: EligibilityCheck = feature => feature.mainnet_activation_epoch === null;

/** Mainnet activates only after a feature is already live on both devnet and testnet. */
const liveButNotOnMainnet: EligibilityCheck = feature =>
    feature.devnet_activation_epoch !== null &&
    feature.testnet_activation_epoch !== null &&
    feature.mainnet_activation_epoch === null;

const everyFeature: EligibilityCheck = () => true;

/**
 * Refresh all three activation-epoch fields in parallel. Devnet, testnet and
 * mainnet RPCs are independent hosts, so parallel passes don't contend; within
 * a pass, requests stay sequential to respect per-host rate limits.
 */
async function refreshAllEpochs(features: FeatureGateDraft[], mode: RefreshMode): Promise<FeatureGateDraft[]> {
    const eligibility =
        mode === 'refresh-activated'
            ? { devnet: everyFeature, mainnet: everyFeature, testnet: everyFeature }
            : { devnet: stillPending, mainnet: liveButNotOnMainnet, testnet: stillPending };

    const passes = [
        { field: 'devnet_activation_epoch', isEligible: eligibility.devnet, rpcUrl: DEVNET_RPC_URL },
        { field: 'testnet_activation_epoch', isEligible: eligibility.testnet, rpcUrl: TESTNET_RPC_URL },
        { field: 'mainnet_activation_epoch', isEligible: eligibility.mainnet, rpcUrl: MAINNET_RPC_URL },
    ] as const;

    const epochsByField = await Promise.all(
        passes.map(pass => refreshEpochs(features, pass.field, pass.rpcUrl, pass.isEligible, mode)),
    );

    const [devnet, testnet, mainnet] = epochsByField;
    return features.map((feature, index) => ({
        ...feature,
        devnet_activation_epoch: devnet[index],
        mainnet_activation_epoch: mainnet[index],
        testnet_activation_epoch: testnet[index],
    }));
}

/**
 * For one cluster, return an array of the same length as `features` where
 * eligible rows carry the freshly-derived value and skipped rows carry the
 * existing value (so the merge in `refreshAllEpochs` is a straight overwrite).
 */
async function refreshEpochs(
    features: FeatureGateDraft[],
    field: EpochField,
    rpcUrl: string,
    isEligible: EligibilityCheck,
    mode: RefreshMode,
): Promise<(number | null)[]> {
    const clusterName = field.replace('_activation_epoch', '');
    const targets = features.map((feature, index) => ({ feature, index })).filter(({ feature }) => isEligible(feature));

    if (targets.length === 0) {
        return features.map(feature => feature[field]);
    }

    console.log(`Checking ${targets.length} features against ${clusterName}...`);
    const { rpc, schedule } = await connectCluster(rpcUrl);
    const result = features.map(feature => feature[field]);
    for (const { feature, index } of targets) {
        const probe = await probeFeatureActivation(rpc, schedule, feature.key);
        result[index] = resolveEpoch(probe, feature[field], mode);
        console.log(`  [${clusterName}] ${describeProbe(probe)} ${feature.key}`);
    }
    return result;
}

function describeProbe(probe: FeatureProbeResult): string {
    switch (probe.kind) {
        case 'activated':
            return `→ epoch ${probe.epoch}`;
        case 'unactivated':
            return '  unactivated';
        case 'missing':
            return '  missing';
        case 'unreachable':
            return '  unreachable';
    }
}

/**
 * Back-fill missing descriptions from each feature's linked SIMD markdown.
 * Eligible features are fetched in bounded-concurrency chunks so a wave of new
 * pending features doesn't serialize into N × HTTP-RTT.
 */
async function enrichDescriptions(features: FeatureGateDraft[]): Promise<FeatureGateDraft[]> {
    const targets = features.filter(feature => !hasDescription(feature));
    if (targets.length === 0) {
        console.log('No descriptions to enrich.');
        return features;
    }
    console.log(`Enriching ${targets.length} feature descriptions from SIMD markdown...`);

    const summaries = new Map<string, string>();
    for (let cursor = 0; cursor < targets.length; cursor += DESCRIPTION_FETCH_CONCURRENCY) {
        const chunk = targets.slice(cursor, cursor + DESCRIPTION_FETCH_CONCURRENCY);
        const results = await Promise.all(chunk.map(feature => fetchSimdSummary(feature.simd_link)));
        for (const [chunkIndex, summary] of results.entries()) {
            const feature = chunk[chunkIndex];
            if (summary !== undefined) {
                summaries.set(feature.key, summary);
                console.log(`  + ${feature.title || feature.key}: ${summary.slice(0, 80)}…`);
            }
        }
    }
    console.log(`Enriched ${summaries.size} feature descriptions.`);

    return features.map(feature => {
        const description = summaries.get(feature.key);
        return description === undefined ? feature : { ...feature, description };
    });
}

main().catch(error => {
    console.error(error);
    process.exit(1);
});
