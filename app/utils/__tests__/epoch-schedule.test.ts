import { Cluster } from '../cluster';
import {
    EpochSchedule,
    getEpochForSlot,
    getFirstSlotInEpoch,
    getLastSlotInEpoch,
    getMaxComputeUnitsInBlock,
} from '../epoch-schedule';

describe('getEpoch', () => {
    it('should return the correct epoch for a slot after `firstNormalSlot`', () => {
        const schedule: EpochSchedule = {
            firstNormalEpoch: 0n,
            firstNormalSlot: 0n,
            slotsPerEpoch: 432_000n,
        };

        expect(getEpochForSlot(schedule, 1n)).toEqual(0n);
        expect(getEpochForSlot(schedule, 431_999n)).toEqual(0n);
        expect(getEpochForSlot(schedule, 432_000n)).toEqual(1n);
        expect(getEpochForSlot(schedule, 500_000n)).toEqual(1n);
        expect(getEpochForSlot(schedule, 228_605_332n)).toEqual(529n);
    });

    it('should return the correct epoch for a slot before `firstNormalSlot`', () => {
        const schedule: EpochSchedule = {
            firstNormalEpoch: 100n,
            firstNormalSlot: 3_200n,
            slotsPerEpoch: 432_000n,
        };

        expect(getEpochForSlot(schedule, 1n)).toEqual(0n);
        expect(getEpochForSlot(schedule, 31n)).toEqual(0n);
        expect(getEpochForSlot(schedule, 32n)).toEqual(1n);
    });
});

describe('getFirstSlotInEpoch', () => {
    it('should return the first slot for an epoch after `firstNormalEpoch`', () => {
        const schedule: EpochSchedule = {
            firstNormalEpoch: 0n,
            firstNormalSlot: 0n,
            slotsPerEpoch: 100n,
        };

        expect(getFirstSlotInEpoch(schedule, 1n)).toEqual(100n);
        expect(getFirstSlotInEpoch(schedule, 2n)).toEqual(200n);
        expect(getFirstSlotInEpoch(schedule, 10n)).toEqual(1000n);
    });

    it('should return the first slot for an epoch before `firstNormalEpoch`', () => {
        const schedule: EpochSchedule = {
            firstNormalEpoch: 100n,
            firstNormalSlot: 100_000n,
            slotsPerEpoch: 100n,
        };

        expect(getFirstSlotInEpoch(schedule, 0n)).toEqual(0n);
        expect(getFirstSlotInEpoch(schedule, 1n)).toEqual(32n);
        expect(getFirstSlotInEpoch(schedule, 2n)).toEqual(96n);
        expect(getFirstSlotInEpoch(schedule, 10n)).toEqual(32_736n);
    });
});

describe('getLastSlotInEpoch', () => {
    it('should return the last slot for an epoch after `firstNormalEpoch`', () => {
        const schedule: EpochSchedule = {
            firstNormalEpoch: 0n,
            firstNormalSlot: 0n,
            slotsPerEpoch: 100n,
        };

        expect(getLastSlotInEpoch(schedule, 1n)).toEqual(199n);
        expect(getLastSlotInEpoch(schedule, 2n)).toEqual(299n);
        expect(getLastSlotInEpoch(schedule, 10n)).toEqual(1099n);
    });

    it('should return the first slot for an epoch before `firstNormalEpoch`', () => {
        const schedule: EpochSchedule = {
            firstNormalEpoch: 100n,
            firstNormalSlot: 100_000n,
            slotsPerEpoch: 100n,
        };

        expect(getLastSlotInEpoch(schedule, 0n)).toEqual(31n);
        expect(getLastSlotInEpoch(schedule, 1n)).toEqual(95n);
        expect(getLastSlotInEpoch(schedule, 2n)).toEqual(223n);
        expect(getLastSlotInEpoch(schedule, 10n)).toEqual(65_503n);
    });
});

