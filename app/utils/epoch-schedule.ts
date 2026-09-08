import { Cluster } from '@/app/utils/cluster';

const MINIMUM_SLOT_PER_EPOCH = BigInt(32);

export interface EpochSchedule {
    /** The maximum number of slots in each epoch */
    slotsPerEpoch: bigint;
    /** The first epoch with `slotsPerEpoch` slots */
    firstNormalEpoch: bigint;
    /** The first slot of `firstNormalEpoch` */
    firstNormalSlot: bigint;
}

// Returns the number of trailing zeros in the binary representation of n
function trailingZeros(n: bigint): number {
    let trailingZeros = 0;
    while (n > 1) {
        n /= 2n;
        trailingZeros++;
    }
    return trailingZeros;
}

// Returns the smallest power of two greater than or equal to n
function nextPowerOfTwo(n: bigint): bigint {
    if (n === 0n) return 1n;
    n--;
    n |= n >> 1n;
    n |= n >> 2n;
    n |= n >> 4n;
    n |= n >> 8n;
    n |= n >> 16n;
    n |= n >> 32n;
    return n + 1n;
}

/**
 * Get the epoch number for a given slot
 * @param epochSchedule Epoch schedule information
 * @param slot The slot to get the epoch number for
 * @returns The epoch number that contains or will contain the given slot
 */
export function getEpochForSlot(epochSchedule: EpochSchedule, slot: bigint): bigint {
    if (slot < epochSchedule.firstNormalSlot) {
        const epoch =
            trailingZeros(nextPowerOfTwo(slot + MINIMUM_SLOT_PER_EPOCH + BigInt(1))) -
            trailingZeros(MINIMUM_SLOT_PER_EPOCH) -
            1;

        return BigInt(epoch);
    } else {
        const normalSlotIndex = slot - epochSchedule.firstNormalSlot;
        const normalEpochIndex = normalSlotIndex / epochSchedule.slotsPerEpoch;
        const epoch = epochSchedule.firstNormalEpoch + normalEpochIndex;
        return epoch;
    }
}

/**
 * Get the first slot in a given epoch
 * @param epochSchedule Epoch schedule information
 * @param epoch Epoch to get the first slot for
 * @returns First slot in the epoch
 */
export function getFirstSlotInEpoch(epochSchedule: EpochSchedule, epoch: bigint): bigint {
    if (epoch <= epochSchedule.firstNormalEpoch) {
        return (2n ** epoch - 1n) * MINIMUM_SLOT_PER_EPOCH;
    } else {
        return (epoch - epochSchedule.firstNormalEpoch) * epochSchedule.slotsPerEpoch + epochSchedule.firstNormalSlot;
    }
}

/**
 * Get the last slot in a given epoch
 * @param epochSchedule Epoch schedule information
 * @param epoch Epoch to get the last slot for
 * @returns Last slot in the epoch
 */
export function getLastSlotInEpoch(epochSchedule: EpochSchedule, epoch: bigint): bigint {
    return getFirstSlotInEpoch(epochSchedule, epoch + 1n) - 1n;
}

/**
 * Represents a SIMD configuration for compute units per block.
 * Each configuration defines the maximum compute units allowed in a block and when it becomes active on each cluster.
 */
interface ComputeUnitConfigEntry {
    /** Optional reference SIMD ID (e.g. 0207) */
    readonly simd?: string;
    /** Optional reference account to feature (e.g. 5oMCU3JPaFLr8Zr4ct7yFA7jdk6Mw1RmB8K4u9ZbS42z) */
    readonly featureAccount?: string;
    /** Maximum compute units allowed in a block after specified epoch */
    readonly maxComputeUnits: number;
    /** When the configuration becomes active on each cluster */
    readonly activations: {
        readonly [Cluster.MainnetBeta]: number;
        readonly [Cluster.Devnet]: number;
        readonly [Cluster.Testnet]: number;
    };
}

/**
 * A list of SIMD configurations for compute units per block.
 * Add new configurations here as they are activated.
 */
const COMPUTE_UNIT_CONFIGS: readonly ComputeUnitConfigEntry[] = [
    {
        activations: {
            [Cluster.MainnetBeta]: 0,
            [Cluster.Devnet]: 0,
            [Cluster.Testnet]: 0,
        },
        maxComputeUnits: 48_000_000,
    },
    {
        activations: {
            [Cluster.MainnetBeta]: 770,
            [Cluster.Devnet]: 857,
            [Cluster.Testnet]: 764,
        },
        featureAccount: '5oMCU3JPaFLr8Zr4ct7yFA7jdk6Mw1RmB8K4u9ZbS42z',
        maxComputeUnits: 50_000_000,
        simd: '0207',
    },
    {
        activations: {
            [Cluster.MainnetBeta]: 822,
            [Cluster.Devnet]: 915,
            [Cluster.Testnet]: 812,
        },
        featureAccount: '6oMCUgfY6BzZ6jwB681J6ju5Bh6CjVXbd7NeWYqiXBSu',
        maxComputeUnits: 60_000_000,
        simd: '0256',
    },
    {
        activations: {
            [Cluster.MainnetBeta]: 1009,
            [Cluster.Devnet]: 1100,
            [Cluster.Testnet]: 983,
        },
        featureAccount: 'P1BCUMpAC7V2GRBRiJCNUgpMyWZhoqt3LKo712ePqsz',
        maxComputeUnits: 100_000_000,
        simd: '0286',
    },
];

/**
 * Get the maximum compute units allowed in a block for a given epoch and cluster.
 * @param epoch - The epoch to get the maximum compute units for. (default: 0)
 * @param cluster - The cluster to get the maximum compute units for. (for custom clusters, fallback to the most recent config w/ highest max compute units)
 * @returns (number) The maximum compute units allowed in a block for the given epoch and cluster.
 */
export function getMaxComputeUnitsInBlock({ epoch = 0n, cluster }: { epoch?: bigint; cluster: Cluster }): number {
    if (cluster === Cluster.Custom) {
        // Fallback to the most recent config w/ highest max compute units (e.g., local host should use most recent even if epoch is 0)
        return COMPUTE_UNIT_CONFIGS.reduce((max, config) => Math.max(max, config.maxComputeUnits), 0);
    }

    const epochNumber = Number(epoch);

    let applicableConfig = COMPUTE_UNIT_CONFIGS[0];
    let highestActivationEpoch = -1;

    for (const config of COMPUTE_UNIT_CONFIGS) {
        const activationEpoch = config.activations[cluster];
        // `>=` so that when several configs share an activation epoch on a cluster, the latest one wins.
        if (activationEpoch <= epochNumber && activationEpoch >= highestActivationEpoch) {
            applicableConfig = config;
            highestActivationEpoch = activationEpoch;
        }
    }

    return applicableConfig.maxComputeUnits;
}
