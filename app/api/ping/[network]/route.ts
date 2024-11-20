import { fetch } from 'cross-fetch';
import { NextResponse } from 'next/server';

type Params = {
    params: {
        network: 'mainnet';
    };
};

export type ValidatorsAppPingStats = {
    interval: number;
    max: number;
    median: number;
    min: number;
    network: string;
    num_of_records: number;
    time_from: string;
    average_slot_latency: number;
    tps: number;
};

const PING_INTERVALS: number[] = [1, 3, 12];

export async function GET(_request: Request, { params: { network } }: Params) {
    const responses = await Promise.all(
        PING_INTERVALS.map(interval =>
            fetch(`https://www.validators.app/api/v1/ping-thing-stats/${network}.json?interval=${interval}`, {
                cache: 'no-store',
                headers: {
                    'Cache-Control': 'no-store, max-age=0',
                    Token: process.env.PING_API_KEY || '',
                },
            })
        )
    );
    const data: { [interval: number]: ValidatorsAppPingStats[] } = {};
    await Promise.all(
        responses.map(async (response, index) => {
            const interval = PING_INTERVALS[index];
            data[interval] = await response.json();
        })
    );

    return NextResponse.json(data, {
        headers: {
            'Cache-Control': 'public, max-age=30',
        },
    });
}
