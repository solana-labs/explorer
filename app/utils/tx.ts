import { AnchorProvider, BorshEventCoder, BorshInstructionCoder, Idl, Instruction, Program } from '@coral-xyz/anchor';
import { IdlField, IdlInstruction } from '@coral-xyz/anchor/dist/cjs/idl';
import { IdlEvent, IdlTypeDefTyStruct } from '@coral-xyz/anchor/dist/cjs/idl';
import NodeWallet from '@coral-xyz/anchor/dist/cjs/nodewallet';
import { Connection } from '@solana/web3.js';
import {
    AccountMeta,
    AddressLookupTableAccount,
    Keypair,
    MessageCompiledInstruction,
    ParsedInstruction,
    ParsedTransaction,
    PartiallyDecodedInstruction,
    PublicKey,
    SystemProgram,
    Transaction,
    TransactionInstruction,
    VersionedMessage,
} from '@solana/web3.js';
import { AccountInfo } from '@solana/web3.js';
import { Cluster, CLUSTERS, clusterSlug } from '@utils/cluster';
import { SerumMarketRegistry } from '@utils/serumMarketRegistry';
import bs58 from 'bs58';
import * as nacl from 'tweetnacl';

import { Account, AccountWithContext, AddressContext, AddressTableLookup, AddressWithContext, AnchorArgument, AnchorProgramInstruction, DefaultInstruction, Signature, TransactionInspectorResponse } from '../api/tx/inspector/route';
import { snakeToTitleCase } from '.';
import { formatIdl } from './convertLegacyIdl';
import { LOADER_IDS, PROGRAM_INFO_BY_ID, SPECIAL_IDS, SYSVAR_IDS } from './programs';

export const ANCHOR_SELF_CPI_TAG = Buffer.from('1d9acb512ea545e4', 'hex').reverse();
export const ANCHOR_SELF_CPI_NAME = 'Anchor Self Invocation';

export const DEFAULT_FEES = {
    lamportsPerSignature: 5000,
};

export type TransactionData = {
    rawMessage: Uint8Array;
    message: VersionedMessage;
    signatures?: (string | null)[];
};

export const MIN_MESSAGE_LENGTH =
    3 + // header
    1 + // accounts length
    32 + // accounts, must have at least one address for fees
    32 + // recent blockhash
    1; // instructions length

export type TokenLabelInfo = {
    name?: string;
    symbol?: string;
};

type AnchorInstructionDetails = {
    ixDef: IdlInstruction;
    ixAccounts: { name: string; }[];
    decodedIxData: Instruction;
}

export function getAnchorAccountsFromInstruction(
    decodedIx: { name: string } | null,
    program: Program
):
    | {
        name: string;
        isMut: boolean;
        isSigner: boolean;
        pda?: object;
    }[]
    | null {
    if (decodedIx) {
        // get ix accounts
        const idlInstructions = program.idl.instructions.filter(ix => ix.name === decodedIx.name);
        if (idlInstructions.length === 0) {
            return null;
        }
        return idlInstructions[0].accounts as {
            // type coercing since anchor doesn't export the underlying type
            name: string;
            isMut: boolean;
            isSigner: boolean;
            pda?: object;
        }[];
    }
    return null;
}

export function getAnchorProgramName(program: Program | null): string | undefined {
    return program && 'name' in program.idl.metadata ? snakeToTitleCase(program.idl.metadata.name) : undefined;
}

export function instructionIsSelfCPI(ixData: Buffer): boolean {
    return ixData.slice(0, 8).equals(ANCHOR_SELF_CPI_TAG);
}

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

export async function getTxInfo(data: TransactionData, clusterUrl: string): Promise<TransactionInspectorResponse> {
    const size = 1 + 64 * data.message.header.numRequiredSignatures + data.rawMessage.length;
    const fees = data.message.header.numRequiredSignatures * DEFAULT_FEES.lamportsPerSignature;

    return {
        accounts: await getAccounts(data, clusterUrl),
        addressTableLookups: await getAddressTableLookups(data, clusterUrl),
        feePayer: await getFeePayer(data, clusterUrl),
        fees: fees,
        instructions: await getInstructions(data, clusterUrl),
        serializedSize: size,
        signatures: getSignatures(data)
    }
}