describe('getMaxComputeUnitsForEpoch', () => {
    it('should return the correct max compute units for an epoch on mainnet', () => {
        expect(getMaxComputeUnitsInBlock({ cluster: Cluster.MainnetBeta, epoch: 0n })).toEqual(48_000_000);
        expect(getMaxComputeUnitsInBlock({ cluster: Cluster.MainnetBeta, epoch: 769n })).toEqual(48_000_000);
        expect(getMaxComputeUnitsInBlock({ cluster: Cluster.MainnetBeta, epoch: 770n })).toEqual(50_000_000);
        expect(getMaxComputeUnitsInBlock({ cluster: Cluster.MainnetBeta, epoch: 821n })).toEqual(50_000_000);
        expect(getMaxComputeUnitsInBlock({ cluster: Cluster.MainnetBeta, epoch: 822n })).toEqual(60_000_000);
        expect(getMaxComputeUnitsInBlock({ cluster: Cluster.MainnetBeta, epoch: 823n })).toEqual(60_000_000);
        expect(getMaxComputeUnitsInBlock({ cluster: Cluster.MainnetBeta, epoch: 1008n })).toEqual(60_000_000);
        expect(getMaxComputeUnitsInBlock({ cluster: Cluster.MainnetBeta, epoch: 1009n })).toEqual(100_000_000);
        expect(getMaxComputeUnitsInBlock({ cluster: Cluster.MainnetBeta, epoch: 1010n })).toEqual(100_000_000);
        expect(getMaxComputeUnitsInBlock({ cluster: Cluster.MainnetBeta, epoch: undefined })).toEqual(48_000_000);
        expect(getMaxComputeUnitsInBlock({ cluster: Cluster.MainnetBeta, epoch: -1n })).toEqual(48_000_000);
    });

    it('should return the correct max compute units for an epoch on devnet', () => {
        expect(getMaxComputeUnitsInBlock({ cluster: Cluster.Devnet, epoch: 0n })).toEqual(48_000_000);
        expect(getMaxComputeUnitsInBlock({ cluster: Cluster.Devnet, epoch: 856n })).toEqual(48_000_000);
        expect(getMaxComputeUnitsInBlock({ cluster: Cluster.Devnet, epoch: 857n })).toEqual(50_000_000);
        expect(getMaxComputeUnitsInBlock({ cluster: Cluster.Devnet, epoch: 914n })).toEqual(50_000_000);
        expect(getMaxComputeUnitsInBlock({ cluster: Cluster.Devnet, epoch: 915n })).toEqual(60_000_000);
        expect(getMaxComputeUnitsInBlock({ cluster: Cluster.Devnet, epoch: 916n })).toEqual(60_000_000);
        expect(getMaxComputeUnitsInBlock({ cluster: Cluster.Devnet, epoch: 1099n })).toEqual(60_000_000);
        expect(getMaxComputeUnitsInBlock({ cluster: Cluster.Devnet, epoch: 1100n })).toEqual(100_000_000);
        expect(getMaxComputeUnitsInBlock({ cluster: Cluster.Devnet, epoch: 1101n })).toEqual(100_000_000);
        expect(getMaxComputeUnitsInBlock({ cluster: Cluster.Devnet, epoch: undefined })).toEqual(48_000_000);
        expect(getMaxComputeUnitsInBlock({ cluster: Cluster.Devnet, epoch: -1n })).toEqual(48_000_000);
    });

    it('should return the correct max compute units for an epoch on testnet', () => {
        expect(getMaxComputeUnitsInBlock({ cluster: Cluster.Testnet, epoch: 0n })).toEqual(48_000_000);
        expect(getMaxComputeUnitsInBlock({ cluster: Cluster.Testnet, epoch: 763n })).toEqual(48_000_000);
        expect(getMaxComputeUnitsInBlock({ cluster: Cluster.Testnet, epoch: 764n })).toEqual(50_000_000);
        expect(getMaxComputeUnitsInBlock({ cluster: Cluster.Testnet, epoch: 811n })).toEqual(50_000_000);
        expect(getMaxComputeUnitsInBlock({ cluster: Cluster.Testnet, epoch: 812n })).toEqual(60_000_000);
        expect(getMaxComputeUnitsInBlock({ cluster: Cluster.Testnet, epoch: 813n })).toEqual(60_000_000);
        expect(getMaxComputeUnitsInBlock({ cluster: Cluster.Testnet, epoch: 982n })).toEqual(60_000_000);
        expect(getMaxComputeUnitsInBlock({ cluster: Cluster.Testnet, epoch: 983n })).toEqual(100_000_000);
        expect(getMaxComputeUnitsInBlock({ cluster: Cluster.Testnet, epoch: 984n })).toEqual(100_000_000);
        expect(getMaxComputeUnitsInBlock({ cluster: Cluster.Testnet, epoch: undefined })).toEqual(48_000_000);
        expect(getMaxComputeUnitsInBlock({ cluster: Cluster.Testnet, epoch: -1n })).toEqual(48_000_000);
    });

    it('should return the correct max compute units for an epoch on custom', () => {
        expect(getMaxComputeUnitsInBlock({ cluster: Cluster.Custom, epoch: 0n })).toEqual(100_000_000);
        expect(getMaxComputeUnitsInBlock({ cluster: Cluster.Custom, epoch: 769n })).toEqual(100_000_000);
        expect(getMaxComputeUnitsInBlock({ cluster: Cluster.Custom, epoch: 770n })).toEqual(100_000_000);
        expect(getMaxComputeUnitsInBlock({ cluster: Cluster.Custom, epoch: 821n })).toEqual(100_000_000);
        expect(getMaxComputeUnitsInBlock({ cluster: Cluster.Custom, epoch: 822n })).toEqual(100_000_000);
        expect(getMaxComputeUnitsInBlock({ cluster: Cluster.Custom, epoch: 823n })).toEqual(100_000_000);
        expect(getMaxComputeUnitsInBlock({ cluster: Cluster.Custom, epoch: undefined })).toEqual(100_000_000);
        expect(getMaxComputeUnitsInBlock({ cluster: Cluster.Custom, epoch: -1n })).toEqual(100_000_000);
    });
});
