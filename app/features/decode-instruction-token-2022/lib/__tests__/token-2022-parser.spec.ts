import { address, type ReadonlyUint8Array } from '@solana/kit';
import { PublicKey, type TransactionInstruction } from '@solana/web3.js';
import {
    getEmitTokenMetadataInstructionDataEncoder,
    getInitializeTokenGroupInstructionDataEncoder,
    getInitializeTokenMetadataInstructionDataEncoder,
    getRemoveTokenMetadataKeyInstructionDataEncoder,
    getTransferCheckedInstructionDataEncoder,
    getUpdateTokenGroupMaxSizeInstructionDataEncoder,
    getUpdateTokenGroupUpdateAuthorityInstructionDataEncoder,
    getUpdateTokenMetadataFieldInstructionDataDecoder,
    getUpdateTokenMetadataFieldInstructionDataEncoder,
    getUpdateTokenMetadataUpdateAuthorityInstructionDataEncoder,
    TOKEN_2022_PROGRAM_ADDRESS,
} from '@solana-program/token-2022';
import { describe, expect, test } from 'vitest';

import { toKitInstruction } from '@/app/shared/lib/web3js-compat';

import { parseToken2022Instruction } from '../token-2022-parser';

const METADATA = 'So11111111111111111111111111111111111111112';
const AUTHORITY = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
const MINT = 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL';
const MINT_AUTHORITY = 'Stake11111111111111111111111111111111111111';

const TOKEN_2022 = new PublicKey(TOKEN_2022_PROGRAM_ADDRESS);

function parse(data: ReadonlyUint8Array, accounts: string[]) {
    const keys = accounts.map(pubkey => ({ isSigner: false, isWritable: false, pubkey: new PublicKey(pubkey) }));
    const raw = { data: Buffer.from(new Uint8Array(data)), keys, programId: TOKEN_2022 };
    return parseToken2022Instruction(toKitInstruction(raw as unknown as TransactionInstruction));
}

