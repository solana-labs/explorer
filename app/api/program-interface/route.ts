import { Connection, PublicKey, TransactionInstruction } from '@solana/web3.js';
import { NextResponse } from 'next/server';

import { additionalAccountsRequest } from './resolution';

type Params = {
    accounts: Record<string, string>;
    arguments: Record<string, string>;
    txIx: any;
    programId: string;
    payer: string;
    endpointUrl: string;
    instructionName: string;
};

// export type FetchedDomainInfo = Awaited<ReturnType<typeof getDomainInfo>>;

export async function POST(request: Request) {
    console.log('Intercepted post!');
    const text = await request.text();
    console.log({ text });
    const body: Params = JSON.parse(text);

    const connection = new Connection(body.endpointUrl);

    const camelToSnakeCase = (str: string) => str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);

    console.log(Buffer.from(body.txIx.data));
    console.log(
        body.txIx.keys.map((meta: { pubkey: string; isSigner: boolean; isWritable: boolean }) => ({
            ...meta,
            pubkey: new PublicKey(meta.pubkey),
        }))
    );
    console.log(new PublicKey(body.txIx.programId));
    const txIx: TransactionInstruction = {
        data: Buffer.from(body.txIx.data),
        keys: body.txIx.keys.map((meta: { pubkey: string; isSigner: boolean; isWritable: boolean }) => ({
            ...meta,
            pubkey: new PublicKey(meta.pubkey),
        })),
        programId: new PublicKey(body.txIx.programId),
    };

    const { ix } = await additionalAccountsRequest(
        connection,
        new PublicKey(body.payer),
        txIx,
        camelToSnakeCase(body.instructionName),
        true,
        false
    );

    const response = { ix };

    return NextResponse.json(response, {
        headers: {
            // 24 hours
            'Cache-Control': 'max-age=0',
        },
    });
}
