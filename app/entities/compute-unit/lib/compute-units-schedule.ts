import {
    type BlockTransaction,
    getBlockTransactionConfig,
    getBlockTransactionInstructions,
} from '@entities/block-data/@x/compute-unit';
import { type Address, address, getBase58Encoder } from '@solana/kit';
import { type ParsedInstruction, type PartiallyDecodedInstruction } from '@solana/web3.js';
import {
    COMPUTE_BUDGET_PROGRAM_ADDRESS,
    ComputeBudgetInstruction,
    identifyComputeBudgetInstruction,
    parseRequestUnitsInstruction,
    parseSetComputeUnitLimitInstruction,
} from '@solana-program/compute-budget';
import { Cluster } from '@utils/cluster';

const BASE58_ENCODER = getBase58Encoder();

/**
 * Built-in programs that have minimal reserved compute units (3k)
 * This list is based on the feature gate C9oAhLxDBm3ssWtJx1yBGzPY55r2rArHmN1pbQn6HogH
 * Source: https://solana.com/docs/references/feature-gates/reserve-minimal-cus-for-builtins
 */
const BUILTIN_PROGRAMS_3K: readonly string[] = [
    '11111111111111111111111111111111', // System Program
    'Stake11111111111111111111111111111111111111', // Stake Program
    'Config1111111111111111111111111111111111111', // Config Program
    'AddressLookupTab1e1111111111111111111111111', // Address Lookup Table Program
    'BPFLoaderUpgradeab1e11111111111111111111111', // BPF Loader Upgradeable
    'BPFLoader1111111111111111111111111111111111', // BPF Loader
    'BPFLoader2111111111111111111111111111111111', // BPF Loader 2
    'LoaderV411111111111111111111111111111111111', // Loader v4
    'ComputeBudget111111111111111111111111111111', // Compute Budget Program
    'KeccakSecp256k11111111111111111111111111111', // Keccak Secp256k1
    'Ed25519SigVerify111111111111111111111111111', // Ed25519 Signature Verify
];

/**
 * Represents a configuration for reserved compute units based on epoch
 */
interface ComputeUnitReserveConfig {
    /** Description of the change */
    readonly description: string;
    /** Feature account that activated this change (if applicable) */
    readonly featureAccount?: string;
    /** When the configuration becomes active on each cluster */
    readonly activations: {
        readonly [Cluster.MainnetBeta]: number;
        readonly [Cluster.Devnet]: number;
        readonly [Cluster.Testnet]: number;
        readonly [Cluster.Simd296]: number;
    };
    /** Function to get reserved compute units for a given program */
    readonly getReservedUnits: (programId: string) => number;
}

/**
 * Default compute units for transactions without explicit compute budget
 */
const DEFAULT_COMPUTE_UNITS = 200_000;

/**
 * Minimal compute units for built-in programs
 */
const MINIMAL_BUILTIN_COMPUTE_UNITS = 3_000;
const MAX_COMPUTE_UNITS = 1_400_000;

/**
 * Compute unit reserve configurations by epoch
 * Add new configurations here as features are activated
 */
const COMPUTE_UNIT_RESERVE_CONFIGS: readonly ComputeUnitReserveConfig[] = [
    {
        activations: {
            [Cluster.MainnetBeta]: 0,
            [Cluster.Devnet]: 0,
            [Cluster.Testnet]: 0,
            [Cluster.Simd296]: 0,
        },
        description: 'Initial configuration - no built-in program optimization',
        getReservedUnits: (_programId: string) => DEFAULT_COMPUTE_UNITS,
    },
    {
        activations: {
            [Cluster.MainnetBeta]: 759,
            [Cluster.Devnet]: 842,
            [Cluster.Testnet]: 750,
            [Cluster.Simd296]: 0,
        },
        description: 'Built-in programs use minimal compute units',
        featureAccount: 'C9oAhLxDBm3ssWtJx1yBGzPY55r2rArHmN1pbQn6HogH',
        getReservedUnits: (programId: string) => {
            if (BUILTIN_PROGRAMS_3K.includes(programId)) {
                return MINIMAL_BUILTIN_COMPUTE_UNITS;
            }
            // Feature gate program is already BPF at this point, uses default
            return DEFAULT_COMPUTE_UNITS;
        },
    },
];

/**
 * Get the reserved compute units for a program at a given epoch
 * @param programId - The program ID to check
 * @param epoch - The epoch to check
 * @param cluster - The cluster to check
 * @returns The reserved compute units for the program
 */