describe('parseToken2022Instruction — SPL interface instructions', () => {
    test('should decode UpdateTokenMetadataField with a well-known field', () => {
        const data = getUpdateTokenMetadataFieldInstructionDataEncoder().encode({
            field: { __kind: 'Name' },
            value: 'My Token',
        });
        const parsed = parse(data, [METADATA, AUTHORITY]);
        expect(parsed?.type).toBe('updateTokenMetadataField');
        const info = parsed?.info as { field: string; metadata: PublicKey; updateAuthority: PublicKey; value: string };
        expect(info.field).toBe('name');
        expect(info.value).toBe('My Token');
        expect(info.metadata.toBase58()).toBe(METADATA);
        expect(info.updateAuthority.toBase58()).toBe(AUTHORITY);
    });

    test('should decode UpdateTokenMetadataField with a custom key field', () => {
        const data = getUpdateTokenMetadataFieldInstructionDataEncoder().encode({
            field: { __kind: 'Key', fields: ['website'] },
            value: 'https://example.com',
        });
        const info = parse(data, [METADATA, AUTHORITY])?.info as { field: string; value: string };
        expect(info.field).toBe('website');
        expect(info.value).toBe('https://example.com');
    });

    test('should decode InitializeTokenMetadata', () => {
        const data = getInitializeTokenMetadataInstructionDataEncoder().encode({
            name: 'Token',
            symbol: 'TKN',
            uri: 'https://example.com/token.json',
        });
        const parsed = parse(data, [METADATA, AUTHORITY, MINT, MINT_AUTHORITY]);
        expect(parsed?.type).toBe('initializeTokenMetadata');
        const info = parsed?.info as { name: string; symbol: string; uri: string };
        expect(info).toMatchObject({ name: 'Token', symbol: 'TKN', uri: 'https://example.com/token.json' });
    });

    test('should decode RemoveTokenMetadataKey', () => {
        const data = getRemoveTokenMetadataKeyInstructionDataEncoder().encode({ idempotent: true, key: 'website' });
        const info = parse(data, [METADATA, AUTHORITY])?.info as { idempotent: boolean; key: string };
        expect(info.idempotent).toBe(true);
        expect(info.key).toBe('website');
    });

    test('should decode InitializeTokenGroup, unwrapping a present update authority', () => {
        const data = getInitializeTokenGroupInstructionDataEncoder().encode({
            maxSize: 100n,
            updateAuthority: address(AUTHORITY),
        });
        const info = parse(data, [METADATA, MINT, MINT_AUTHORITY])?.info as {
            maxSize: bigint;
            updateAuthority?: PublicKey;
        };
        expect(info.maxSize).toBe(100n);
        expect(info.updateAuthority?.toBase58()).toBe(AUTHORITY);
    });

    test('should decode UpdateTokenGroupMaxSize', () => {
        const data = getUpdateTokenGroupMaxSizeInstructionDataEncoder().encode({ maxSize: 7n });
        const info = parse(data, [METADATA, AUTHORITY])?.info as { maxSize: bigint };
        expect(info.maxSize).toBe(7n);
    });

    test('should render a removed (None) update authority as undefined', () => {
        const data = getUpdateTokenGroupUpdateAuthorityInstructionDataEncoder().encode({ newUpdateAuthority: null });
        const info = parse(data, [METADATA, AUTHORITY])?.info as { newUpdateAuthority?: PublicKey };
        expect(info.newUpdateAuthority).toBeUndefined();
    });

    test('should decode UpdateTokenMetadataUpdateAuthority with a new authority', () => {
        const data = getUpdateTokenMetadataUpdateAuthorityInstructionDataEncoder().encode({
            newUpdateAuthority: address(MINT),
        });
        const parsed = parse(data, [METADATA, AUTHORITY]);
        expect(parsed?.type).toBe('updateTokenMetadataUpdateAuthority');
        const info = parsed?.info as {
            metadata: PublicKey;
            newUpdateAuthority?: PublicKey;
            updateAuthority: PublicKey;
        };
        expect(info.metadata.toBase58()).toBe(METADATA);
        expect(info.updateAuthority.toBase58()).toBe(AUTHORITY);
        expect(info.newUpdateAuthority?.toBase58()).toBe(MINT);
    });

    test('should render a removed (None) metadata update authority as undefined', () => {
        const data = getUpdateTokenMetadataUpdateAuthorityInstructionDataEncoder().encode({ newUpdateAuthority: null });
        const info = parse(data, [METADATA, AUTHORITY])?.info as { newUpdateAuthority?: PublicKey };
        expect(info.newUpdateAuthority).toBeUndefined();
    });

    test('should decode EmitTokenMetadata with a byte range', () => {
        const data = getEmitTokenMetadataInstructionDataEncoder().encode({ end: 32n, start: 4n });
        const parsed = parse(data, [METADATA]);
        expect(parsed?.type).toBe('emitTokenMetadata');
        const info = parsed?.info as { end?: number; metadata: PublicKey; start?: number };
        expect(info.start).toBe(4);
        expect(info.end).toBe(32);
        expect(info.metadata.toBase58()).toBe(METADATA);
    });

    test('should decode EmitTokenMetadata with no byte range', () => {
        const data = getEmitTokenMetadataInstructionDataEncoder().encode({ end: null, start: null });
        const info = parse(data, [METADATA])?.info as { end?: number; start?: number };
        expect(info.start).toBeUndefined();
        expect(info.end).toBeUndefined();
    });

    test('should return undefined for an unrecognised instruction', () => {
        expect(parse(new Uint8Array([255, 255, 255, 255]), [METADATA])).toBeUndefined();
    });

    // Regression guard: if this ever stops throwing, upstream has fixed the
    // Codama discriminator bug and this slice's local parsers can be dropped.
    test('should still fail to decode with the upstream data decoder', () => {
        const data = getUpdateTokenMetadataFieldInstructionDataEncoder().encode({
            field: { __kind: 'Name' },
            value: 'X',
        });
        expect(() => getUpdateTokenMetadataFieldInstructionDataDecoder().decode(data)).toThrow();
    });

    test('should build uiAmountString as an exact decimal for transferChecked', () => {
        // 1 base unit of a 9-decimal mint. The buggy float path produced "1e-9"
        // (and lost precision for amounts above 2^53); uiAmountString must be the
        // exact plain decimal, matching Solana RPC jsonParsed output.
        const data = getTransferCheckedInstructionDataEncoder().encode({ amount: 1n, decimals: 9 });
        const parsed = parse(data, [MINT_AUTHORITY, MINT, METADATA, AUTHORITY]);
        expect(parsed?.type).toBe('transferChecked');
        const info = parsed?.info as { tokenAmount: { uiAmountString: string } };
        expect(info.tokenAmount.uiAmountString).toBe('0.000000001');
    });
});