async function getInstructions(data: TransactionData, clusterUrl: string): Promise<(AnchorProgramInstruction | DefaultInstruction)[]> {
    const lookupsForAccountKeyIndex = getLookupsForAccountKeyIndex(data);

    return await Promise.all(data.message.compiledInstructions.map(async ix => {
        const accountMetas = getAccountMetas(data, ix, lookupsForAccountKeyIndex);

        const programId = data.message.staticAccountKeys[ix.programIdIndex];
        const idl = await Program.fetchIdl<Idl>(programId, getProvider(clusterUrl));

        return idl ? getAnchorProgramInstruction(ix, accountMetas, idl, clusterUrl, programId) : getDefaultInstruction(ix, programId, clusterUrl);
    }));
}

function getAccountMetas(
    data: TransactionData,
    ix: MessageCompiledInstruction,
    lookupsForAccountKeyIndex: { lookupTableIndex: number, lookupTableKey: PublicKey }[]
): AccountMeta[] {
    return ix.accountKeyIndexes.map((accountIndex, _index) => {
        let lookup: PublicKey;
        if (accountIndex >= data.message.staticAccountKeys.length) {
            const lookupIndex = accountIndex - data.message.staticAccountKeys.length;
            lookup = lookupsForAccountKeyIndex[lookupIndex].lookupTableKey;
        } else {
            lookup = data.message.staticAccountKeys[accountIndex];
        }

        const isSigner = accountIndex < data.message.header.numRequiredSignatures;
        const isWritable = data.message.isAccountWritable(accountIndex);
        const accountMeta: AccountMeta = {
            isSigner,
            isWritable,
            pubkey: lookup,
        };
        return accountMeta;
    });
}

function getLookupsForAccountKeyIndex(data: TransactionData): { lookupTableIndex: number, lookupTableKey: PublicKey }[] {
    return [
        ...data.message.addressTableLookups.flatMap(lookup =>
            lookup.writableIndexes.map(index => ({
                lookupTableIndex: index,
                lookupTableKey: lookup.accountKey,
            }))
        ),
        ...data.message.addressTableLookups.flatMap(lookup =>
            lookup.readonlyIndexes.map(index => ({
                lookupTableIndex: index,
                lookupTableKey: lookup.accountKey,
            }))
        ),
    ];
}

function getAnchorProgramInstruction(ix: MessageCompiledInstruction, accountMetas: AccountMeta[], idl: Idl, clusterUrl: string, programId: PublicKey): AnchorProgramInstruction {
    const program = new Program(formatIdl(idl, programId.toString()), getProvider(clusterUrl));
    let errorMessage: string | undefined;
    let anchorDetails: AnchorInstructionDetails | undefined;
    try {
        anchorDetails = getAnchorDetails(ix, program);
    } catch (e) {
        errorMessage = (e as Error).message;
    }

    return {
        accounts: anchorDetails ? getAnchorAccounts(accountMetas, anchorDetails.ixAccounts) : [],
        address: program.programId.toBase58(),
        arguments: anchorDetails ? getAnchorArguments(anchorDetails.decodedIxData, anchorDetails.ixDef) : [],
        instructionName: getAnchorNameForInstruction(ix, program) || 'Unknown Instruction',
        message: errorMessage,
        programName: getAnchorProgramName(program) || 'Unknown Program',
    }
}

function getAnchorArguments(decodedIxData: Instruction, ixDef: IdlInstruction): AnchorArgument[] {
    return Object.entries(decodedIxData.data).map(([key, value]) => {
        const fieldDef = ixDef.args.find(ixDefArg => ixDefArg.name === key);
        if (!fieldDef) {
            return {
                message: `Could not find expected ${key} field on account type definition for ${ixDef.name}`,
                name: key,
                type: 'unknown',
                value: value.toString(),
            }
        }

        return {
            name: key,
            type: fieldDef.type.toString(),
            value: value.toString(),
        }
    });
}

