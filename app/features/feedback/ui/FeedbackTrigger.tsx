'use client';

import type { ReactNode } from 'react';

import {
    BUG_REPORT_ISSUES_URL,
    FEEDBACK_ISSUES_URL,
    isFeedbackEnabled,
    isFeedbackWidgetEnabled,
} from '../lib/feedback-options';
import { useFeedbackForm } from '../model/use-feedback-form';
import { BaseFeedbackForm } from './BaseFeedbackForm';

export interface FeedbackTriggerProps {
    children: ReactNode;
    className?: string;
}

/** Inline trigger (e.g. a footer link) that opens the feedback form; renders nothing without a client DSN. */
export function FeedbackTrigger({ children, className }: FeedbackTriggerProps) {
    const { isOpen, setIsOpen, submit } = useFeedbackForm();

    if (!isFeedbackWidgetEnabled() || !isFeedbackEnabled()) return undefined;

    return (
        <>
            <button className={className} onClick={() => setIsOpen(true)} type="button">
                {children}
            </button>
            <BaseFeedbackForm
                bugReportUrl={BUG_REPORT_ISSUES_URL}
                ideasUrl={FEEDBACK_ISSUES_URL}
                onOpenChange={setIsOpen}
                onSubmit={submit}
                open={isOpen}
            />
        </>
    );
}
