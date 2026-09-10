import { createSolanaRpc } from '@solana/kit';

import type { EpochInfo } from '../lib/types';

export async function fetchEpochInfo(url: string): Promise<EpochInfo> {
    return createSolanaRpc(url).getEpochInfo().send();
}