function getAnchorDetails(ix: MessageCompiledInstruction, program: Program): AnchorInstructionDetails {
    const ixData = Buffer.from(ix.data);
    if (instructionIsSelfCPI(ixData)) {
        const coder = new BorshEventCoder(program.idl);
        const decodedIxData = coder.decode(ixData.slice(8).toString('base64'));

        if (!decodedIxData) {
            throw new Error('Failed to decode self CPI');
        }

        const ixEventDef = program.idl.events?.find(
            ixDef => ixDef.name === decodedIxData?.name
        ) as IdlEvent;

        const ixEventFields = program.idl.types?.find((type: any) => type.name === ixEventDef.name);

        const ixDef = {
            ...ixEventDef,
            accounts: [],
            args: ((ixEventFields?.type as IdlTypeDefTyStruct).fields as IdlField[]) ?? [],
        };

        const ixAccounts = [{ name: 'eventAuthority' }];

        return {
            decodedIxData,
            ixAccounts,
            ixDef,
        }
    }

    const coder = new BorshInstructionCoder(program.idl);
    const decodedIxData = coder.decode(ixData);

    if (decodedIxData) {
        const ixDef = program.idl.instructions.find(ixDef => ixDef.name === decodedIxData?.name);
        if (ixDef) {
            const ixAccounts = getAnchorAccountsFromInstruction(decodedIxData, program)?.map(account => ({ name: account.name })) ?? [];

            return {
                decodedIxData,
                ixAccounts,
                ixDef,
            }
        }
    }

    throw new Error('Failed to decode instruction');
}

function getAnchorAccounts(accountMetas: AccountMeta[], ixAccounts: { name: string }[]): Account[] {
    return accountMetas.map((meta, index) => ({
        address: meta.pubkey.toBase58(),
        name: ixAccounts[index].name,
        readOnly: !meta.isWritable,
        signer: meta.isSigner
    }));
}

function getAnchorNameForInstruction(ix: MessageCompiledInstruction, program: Program): string | null {
    const ixData = Buffer.from(ix.data);
    if (instructionIsSelfCPI(ixData)) {
        return ANCHOR_SELF_CPI_NAME;
    }

    const coder = new BorshInstructionCoder(program.idl);
    const decodedIx = coder.decode(ixData);

    if (!decodedIx) {
        return null;
    }

    const _ixTitle = decodedIx.name;
    return _ixTitle.charAt(0).toUpperCase() + _ixTitle.slice(1);
}

async function getDefaultInstruction(ix: MessageCompiledInstruction, programId: PublicKey, clusterUrl: string): Promise<DefaultInstruction> {
    const connection = new Connection(clusterUrl, 'confirmed');
    const accountInfo = await connection.getAccountInfo(programId);

    return {
        accounts: [],
        address: {
            address: programId.toBase58(),
            context: getAddressContext(accountInfo),
        },
        data: Buffer.from(ix.data).toString('hex'),
        name: getProgramName(programId.toBase58(), getCluster(clusterUrl)) ?? 'Unknown Program'
    }
}

function getCluster(clusterUrl: string): Cluster {
    for (const cluster of CLUSTERS) {
        if (clusterUrl.includes(clusterSlug(cluster))) {
            return cluster;
        }
    }
    return Cluster.Custom;
}

function getProvider(url: string) {
    return new AnchorProvider(new Connection(url), new NodeWallet(Keypair.generate()), {});
}

async function getAddressTableLookups(data: TransactionData, clusterUrl: string): Promise<AddressTableLookup[] | undefined> {
    if (data.message.version === 'legacy' || data.message.addressTableLookups.length === 0) return;

    return (await Promise.all(data.message.addressTableLookups.flatMap(async lookup => {
        const indexes = [
            ...lookup.writableIndexes.map(index => ({ index, readOnly: false })),
            ...lookup.readonlyIndexes.map(index => ({ index, readOnly: true })),
        ].sort((a, b) => (a.index - b.index));

        const lookupTable: AddressLookupTableAccount | null = await getAddressLookupTable(lookup.accountKey.toBase58(), clusterUrl);

        return indexes.map(({ index, readOnly }) => {
            return {
                address: lookup.accountKey.toBase58(),
                lookupTableIndex: index,
                message: lookupTable ? undefined : 'Address lookup table not found',
                readonly: readOnly,
                resolvedAddress: lookupTable?.state.addresses[index]?.toBase58(),
            }
        });
    }))).flat();
}

