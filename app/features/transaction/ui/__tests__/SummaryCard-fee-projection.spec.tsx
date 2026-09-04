import { render, screen } from '@testing-library/react';
import React from 'react';

import { AutoRefresh } from '@/app/shared/lib/use-auto-refresh';

import {
    DEFAULT_SIGNATURE,
    MOCK_LOOSE_BUDGET_TX,
    MOCK_PARSED_TX,
    MOCK_RAW_TX,
    MOCK_STATUS,
    MOCK_TIGHT_BUDGET_TX,
} from '../__fixtures__/transaction';
import { withTransactionProviders } from '../__fixtures__/withTransactionProviders';
import { SummaryCard } from '../SummaryCard';

// `ClusterProvider` reads the router on mount, which jsdom has no app router for.
vi.mock('next/navigation', () => ({
    usePathname: () => `/tx/${DEFAULT_SIGNATURE}`,
    useRouter: () => ({ replace: vi.fn() }),
    useSearchParams: () => new URLSearchParams(),
}));

// `InfoTooltip` pins the label's last word to its help icon inside a nested `nowrap` span, so a
// label like "Fee under SIMD-0553" is split across elements. Match on the innermost element whose
// full text equals the label rather than on a single text node.
function byLabelText(label: string) {
    return (_content: string, element: Element | null): boolean => {
        if (element?.textContent !== label) return false;
        return Array.from(element.children).every(child => child.textContent !== label);
    };
}

function renderSummary(parsed = MOCK_PARSED_TX) {
    const Wrapper = withTransactionProviders(
        { [DEFAULT_SIGNATURE]: parsed },
        { [DEFAULT_SIGNATURE]: MOCK_STATUS },
        { [DEFAULT_SIGNATURE]: MOCK_RAW_TX },
    );

    return render(
        <Wrapper>
            <SummaryCard signature={DEFAULT_SIGNATURE} autoRefresh={AutoRefresh.Inactive} />
        </Wrapper>,
    );
}

describe('SummaryCard SIMD-0553 fee projection', () => {
    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it('should omit the row when the flag is off', async () => {
        vi.stubEnv('NEXT_PUBLIC_SIMD_0553_FEE_ENABLED', 'false');

        renderSummary();

        // The fee row itself still renders, so this asserts the projection alone is gated.
        expect(await screen.findByText('Fee')).toBeInTheDocument();
        expect(screen.queryByText(byLabelText('Fee under SIMD-0553'))).not.toBeInTheDocument();
    });

    it('should render a projection per staged rate when the flag is on', async () => {
        vi.stubEnv('NEXT_PUBLIC_SIMD_0553_FEE_ENABLED', 'true');

        renderSummary();

        expect(await screen.findByText(byLabelText('Fee under SIMD-0553'))).toBeInTheDocument();
        expect(screen.getByText('at the 1/10 rate')).toBeInTheDocument();
        expect(screen.getByText('at the 1/4 rate')).toBeInTheDocument();
        expect(screen.getByText('at the 1/2 rate')).toBeInTheDocument();
    });

    it('should project an accurately budgeted transfer below the flat base fee it paid', async () => {
        vi.stubEnv('NEXT_PUBLIC_SIMD_0553_FEE_ENABLED', 'true');

        renderSummary(MOCK_TIGHT_BUDGET_TX);

        // Requested cost 1,481 - 150 + 1,000 = 2,331. Terminal rate: 2,500 + ceil(2331/2) = 3,666
        // lamports, against the 5,000 the transaction actually paid.
        expect(await screen.findByText('◎0.000003666')).toBeInTheDocument();
    });

    it('should charge a loose compute budget on what it requested, not what it used', async () => {
        vi.stubEnv('NEXT_PUBLIC_SIMD_0553_FEE_ENABLED', 'true');

        renderSummary(MOCK_LOOSE_BUDGET_TX);

        // Same transfer, same 1,481 executed cost, but 200,000 units requested: 201,331 requested
        // cost, so 2,500 + ceil(201331/2) = 103,166 lamports at the terminal rate. Projecting off
        // the executed cost instead would have shown ◎0.000003241 here.
        expect(await screen.findByText('◎0.000103166')).toBeInTheDocument();
        expect(screen.queryByText('◎0.000003241')).not.toBeInTheDocument();
    });
});
