import { render, screen } from '@testing-library/react';
import React from 'react';

import { AutoRefresh } from '@/app/shared/lib/use-auto-refresh';

import {
    DEFAULT_SIGNATURE,
    MOCK_PARSED_TX,
    MOCK_PARSED_TX_NO_BLOCK_TIME,
    MOCK_RAW_TX,
    MOCK_RAW_TX_NO_BLOCK_TIME,
    MOCK_STATUS,
} from '../__fixtures__/transaction';
import { withTransactionProviders } from '../__fixtures__/withTransactionProviders';
import { SummaryCard } from '../SummaryCard';

// `ClusterProvider` reads the router on mount, which jsdom has no app router for.
vi.mock('next/navigation', () => ({
    usePathname: () => `/tx/${DEFAULT_SIGNATURE}`,
    useRouter: () => ({ replace: vi.fn() }),
    useSearchParams: () => new URLSearchParams(),
}));

function renderSummary({
    parsed = MOCK_PARSED_TX,
    raw = MOCK_RAW_TX,
}: { parsed?: typeof MOCK_PARSED_TX; raw?: typeof MOCK_RAW_TX } = {}) {
    const Wrapper = withTransactionProviders(
        { [DEFAULT_SIGNATURE]: parsed },
        { [DEFAULT_SIGNATURE]: MOCK_STATUS },
        { [DEFAULT_SIGNATURE]: raw },
    );

    return render(
        <Wrapper>
            <SummaryCard signature={DEFAULT_SIGNATURE} autoRefresh={AutoRefresh.Inactive} />
        </Wrapper>,
    );
}

describe('SummaryCard timestamp', () => {
    it('should render the block time carried by the raw transaction', async () => {
        renderSummary();

        expect(await screen.findByText('Timestamp (Local)')).toBeInTheDocument();
        expect(screen.getByText('Timestamp (UTC)')).toBeInTheDocument();
    });

    it('should fall back to the parsed transaction when the raw response has no block time', async () => {
        // The two fetches use the same commitment, but only one has to land for the row to render.
        renderSummary({ raw: MOCK_RAW_TX_NO_BLOCK_TIME });

        expect(await screen.findByText('Timestamp (Local)')).toBeInTheDocument();
    });

    it('should say unavailable when neither transaction carries a block time', async () => {
        renderSummary({ parsed: MOCK_PARSED_TX_NO_BLOCK_TIME, raw: MOCK_RAW_TX_NO_BLOCK_TIME });

        expect(await screen.findByText('Unavailable')).toBeInTheDocument();
        expect(screen.queryByText('Timestamp (Local)')).not.toBeInTheDocument();
    });
});
