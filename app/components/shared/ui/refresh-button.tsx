// TODO(fsd): relocate this module to @shared or the appropriate feature/entity layer.
import React from 'react';
import { RefreshCw } from 'react-feather';

import { refreshAnalytics } from '@/app/shared/lib/analytics';

import { Button } from './button';

type Props = {
    analyticsSection: string;
    fetching?: boolean;
    onClick: () => void;
    className?: string;
};

export function RefreshButton({ analyticsSection, fetching = false, onClick, className }: Props) {
    return (
        <Button
            variant="outline"
            size="sm"
            aria-label="Refresh"
            className={className}
            disabled={fetching}
            onClick={() => {
                refreshAnalytics.trackButtonClicked(analyticsSection);
                onClick();
            }}
        >
            {fetching ? (
                <>
                    <span className="spinner-grow spinner-grow-sm" />
                    <span className="hidden md:inline">Loading</span>
                </>
            ) : (
                <>
                    <RefreshCw size={12} />
                    <span className="hidden md:inline">Refresh</span>
                </>
            )}
        </Button>
    );
}
