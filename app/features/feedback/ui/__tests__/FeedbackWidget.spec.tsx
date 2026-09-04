import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { sendFeedback } from '@/app/shared/lib/sentry/client';

import { FeedbackWidget } from '../FeedbackWidget';

// test-setup.specs.ts globally mocks the Sentry modules; sendFeedback resolves by default
vi.mock('@entities/cluster', () => ({
    clusterSlug: () => 'mainnet-beta',
    useCluster: () => ({ cluster: 0 }),
}));

const SENTRY_DSN_FIXTURE = 'https://examplePublicKey@o0.ingest.sentry.io/0';

async function openMenu() {
    await userEvent.click(await screen.findByRole('button', { name: 'Feedback' }));
}

async function openForm() {
    await openMenu();
    await userEvent.click(await screen.findByText('Share feedback'));
    await screen.findByRole('heading', { name: 'Give feedback' });
}

describe('FeedbackWidget', () => {
    beforeEach(() => {
        vi.mocked(sendFeedback).mockClear();
        vi.mocked(sendFeedback).mockResolvedValue('test-event-id');
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

    it('should submit message, rating, contact, and cluster through sendFeedback and close the form', async () => {
        vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', SENTRY_DSN_FIXTURE);
        render(<FeedbackWidget />);
        await openForm();

        await userEvent.click(screen.getByRole('radio', { name: '4 of 5 stars' }));
        await userEvent.type(screen.getByRole('textbox', { name: 'Feedback' }), 'Great explorer!');
        await userEvent.type(screen.getByRole('textbox', { name: 'X handle (optional)' }), '@fren');
        await userEvent.click(screen.getByRole('button', { name: 'Submit' }));

        expect(sendFeedback).toHaveBeenCalledWith({
            message: 'Great explorer!',
            name: '@fren',
            tags: { cluster: 'mainnet-beta', rating: 4, source: 'widget', type: 'feedback' },
        });
        await waitFor(() => expect(screen.queryByRole('heading', { name: 'Give feedback' })).toBeNull());
    });

    it('should keep the form open when delivery fails (e.g. Sentry blocked)', async () => {
        vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', SENTRY_DSN_FIXTURE);
        vi.mocked(sendFeedback).mockRejectedValueOnce('Unable to send feedback.');
        render(<FeedbackWidget />);
        await openForm();

        await userEvent.type(screen.getByRole('textbox', { name: 'Feedback' }), 'Lost feedback');
        await userEvent.click(screen.getByRole('button', { name: 'Submit' }));

        await waitFor(() => expect(sendFeedback).toHaveBeenCalledOnce());
        expect(screen.getByRole('heading', { name: 'Give feedback' })).toBeInTheDocument();
        expect(screen.getByRole('textbox', { name: 'Feedback' })).toHaveValue('Lost feedback');
    });

    it('should close the form without sending when the close button is clicked', async () => {
        vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', SENTRY_DSN_FIXTURE);
        render(<FeedbackWidget />);
        await openForm();

        await userEvent.click(screen.getByRole('button', { name: 'Close' }));

        expect(sendFeedback).not.toHaveBeenCalled();
        expect(screen.queryByRole('heading', { name: 'Give feedback' })).toBeNull();
    });
});
