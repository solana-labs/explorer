import { NextRequest, NextResponse } from "next/server"
import { Client, ChainId, UtlConfig } from '@solflare-wallet/utl-sdk';


export const config = {
    runtime: 'edge',
}

export async function GET(req: NextRequest) {
    const params = req.nextUrl.searchParams;
    const query = params.get('query');
    if (!query) return NextResponse.json([]);

    const config: UtlConfig = {
        ...new UtlConfig(),
        chainId: ChainId.MAINNET // TODO: query param
    };
    const tokenClient = new Client(config);
    const tokens = await tokenClient.searchMints(query, { start: 0, limit: 20 });

    return NextResponse.json(tokens);
}
