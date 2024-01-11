import {
    ParsedInstruction,
    ParsedTransaction,
    PartiallyDecodedInstruction,
    Transaction,
    TransactionInstruction,
} from '@solana/web3.js';
import { Cluster } from '@utils/cluster';
import { SerumMarketRegistry } from '@utils/serumMarketRegistry';
import bs58 from 'bs58';

import { LOADER_IDS, PROGRAM_INFO_BY_ID, SPECIAL_IDS, SYSVAR_IDS } from './programs';

export type TokenLabelInfo = {
    name?: string;
    symbol?: string;
};

export function getProgramName(address: string, cluster: Cluster): string {
    const label = programLabel(address, cluster);
    if (label) return label;
    return `Unknown Program (${address})`;
}

function programLabel(address: string, cluster: Cluster): string | undefined {
    const programInfo = PROGRAM_INFO_BY_ID[address];
    if (programInfo && programInfo.deployments.includes(cluster)) {
        return programInfo.name;
    }

    return LOADER_IDS[address] as string;
}

function tokenLabel_(tokenInfo?: TokenLabelInfo): string | undefined {
    if (!tokenInfo || !tokenInfo.name || !tokenInfo.symbol) return;
    if (tokenInfo.name === tokenInfo.symbol) {
        return tokenInfo.name;
    }
    return `${tokenInfo.symbol} - ${tokenInfo.name}`;
}

export function addressLabel(address: string, cluster: Cluster, tokenInfo?: TokenLabelInfo): string | undefined {
    return (
        programLabel(address, cluster) ||
        SYSVAR_IDS[address] ||
        SPECIAL_IDS[address] ||
        tokenLabel_(tokenInfo) ||
        SerumMarketRegistry.get(address, cluster)
    );
}

export function displayAddress(address: string, cluster: Cluster, tokenInfo?: TokenLabelInfo): string {
    return addressLabel(address, cluster, tokenInfo) || address;
}

export function intoTransactionInstruction(
    tx: ParsedTransaction,
    instruction: ParsedInstruction | PartiallyDecodedInstruction
): TransactionInstruction | undefined {
    const message = tx.message;
    if ('parsed' in instruction) return;

    const keys = [];
    for (const account of instruction.accounts) {
        const accountKey = message.accountKeys.find(({ pubkey }) => pubkey.equals(account));
        if (!accountKey) return;
        keys.push({
            isSigner: accountKey.signer,
            isWritable: accountKey.writable,
            pubkey: accountKey.pubkey,
        });
    }

    return new TransactionInstruction({
        data: bs58.decode(instruction.data),
        keys: keys,
        programId: instruction.programId,
    });
}

export function intoParsedTransaction(tx: Transaction): ParsedTransaction {
    const message = tx.compileMessage();
    return {
        message: {
            accountKeys: message.accountKeys.map((key, index) => ({
                pubkey: key,
                signer: tx.signatures.some(({ publicKey }) => publicKey.equals(key)),
                writable: message.isAccountWritable(index),
            })),
            instructions: message.instructions.map(ix => ({
                accounts: ix.accounts.map(index => message.accountKeys[index]),
                data: ix.data,
                programId: message.accountKeys[ix.programIdIndex],
            })),
            recentBlockhash: message.recentBlockhash,
        },
        signatures: tx.signatures.map(value => bs58.encode(value.signature as any)),
    };
}
