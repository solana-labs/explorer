// TODO(ngundotra): replace with web3.js when patched
// Temporary fix, copied from: https://github.com/solana-developers/solana-rpc-get-stake-activation/blob/main/web3js-1.0/src/rpc.ts
import { AccountInfo, Connection, ParsedAccountData, PublicKey, RpcResponseAndContext } from '@solana/web3.js';

interface StakeActivation {
    status: string;
    active: bigint;
    inactive: bigint;
}

type StakeHistoryEntry = {
    epoch: bigint;
    effective: bigint;
    activating: bigint;
    deactivating: bigint;
};

type Delegation = {
    voterPubkey: Uint8Array;
    stake: bigint;
    activationEpoch: bigint;
    deactivationEpoch: bigint;
};

type StakeAccount = {
    discriminant: bigint;
    meta: {
        rentExemptReserve: bigint;
        authorized: {
            staker: Uint8Array;
            withdrawer: Uint8Array;
        };
        lockup: {
            unixTimestamp: bigint;
            epoch: bigint;
            custodian: Uint8Array;
        };
    };
    stake: {
        delegation: Delegation;
        creditsObserved: bigint;
    };
};

interface StakeActivatingAndDeactivating {
    effective: bigint;
    activating: bigint;
    deactivating: bigint;
}

interface EffectiveAndActivating {
    effective: bigint;
    activating: bigint;
}

const WARMUP_COOLDOWN_RATE = 0.09;

function getStakeHistoryEntry(epoch: bigint, stakeHistory: StakeHistoryEntry[]): StakeHistoryEntry | null {
    for (const entry of stakeHistory) {
        if (entry.epoch === epoch) {
            return entry;
        }
    }
    return null;
}

function getStakeAndActivating(
    delegation: Delegation,
    targetEpoch: bigint,
    stakeHistory: StakeHistoryEntry[]
): EffectiveAndActivating {
    if (delegation.activationEpoch === delegation.deactivationEpoch) {
        // activated but instantly deactivated; no stake at all regardless of target_epoch
        return {
            activating: BigInt(0),
            effective: BigInt(0),
        };
    } else if (targetEpoch === delegation.activationEpoch) {
        // all is activating
        return {
            activating: delegation.stake,
            effective: BigInt(0),
        };
    } else if (targetEpoch < delegation.activationEpoch) {
        // not yet enabled
        return {
            activating: BigInt(0),
            effective: BigInt(0),
        };
    }

    let currentEpoch = delegation.activationEpoch;
    let entry = getStakeHistoryEntry(currentEpoch, stakeHistory);
    if (entry !== null) {
        // target_epoch > self.activation_epoch

        // loop from my activation epoch until the target epoch summing up my entitlement
        // current effective stake is updated using its previous epoch's cluster stake
        let currentEffectiveStake = BigInt(0);
        while (entry !== null) {
            currentEpoch++;
            const remaining = delegation.stake - currentEffectiveStake;
            const weight = Number(remaining) / Number(entry.activating);
            const newlyEffectiveClusterStake = Number(entry.effective) * WARMUP_COOLDOWN_RATE;
            const newlyEffectiveStake = BigInt(Math.max(1, Math.round(weight * newlyEffectiveClusterStake)));

            currentEffectiveStake += newlyEffectiveStake;
            if (currentEffectiveStake >= delegation.stake) {
                currentEffectiveStake = delegation.stake;
                break;
            }

            if (currentEpoch >= targetEpoch || currentEpoch >= delegation.deactivationEpoch) {
                break;
            }
            entry = getStakeHistoryEntry(currentEpoch, stakeHistory);
        }
        return {
            activating: delegation.stake - currentEffectiveStake,
            effective: currentEffectiveStake,
        };
    } else {
        // no history or I've dropped out of history, so assume fully effective
        return {
            activating: BigInt(0),
            effective: delegation.stake,
        };
    }
}

function getStakeActivatingAndDeactivating(
    delegation: Delegation,
    targetEpoch: bigint,
    stakeHistory: StakeHistoryEntry[]
): StakeActivatingAndDeactivating {
    const { effective, activating } = getStakeAndActivating(delegation, targetEpoch, stakeHistory);

    // then de-activate some portion if necessary
    if (targetEpoch < delegation.deactivationEpoch) {
        return {
            activating,
            deactivating: BigInt(0),
            effective,
        };
    } else if (targetEpoch == delegation.deactivationEpoch) {
        // can only deactivate what's activated
        return {
            activating: BigInt(0),
            deactivating: effective,
            effective,
        };
    }
    let currentEpoch = delegation.deactivationEpoch;
    let entry = getStakeHistoryEntry(currentEpoch, stakeHistory);
    if (entry !== null) {
        // target_epoch > self.activation_epoch
        // loop from my deactivation epoch until the target epoch
        // current effective stake is updated using its previous epoch's cluster stake
        let currentEffectiveStake = effective;
        while (entry !== null) {
            currentEpoch++;
            // if there is no deactivating stake at prev epoch, we should have been
            // fully undelegated at this moment
            if (entry.deactivating === BigInt(0)) {
                break;
            }

            // I'm trying to get to zero, how much of the deactivation in stake
            //   this account is entitled to take
            const weight = Number(currentEffectiveStake) / Number(entry.deactivating);

            // portion of newly not-effective cluster stake I'm entitled to at current epoch
            const newlyNotEffectiveClusterStake = Number(entry.effective) * WARMUP_COOLDOWN_RATE;
            const newlyNotEffectiveStake = BigInt(Math.max(1, Math.round(weight * newlyNotEffectiveClusterStake)));

            currentEffectiveStake -= newlyNotEffectiveStake;
            if (currentEffectiveStake <= 0) {
                currentEffectiveStake = BigInt(0);
                break;
            }

            if (currentEpoch >= targetEpoch) {
                break;
            }
            entry = getStakeHistoryEntry(currentEpoch, stakeHistory);
        }

        // deactivating stake should equal to all of currently remaining effective stake
        return {
            activating: BigInt(0),
            deactivating: currentEffectiveStake,
            effective: currentEffectiveStake,
        };
    } else {
        return {
            activating: BigInt(0),
            deactivating: BigInt(0),
            effective: BigInt(0),
        };
    }
}

