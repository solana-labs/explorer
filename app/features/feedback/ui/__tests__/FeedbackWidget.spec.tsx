import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { captureFeedback } from '@/app/shared/lib/sentry';

import { FeedbackWidget } from '../FeedbackWidget';

// test-setup.specs.ts globally mocks @/app/shared/lib/sentry (captureFeedback is a vi.fn there)
const SENTRY_DSN_FIXTURE = 'https://examplePublicKey@o0.ingest.sentry.io/0';

async function openMenu() {
    await userEvent.click(await screen.findByRole('button', { name: 'Feedback' }));
}

describe('FeedbackWidget', () => {
    beforeEach(() => {
        vi.mocked(captureFeedback).mockClear();
        vi.stubEnv('NEXT_PUBLIC_FEEDBACK_ENABLED', 'true');
    });

    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it('should render nothing when the feature flag is off', () => {
        vi.stubEnv('NEXT_PUBLIC_FEEDBACK_ENABLED', 'false');
        render(<FeedbackWidget />);

        expect(screen.queryByRole('button', { name: 'Feedback' })).toBeNull();
    });

    it('should show only the GitHub links when client Sentry is disabled', async () => {
        vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', '');
        render(<FeedbackWidget />);
        await openMenu();

        const ideasLink = await screen.findByRole('menuitem', { name: 'Suggest an idea' });
        expect(ideasLink).toHaveAttribute(
            'href',
            'https://github.com/solana-foundation/explorer/issues/new?template=feature_request.yml',
        );
        expect(screen.getByRole('menuitem', { name: 'Report a bug' })).toHaveAttribute(
            'href',
            'https://github.com/solana-foundation/explorer/issues/new?template=bug_report.yml',
        );
        expect(screen.queryByText('Share feedback')).toBeNull();
    });

    it('should submit message, rating, and contact through captureFeedback', async () => {
        vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', SENTRY_DSN_FIXTURE);
        render(<FeedbackWidget />);
        await openMenu();
        await userEvent.click(await screen.findByText('Share feedback'));

        await screen.findByRole('heading', { name: 'Give feedback' });
        await userEvent.click(screen.getByRole('radio', { name: '4 of 5 stars' }));
        await userEvent.type(screen.getByRole('textbox', { name: 'Feedback' }), 'Great explorer!');
        await userEvent.type(screen.getByRole('textbox', { name: 'X handle (optional)' }), '@fren');
        await userEvent.click(screen.getByRole('button', { name: 'Submit' }));

        expect(captureFeedback).toHaveBeenCalledWith({
            message: 'Great explorer!',
            name: '@fren',
            tags: { rating: 4, source: 'widget', type: 'feedback' },
        });
        expect(screen.queryByRole('heading', { name: 'Give feedback' })).toBeNull();
    });

    it('should close the form without capturing when the close button is clicked', async () => {
        vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', SENTRY_DSN_FIXTURE);
        render(<FeedbackWidget />);
        await openMenu();
        await userEvent.click(await screen.findByText('Share feedback'));

        await screen.findByRole('heading', { name: 'Give feedback' });
        await userEvent.click(screen.getByRole('button', { name: 'Close' }));

        expect(captureFeedback).not.toHaveBeenCalled();
        expect(screen.queryByRole('heading', { name: 'Give feedback' })).toBeNull();
    });
});
