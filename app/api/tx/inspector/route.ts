import { VersionedMessage } from '@solana/web3.js';
import base58 from 'bs58';
import { ReadonlyURLSearchParams } from 'next/navigation';
import { NextResponse } from 'next/server';

import { clusterUrl, parseQuery } from '@/app/utils/cluster';
import { Cluster } from '@/app/utils/cluster';
import { MIN_MESSAGE_LENGTH, TransactionData } from '@/app/utils/tx';
import { getTxInfo } from '@/app/utils/tx';

export type AddressContext = {
    ownedBy: string;
    balance: number;
    size: number;
    message?: string;
}

export type AddressWithContext = {
    address: string;
    context?: AddressContext;
}

export type Signature = {
    signature: string;
    signer: string;
    validity?: string;
    feePayer: boolean;
}

export type AnchorArgument = {
    name: string,
    type: string,
    value: string,
    message?: string
}

export type AnchorProgramInstruction = {
    programName: string,
    instructionName: string,
    message?: string,
    address: string,
    accounts: Account[],
    arguments: AnchorArgument[]
}

export type DefaultInstruction = {
    name: string,
    address: AddressWithContext,
    accounts: Account[],
    data: string
}

export type AccountWithContext = {
    name: string,
    readOnly: boolean;
    signer: boolean;
    address: AddressWithContext;
}

export type Account = {
    name: string,
    readOnly: boolean;
    signer: boolean;
    address: string;
}

export type AddressTableLookup = {
    address: string,
    lookupTableIndex: number,
    resolvedAddress?: string,
    readonly: boolean,
    message?: string
}

export type TransactionInspectorResponse = {
    serializedSize: number;
    fees: number;
    feePayer?: AddressWithContext,
    signatures?: Signature[],
    accounts: AccountWithContext[],
    addressTableLookups?: AddressTableLookup[],
    instructions: (AnchorProgramInstruction | DefaultInstruction)[]
}

function decodeSignatures(signaturesParam: string): (string | null)[] {
    let signatures;
    try {
        signatures = JSON.parse(signaturesParam);
    } catch (err) {
        throw new Error('Signatures param is not valid JSON');
    }

    if (!Array.isArray(signatures)) {
        throw new Error('Signatures param is not a JSON array');
    }

    const validSignatures: (string | null)[] = [];
    for (const signature of signatures) {
        if (signature === null) {
            continue;
        }

        if (typeof signature !== 'string') {
            throw new Error('Signature is not a string');
        }

        try {
            base58.decode(signature);
            validSignatures.push(signature);
        } catch (err) {
            throw new Error('Signature is not valid base58');
        }
    }

    return validSignatures;
}

function decodeUrlParams(searchParams: URLSearchParams): TransactionData {
    const messageParam = searchParams.get('message');
    if (!messageParam) {
        throw new Error('Missing message parameter');
    }

    let signatures: (string | null)[] | undefined;
    const signaturesParam = searchParams.get('signatures');
    if (signaturesParam) {
        try {
            signatures = decodeSignatures(decodeURIComponent(signaturesParam));
        } catch (err) {
            throw new Error(`Invalid signatures parameter: ${(err as Error).message}`);
        }
    }
    try {
        const buffer = Uint8Array.from(atob(decodeURIComponent(messageParam)), c => c.charCodeAt(0));

        if (buffer.length < MIN_MESSAGE_LENGTH) {
            throw new Error('Message buffer is too short');
        }

        const message = VersionedMessage.deserialize(buffer);

        return {
            message,
            rawMessage: buffer,
            signatures,
        };
    } catch (err) {
        throw new Error('Invalid message format');
    }
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const cluster: Cluster = parseQuery(searchParams as ReadonlyURLSearchParams);
    const customUrl: string | null = searchParams.get('customUrl');

    const url = customUrl ? customUrl : clusterUrl(cluster, '');

    let txData: TransactionData;
    try {
        txData = decodeUrlParams(searchParams);
    } catch (err) {
        return NextResponse.json({ error: (err as Error).message }, { status: 400 });
    }

    return NextResponse.json(await getTxInfo(txData, url));
}


