import { type Envelope, getCurrentScope, ServerRuntimeClient } from '@sentry/core';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { FeedbackWidget } from '../FeedbackWidget';

// Exercise the real feedback → envelope path: unmock the shared module and route
// '@sentry/nextjs' to '@sentry/core' (the nextjs entry drags server-only pieces into jsdom).
// The SDK's sendFeedback is browser-entry-only, so its envelope-producing core delegate stands in.
vi.unmock('@/app/shared/lib/sentry');
vi.mock('@sentry/nextjs', async () => vi.importActual('@sentry/core'));
vi.mock('@/app/shared/lib/sentry/client', async () => {
    const { captureFeedback } = await vi.importActual<typeof import('@sentry/core')>('@sentry/core');
    return { sendFeedback: async (params: Parameters<typeof captureFeedback>[0]) => captureFeedback(params) };
});
vi.mock('@entities/cluster', () => ({
    clusterSlug: () => 'mainnet-beta',
    useCluster: () => ({ cluster: 0 }),
}));

const SENTRY_DSN_FIXTURE = 'https://examplePublicKey@o0.ingest.sentry.io/0';

type FeedbackEventShape = {
    contexts?: { feedback?: Record<string, unknown> };
    tags?: Record<string, unknown>;
    type?: string;
};

describe('FeedbackWidget — real captureFeedback envelope', () => {
    const envelopes: Envelope[] = [];

    beforeEach(() => {
        envelopes.length = 0;
        vi.stubEnv('NEXT_PUBLIC_FEEDBACK_ENABLED', 'true');
        vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', SENTRY_DSN_FIXTURE);

        const client = new ServerRuntimeClient({
            dsn: SENTRY_DSN_FIXTURE,
            integrations: [],
            stackParser: () => [],
            transport: () => ({
                flush: async () => true,
                send: async (envelope: Envelope) => {
                    envelopes.push(envelope);
                    return {};
                },
            }),
        });
        getCurrentScope().setClient(client);
        client.init();
    });

    afterEach(() => {
        getCurrentScope().setClient(undefined);
        vi.unstubAllEnvs();
    });

    it('should deliver message, rating, contact, and cluster inside a feedback envelope', async () => {
        render(<FeedbackWidget />);
        await userEvent.click(await screen.findByRole('button', { name: 'Feedback' }));
        await userEvent.click(await screen.findByText('Share feedback'));

        await screen.findByRole('heading', { name: 'Give feedback' });
        await userEvent.click(screen.getByRole('radio', { name: '4 of 5 stars' }));
        await userEvent.type(screen.getByRole('textbox', { name: 'Feedback' }), 'Great explorer!');
        await userEvent.type(screen.getByRole('textbox', { name: 'X handle (optional)' }), '@fren');
        await userEvent.click(screen.getByRole('button', { name: 'Submit' }));

        await vi.waitFor(() => expect(envelopes).toHaveLength(1));
        const [, items] = envelopes[0];
        const [itemHeader, event] = items[0] as [{ type: string }, FeedbackEventShape];

        expect(itemHeader.type).toBe('feedback');
        expect(event.type).toBe('feedback');
        expect(event.contexts?.feedback).toMatchObject({ message: 'Great explorer!', name: '@fren' });
        expect(event.tags).toMatchObject({ cluster: 'mainnet-beta', rating: 4, source: 'widget', type: 'feedback' });
    });
});
