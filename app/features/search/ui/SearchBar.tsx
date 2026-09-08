'use client';

import { useDebouncedValue } from '@mantine/hooks';
import { useSearchParams } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';

import { searchAnalytics } from '@/app/shared/lib/analytics';

import { computeFilterArgs, type FilterId } from '../lib/filter-tabs';
import type { SearchItem } from '../lib/types';
import { useSearch } from '../model/use-search';
import { useSearchAnalytics } from '../model/use-search-analytics';
import { useSearchNavigation } from '../model/use-search-navigation';
import { BaseSearch } from './BaseSearch';

export const SEARCH_DEBOUNCE_MS = 500;

export function SearchBar() {
    const searchParams = useSearchParams();
    // Lazy initializers so the `?q=` lookup runs once on mount rather than on
    // every render, and `searchParams` is guarded (it is nullable under the
    // App Router), matching the defensive pattern in use-search-navigation.ts.
    const [search, setSearch] = useState(() => searchParams?.get('q') ?? '');
    const [open, setOpen] = useState(() => (searchParams?.get('q') ?? '').trim().length > 0);
    const [activeFilter, setActiveFilter] = useState<FilterId>('all');
    const [debouncedSearch] = useDebouncedValue(search, SEARCH_DEBOUNCE_MS);

    const { data: results = [], isLoading: isFetching } = useSearch(debouncedSearch);
    const isSearchPending = search.trim().length > 0 && search !== debouncedSearch;
    const isLoading = isFetching || isSearchPending;
    const navigate = useSearchNavigation();

    const filters = useMemo(() => computeFilterArgs(results, activeFilter), [results, activeFilter]);

    useSearchAnalytics(debouncedSearch, isLoading, results);

    const handleValueChange = useCallback((next: string) => {
        setSearch(next);
        setActiveFilter('all');
    }, []);

    const handleSelect = useCallback(
        (option: SearchItem) => {
            searchAnalytics.trackResultSelected(option.type ?? 'unknown', option.verified);
            navigate(option);
            setSearch('');
            setOpen(false);
        },
        [navigate],
    );

    return (
        <BaseSearch
            {...filters}
            value={search}
            open={open}
            isLoading={isLoading}
            onValueChange={handleValueChange}
            onOpenChange={setOpen}
            onFilterChange={setActiveFilter}
            onSelect={handleSelect}
        />
    );
}

export default SearchBar;
