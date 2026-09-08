import { act, fireEvent, render, screen } from '@testing-library/react';
import { useSearchParams } from 'next/navigation';
import { afterEach, beforeAll, beforeEach, describe, expect, it, type Mock, vi } from 'vitest';

import { searchAnalytics } from '@/app/shared/lib/analytics';

import type { SearchOptions } from '../../lib/types';
import { useSearch } from '../../model/use-search';
import { useSearchNavigation } from '../../model/use-search-navigation';
import { SEARCH_DEBOUNCE_MS, SearchBar } from '../SearchBar';

beforeAll(() => {
    global.ResizeObserver = class {
        observe() {}
        unobserve() {}
        disconnect() {}
    };
    global.HTMLElement.prototype.scrollIntoView = vi.fn();
});

beforeEach(() => {
    vi.useFakeTimers();
});

afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
});

vi.mock('../../model/use-search', () => ({ useSearch: vi.fn() }));
vi.mock('../../model/use-search-navigation', () => ({ useSearchNavigation: vi.fn() }));
vi.mock('next/navigation', () => ({ useSearchParams: vi.fn() }));
vi.mock('@/app/shared/lib/analytics', () => ({
    searchAnalytics: {
        trackPerformed: vi.fn(),
        trackResultSelected: vi.fn(),
    },
}));

const mockNavigate = vi.fn();

const tokenResults: SearchOptions[] = [
    {
        label: 'Tokens',
        options: [
            {
                label: 'Token A',
                pathname: '/address/tokenA',
                type: 'address',
                value: ['token-a'],
                verified: true,
            },
            {
                label: 'Token B',
                pathname: '/address/tokenB',
                type: 'address',
                value: ['token-b'],
                verified: false,
            },
        ],
    },
];

describe('SearchBar', () => {
    it('should run a search from the q URL parameter', () => {
        setup(tokenResults, false, 'token');

        act(() => vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS));

        expect(screen.getByRole('combobox')).toHaveValue('token');
        expect(useSearch).toHaveBeenLastCalledWith('token');
        expect(screen.getByText('Token A')).toBeInTheDocument();
    });

    it('should navigate and reset state when a result is selected', () => {
        setup();

        const input = typeAndSettle('token');

        fireEvent.click(screen.getByText('Token A'));

        expect(mockNavigate).toHaveBeenCalledWith(tokenResults[0].options[0]);
        expect(input).toHaveValue('');
    });

    it('should call navigate with the correct option for each result', () => {
        setup();

        typeAndSettle('token');
        fireEvent.click(screen.getByText('Token B'));

        expect(mockNavigate).toHaveBeenCalledWith(tokenResults[0].options[1]);
    });

    it('should track result selection in analytics with type and verified status', () => {
        setup();

        typeAndSettle('token');
        fireEvent.click(screen.getByText('Token A'));

        expect(searchAnalytics.trackResultSelected).toHaveBeenCalledWith('address', true);
    });

    it('should fall back to "unknown" type when option has no type', () => {
        const untypedResults: SearchOptions[] = [
            {
                label: 'Tokens',
                options: [{ label: 'Token X', pathname: '/x', value: ['token-x'] }],
            },
        ];
        setup(untypedResults);

        typeAndSettle('token');
        fireEvent.click(screen.getByText('Token X'));

        expect(searchAnalytics.trackResultSelected).toHaveBeenCalledWith('unknown', undefined);
    });

    it('should close the popover on Escape', () => {
        setup();

        typeAndSettle('token');

        // Results should be visible
        expect(screen.getByText('Token A')).toBeInTheDocument();

        fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Escape' });

        // Results should be hidden after escape
        expect(screen.queryByText('Token A')).not.toBeInTheDocument();
    });

    it('should clear the input when the clear button is clicked', () => {
        setup();

        const input = typeAndSettle('token');
        expect(input).toHaveValue('token');

        fireEvent.mouseDown(screen.getByRole('button', { name: 'Clear search' }));

        expect(input).toHaveValue('');
    });

    it('should show "No Results" when search returns empty', () => {
        setup([]);

        typeAndSettle('xyznonexistent');

        expect(screen.getByText('No results found')).toBeInTheDocument();
    });

    it('should show loading state', () => {
        setup([], true);

        typeAndSettle('loading');

        expect(screen.getByText('Searching...')).toBeInTheDocument();
    });

    describe('debounce pending state', () => {
        it('should show loading indicator during debounce window', () => {
            setup();

            const input = screen.getByRole('combobox');
            fireEvent.change(input, { target: { value: 'token' } });

            // Debounce hasn't fired yet → search !== debouncedSearch → loading shown
            expect(screen.getByText('Searching...')).toBeInTheDocument();
        });

        it('should stop showing loading indicator after debounce settles', () => {
            setup();

            const input = screen.getByRole('combobox');
            fireEvent.change(input, { target: { value: 'token' } });

            // Advance past the debounce
            act(() => vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS));

            // Debounce settled, fetch not loading → no loading indicator
            expect(screen.queryByText('Searching...')).not.toBeInTheDocument();
        });

        it('should not show loading indicator for whitespace-only input during debounce', () => {
            setup();

            const input = screen.getByRole('combobox');
            fireEvent.change(input, { target: { value: '   ' } });

            // Whitespace-only search should not trigger pending state
            expect(screen.queryByText('Searching...')).not.toBeInTheDocument();
        });
    });
});

function setup(results: SearchOptions[] = tokenResults, isLoading = false, urlQuery = '') {
    (useSearch as Mock).mockReturnValue({ data: results, isLoading });
    (useSearchNavigation as Mock).mockReturnValue(mockNavigate);
    (useSearchParams as Mock).mockReturnValue(new URLSearchParams(urlQuery ? `q=${urlQuery}` : ''));

    render(<SearchBar />);
}

/** Type into the search input and advance past the debounce so results appear. */
function typeAndSettle(text: string) {
    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: text } });
    act(() => vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS));
    return input;
}
