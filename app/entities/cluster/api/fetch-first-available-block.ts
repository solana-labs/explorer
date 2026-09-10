import { createSolanaRpc } from '@solana/kit';

export async function fetchFirstAvailableBlock(url: string): Promise<bigint> {
    return createSolanaRpc(url).getFirstAvailableBlock().send();
}
