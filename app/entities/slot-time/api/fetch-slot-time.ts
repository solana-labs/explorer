import { type ConnectableUrl, getRpc } from '@entities/cluster/@x/slot-time';
import { Logger } from '@shared/lib/logger';
import { ROUTE_TIMEOUT_MS, UPSTREAM_TIMEOUT_MS } from '@shared/lib/timeouts';
import { type Cluster } from '@utils/cluster';

import { MEASURED_SAMPLES, parseSlotTimePayload, toMsPerSlot } from '../lib/slot-time';

/** Carries whether asking again could answer differently, judged where the response is in hand. */
export class SlotTimeFetchError extends Error {
    readonly name = 'SlotTimeFetchError';
    readonly retryable: boolean;

    constructor(message: string, options: { retryable: boolean }) {
        super(message);
        this.retryable = options.retryable;
    }
}

/** An error from anywhere else is most likely the connection, which is worth another go. */
export function isRetryableSlotTimeError(error: unknown): boolean {
    return error instanceof SlotTimeFetchError ? error.retryable : true;
}

/** Throws rather than returning a nominal rate, which every countdown would then present as measured. */
export async function fetchSlotTimeFromRoute(cluster: Cluster): Promise<number> {
    const response = await fetch(`/api/slot-time?cluster=${cluster}`, {
        // Without one, a connection that is accepted and never answered leaves the countdown absent for good.
        signal: AbortSignal.timeout(ROUTE_TIMEOUT_MS),
    });

    if (!response.ok) {
        const retryable = RETRYABLE_STATUSES.has(response.status);
        // The one answer the route cannot have reported: it refuses a caller's input silently, since
        // anyone can provoke that. This client sends a single fixed request, so a refusal reaching it
        // means our own bug or a deploy that left it behind. Warned, not errored — the bot gate ahead of
        // the route refuses visitors it misjudges.
        if (response.status < 500 && !retryable) {
            Logger.warn('[slot-time] /api/slot-time refused the request', {
                sentry: true,
                sentryExtras: { cluster, status: response.status },
            });
        }
        throw new SlotTimeFetchError(`[slot-time] /api/slot-time returned ${response.status}`, { retryable });
    }

    // The route counts a 200 as answered, so nothing on its side reported this: an intermediary replied
    // in its place, or a deploy left the two sides disagreeing on the payload — and only the parse
    // failure tells those apart. Not retryable, because asking again cannot change a body's shape.
    // Warned rather than errored, like the refusal above: someone else's middlebox must not page us.
    try {
        return parseSlotTimePayload(await response.json());
    } catch (error) {
        Logger.warn(UNREADABLE_BODY, {
            sentry: true,
            sentryExtras: { cluster, parseError: error instanceof Error ? error.message : String(error) },
        });
        throw new SlotTimeFetchError(UNREADABLE_BODY, { retryable: false });
    }
}

/** For endpoints the server cannot or must not reach — a custom URL, or a local validator. */
export async function fetchSlotTimeFromRpc(url: ConnectableUrl): Promise<number> {
    const samples = await getRpc(url)
        .getRecentPerformanceSamples(MEASURED_SAMPLES)
        .send({ abortSignal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS) });

    return toMsPerSlot(samples, MEASURED_SAMPLES);
}

// Asking again can only answer differently for these: the route's transient upstream error and its
// deadline, plus a rate limit from anything standing in front of it. Its other answers wait on someone
// changing configuration, and a rate limit is nobody's bug, so it is not reported either.
const RETRYABLE_STATUSES = new Set([429, 503, 504]);

// One sentence for the report and the throw: Sentry groups on the message, and a second wording would
// split one failure into two issues.
const UNREADABLE_BODY = '[slot-time] /api/slot-time answered with a body it could not read';
