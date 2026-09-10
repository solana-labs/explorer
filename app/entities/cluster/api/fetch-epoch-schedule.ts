import { createSolanaRpc } from '@solana/kit';
import type { EpochSchedule } from '@utils/epoch-schedule';

// Fixed at genesis, so a page that only maps a slot to an epoch pays one request and nothing more.
export async function fetchEpochSchedule(url: string): Promise<EpochSchedule> {
    return createSolanaRpc(url).getEpochSchedule().send();
}
