'use client';

import {
    BUG_REPORT_ISSUES_URL,
    FEEDBACK_ISSUES_URL,
    isFeedbackEnabled,
    isFeedbackWidgetEnabled,
} from '../lib/feedback-options';
import { useFeedbackForm } from '../model/use-feedback-form';
import { BaseFeedbackForm } from './BaseFeedbackForm';
import { BaseFeedbackWidget } from './BaseFeedbackWidget';

export function FeedbackWidget() {
    const { isOpen, isSubmitting, setIsOpen, submit } = useFeedbackForm();

    if (!isFeedbackWidgetEnabled()) return undefined;

    return (
        <>
            <BaseFeedbackWidget
                bugReportUrl={BUG_REPORT_ISSUES_URL}
                ideasUrl={FEEDBACK_ISSUES_URL}
                onShareFeedback={() => setIsOpen(true)}
                showSentryActions={isFeedbackEnabled()}
            />
            <BaseFeedbackForm
                bugReportUrl={BUG_REPORT_ISSUES_URL}
                ideasUrl={FEEDBACK_ISSUES_URL}
                isSubmitting={isSubmitting}
                onOpenChange={setIsOpen}
                onSubmit={submit}
                open={isOpen}
            />
        </>
    );
}