async function getAddressLookupTable(address: string, clusterUrl: string): Promise<AddressLookupTableAccount | null> {
    const connection = new Connection(clusterUrl, 'confirmed');
    const result = await connection.getAddressLookupTable(new PublicKey(address));
    return result.value ?? null;
}

async function getAccounts(data: TransactionData, clusterUrl: string): Promise<AccountWithContext[]> {
    const { numRequiredSignatures, numReadonlySignedAccounts, numReadonlyUnsignedAccounts } = data.message.header;

    const accountInfos: (AccountInfo<Buffer> | null)[] = await getAccountInfos(data.message.staticAccountKeys, clusterUrl);

    return data.message.staticAccountKeys.map((key, index) => ({
        address: {
            address: key.toBase58(),
            context: getAddressContext(accountInfos[index]),
        },
        name: `Account #${index + 1}`,
        readOnly: (index < numRequiredSignatures && index >= numRequiredSignatures - numReadonlySignedAccounts) ||
            (index >= data.message.staticAccountKeys.length - numReadonlyUnsignedAccounts),
        signer: index < numRequiredSignatures,
    }));
}

async function getAccountInfos(keys: PublicKey[], clusterUrl: string): Promise<(AccountInfo<Buffer> | null)[]> {
    const connection: Connection = new Connection(clusterUrl, 'confirmed');
    const result: (AccountInfo<Buffer> | null)[] = [];
    const batchSize = 100;
    let nextBatchStart = 0;

    while (nextBatchStart < keys.length) {
        const batch = keys.slice(nextBatchStart, nextBatchStart + batchSize);
        nextBatchStart += batchSize;
        const batchResult = await connection.getMultipleAccountsInfo(batch);
        result.push(...batchResult);
    }

    return result;
}

function getSignatures(data: TransactionData): Signature[] | undefined {
    if (data.signatures == null || data.signatures.length === 0) return;

    return data.signatures
        .filter((signature): signature is string => signature !== null)
        .map((signature, index) => ({
            feePayer: index === 0,
            signature: signature,
            signer: data.message.staticAccountKeys[index].toBase58(),
            verified: verifySignature(data.rawMessage,
                bs58.decode(signature),
                data.message.staticAccountKeys[index].toBytes()),
        }));
}

function verifySignature(message: Uint8Array, signature: Uint8Array, key: Uint8Array): boolean {
    return nacl.sign.detached.verify(message, signature, key);
}

async function getFeePayer(data: TransactionData, clusterUrl: string): Promise<AddressWithContext | undefined> {
    if (data.message.staticAccountKeys.length === 0) return;

    const connection = new Connection(clusterUrl, 'confirmed');
    const feePayerInfo: AccountInfo<Buffer> | null = await connection.getAccountInfo(data.message.staticAccountKeys[0]);

    const context = getAddressContext(feePayerInfo);

    if (!context) {
        return {
            address: data.message.staticAccountKeys[0].toBase58(),
        }
    }

    return {
        address: data.message.staticAccountKeys[0].toBase58(),
        context: {
            ...context,
            message: getMessage(feePayerInfo),
        },
    }
}

function getAddressContext(accountInfo: AccountInfo<Buffer> | null): AddressContext | undefined {
    return accountInfo ? {
        balance: accountInfo.lamports,
        ownedBy: accountInfo.owner.toBase58(),
        size: accountInfo.data.length,
    }
        : undefined;
}

function getMessage(feePayerInfo: AccountInfo<Buffer> | null): string | undefined {
    if (feePayerInfo == null || feePayerInfo.lamports === 0) return "Account doesn't exist";
    if (!feePayerInfo.owner.equals(SystemProgram.programId)) return 'Only system-owned accounts can pay fees';
    if (feePayerInfo.lamports < DEFAULT_FEES.lamportsPerSignature) {
        return 'Insufficient funds for fees';
    }
    return;
}
