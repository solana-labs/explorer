import { Button } from '@components/shared/ui/button';

import { CardFooter } from '@/app/shared/ui/Card';

export type HistoryCardFooterProps = {
    fetching: boolean;
    foundOldest: boolean;
    loadMore: () => void;
};

// The footer's inner control, independent of its surrounding chrome: a "Fetched full history" notice
// once the oldest page is loaded, otherwise a full-width Load More button that shows a spinner while
// fetching. Extracted so callers with their own footer wrapper (e.g. the transaction-history card's
// responsive frameless-on-mobile footer) can reuse the exact same control.
export function HistoryCardFooterContent({ fetching, foundOldest, loadMore }: HistoryCardFooterProps) {
    return foundOldest ? (
        <div className="text-center text-dk-gray-700">Fetched full history</div>
    ) : (
        <Button ui="dashkit" variant="primary" className="w-full" onClick={() => loadMore()} disabled={fetching}>
            {fetching ? (
                <>
                    <span className="spinner-grow spinner-grow-sm mr-1.5 align-text-top"></span>
                    Loading
                </>
            ) : (
                'Load More'
            )}
        </Button>
    );
}

export function HistoryCardFooter({ fetching, foundOldest, loadMore }: HistoryCardFooterProps) {
    return (
        <CardFooter ui="dashkit">
            <HistoryCardFooterContent fetching={fetching} foundOldest={foundOldest} loadMore={loadMore} />
        </CardFooter>
    );
}