export function getReservedComputeUnits({
    programId,
    epoch = 0n,
    cluster,
}: {
    programId: string;
    epoch?: bigint;
    cluster: Cluster;
}): number {
    if (cluster === Cluster.Custom) {
        // For custom clusters, use the most recent configuration
        const latestConfig = COMPUTE_UNIT_RESERVE_CONFIGS[COMPUTE_UNIT_RESERVE_CONFIGS.length - 1];
        return latestConfig.getReservedUnits(programId);
    }

    const epochNumber = Number(epoch);

    let applicableConfig = COMPUTE_UNIT_RESERVE_CONFIGS[0];
    let highestActivationEpoch = -1;

    for (const config of COMPUTE_UNIT_RESERVE_CONFIGS) {
        const activationEpoch = config.activations[cluster];
        if (activationEpoch <= epochNumber && activationEpoch > highestActivationEpoch) {
            applicableConfig = config;
            highestActivationEpoch = activationEpoch;
        }
    }

    return applicableConfig.getReservedUnits(programId);
}

/**
 * Helper to extract compute units from a compute budget instruction
 */
function extractComputeUnitsFromInstruction(instruction: { programAddress: Address; data: Uint8Array }): number | null {
    if (instruction.programAddress !== COMPUTE_BUDGET_PROGRAM_ADDRESS) {
        return null;
    }

    try {
        const ix = {
            accounts: [],
            data: instruction.data,
            programAddress: instruction.programAddress,
        };

        const type = identifyComputeBudgetInstruction(ix);

        if (type === ComputeBudgetInstruction.SetComputeUnitLimit) {
            const parsed = parseSetComputeUnitLimitInstruction(ix);
            return parsed.data.units;
        } else if (type === ComputeBudgetInstruction.RequestUnits) {
            const parsed = parseRequestUnitsInstruction(ix);
            return parsed.data.units;
        }
    } catch {
        // Instruction is not a recognized compute budget instruction
    }

    return null;
}

/**
 * Estimate the requested compute units for a transaction
 * @param tx - The transaction to analyze
 * @param epoch - The epoch of the transaction
 * @param cluster - The cluster the transaction is on
 * @returns The estimated compute units requested
 */
export function estimateRequestedComputeUnits(
    tx: BlockTransaction,
    epoch: bigint | undefined,
    cluster: Cluster,
): number {
    // v1 carries its compute unit limit in the message config; an absent limit means zero.
    if (tx.message.version === 1) {
        return Math.min(getBlockTransactionConfig(tx.message)?.computeUnitLimit ?? 0, MAX_COMPUTE_UNITS);
    }

    // First, check for explicit compute budget instructions
    let totalReservedUnits = 0;
    for (const instruction of getBlockTransactionInstructions(tx.message)) {
        const programAddress = tx.message.staticAccounts[instruction.programAddressIndex];
        const requestedUnits = extractComputeUnitsFromInstruction({
            data: instruction.data,
            programAddress,
        });

        if (requestedUnits !== null) {
            totalReservedUnits = requestedUnits;
            break;
        } else {
            const reservedUnits = getReservedComputeUnits({
                cluster,
                epoch,
                programId: programAddress,
            });
            totalReservedUnits += reservedUnits;
        }
    }

    return Math.min(totalReservedUnits, MAX_COMPUTE_UNITS);
}

/**
 * Estimates requested compute units for a parsed transaction.
 * Checks for compute budget instructions and extracts the units if available.
 */
export function estimateRequestedComputeUnitsForParsedTransaction(
    parsedTransaction: {
        message: {
            instructions: Array<ParsedInstruction | PartiallyDecodedInstruction>;
        };
    },
    epoch: bigint | undefined,
    cluster: Cluster,
): number {
    let totalReservedUnits = 0;
    for (const instruction of parsedTransaction.message.instructions) {
        // For partially decoded instructions, we need the raw data
        if ('data' in instruction && typeof instruction.data === 'string') {
            const requestedUnits = extractComputeUnitsFromInstruction({
                data: new Uint8Array(BASE58_ENCODER.encode(instruction.data)),
                programAddress: address(instruction.programId.toBase58()),
            });

            if (requestedUnits !== null) {
                totalReservedUnits = requestedUnits;
                break;
            }
        }
        const reservedUnits = getReservedComputeUnits({
            cluster,
            epoch,
            programId: instruction.programId.toBase58(),
        });
        totalReservedUnits += reservedUnits;
    }

    return Math.min(totalReservedUnits, MAX_COMPUTE_UNITS);
}