export async function getStakeActivation(connection: Connection, stakeAddress: PublicKey): Promise<StakeActivation> {
    const SYSVAR_STAKE_HISTORY_ADDRESS = new PublicKey('SysvarStakeHistory1111111111111111111111111');
    const [epochInfo, { stakeAccountParsed, stakeAccount }, stakeHistory] = await Promise.all([
        connection.getEpochInfo(),
        (async () => {
            const stakeAccountParsed = await connection.getParsedAccountInfo(stakeAddress);
            if (stakeAccountParsed === null || stakeAccountParsed.value === null) {
                throw new Error('Account not found');
            }
            return { stakeAccount: getStakeAccount(stakeAccountParsed), stakeAccountParsed };
        })(),
        (async () => {
            const stakeHistoryParsed = await connection.getParsedAccountInfo(SYSVAR_STAKE_HISTORY_ADDRESS);
            if (stakeHistoryParsed === null) {
                throw new Error('StakeHistory not found');
            }
            return getStakeHistory(stakeHistoryParsed);
        })(),
    ]);

    const { effective, activating, deactivating } = getStakeActivatingAndDeactivating(
        { ...stakeAccount.stake.delegation, voterPubkey: stakeAccount.stake.delegation.voterPubkey },
        BigInt(epochInfo.epoch),
        stakeHistory
    );

    let status;
    if (deactivating > 0) {
        status = 'deactivating';
    } else if (activating > 0) {
        status = 'activating';
    } else if (effective > 0) {
        status = 'active';
    } else {
        status = 'inactive';
    }
    const inactive = BigInt(stakeAccountParsed.value!.lamports) - effective - stakeAccount.meta.rentExemptReserve;

    return {
        active: effective,
        inactive,
        status,
    };
}

const getStakeAccount = function (
    parsedData: RpcResponseAndContext<AccountInfo<ParsedAccountData | Buffer> | null>
): StakeAccount {
    let discriminant = BigInt(0);
    if (parsedData.value === null || parsedData.value.data instanceof Buffer) {
        throw new Error('Account not found');
    }

    if (parsedData.value.data.parsed.type === 'delegated') {
        discriminant = BigInt(1);
    }

    return {
        discriminant: discriminant,
        meta: {
            authorized: {
                staker: parsedData.value.data.parsed.info.meta.authorized.staker,
                withdrawer: parsedData.value.data.parsed.info.meta.authorized.withdrawer,
            },
            lockup: {
                custodian: parsedData.value.data.parsed.info.meta.lockup.custodian,
                epoch: BigInt(parsedData.value.data.parsed.info.meta.lockup.epoch),
                unixTimestamp: BigInt(parsedData.value.data.parsed.info.meta.lockup.unixTimestamp),
            },
            rentExemptReserve: BigInt(parsedData.value.data.parsed.info.meta.rentExemptReserve),
        },
        stake: {
            creditsObserved: BigInt(parsedData.value.data.parsed.info.stake.creditsObserved),
            delegation: {
                activationEpoch: BigInt(parsedData.value.data.parsed.info.stake.delegation.activationEpoch),
                deactivationEpoch: BigInt(parsedData.value.data.parsed.info.stake.delegation.deactivationEpoch),
                stake: BigInt(parsedData.value.data.parsed.info.stake.delegation.stake),
                voterPubkey: parsedData.value.data.parsed.info.stake.delegation.voterPubkey,
            },
        },
    };
};

const getStakeHistory = function (
    parsedData: RpcResponseAndContext<AccountInfo<ParsedAccountData | Buffer> | null>
): StakeHistoryEntry[] {
    if (parsedData.value === null || parsedData.value.data instanceof Buffer) {
        throw new Error('Account not found');
    }

    const stakeHistory: StakeHistoryEntry[] = [];

    parsedData.value.data.parsed.info.forEach((entry: any) => {
        stakeHistory.push({
            activating: BigInt(entry.stakeHistory.activating),
            deactivating: BigInt(entry.stakeHistory.deactivating),
            effective: BigInt(entry.stakeHistory.effective),
            epoch: BigInt(entry.epoch),
        });
    });

    return stakeHistory;
};
