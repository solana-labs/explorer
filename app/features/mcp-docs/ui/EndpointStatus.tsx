import { ExternalLink } from 'react-feather';

export type EndpointStatus = { state: 'checking' | 'ready' | 'restricted' | 'blocked' | 'disabled'; ms?: number };

/** Renders the live health-probe result: checking spinner text, a ready dot with latency, a restricted state, a blocked state, or a disabled state. */
export function EndpointStatusValue({ status }: { status: EndpointStatus }) {
    if (status.state === 'checking') {
        return <span className="text-neutral-500">Checking…</span>;
    }
    if (status.state === 'restricted') {
        return (
            <span className="flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-amber-400" aria-hidden />
                Restricted — access key required
                <a
                    href="https://github.com/solana-foundation/explorer/blob/master/app/mcp/README.md"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm font-medium text-dark-accent no-underline"
                >
                    How to run
                    <ExternalLink size={12} aria-hidden />
                </a>
            </span>
        );
    }
    if (status.state === 'blocked') {
        return (
            <span className="flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-amber-400" aria-hidden />
                Blocked — your IP isn’t allowed
                <a
                    href="https://github.com/solana-foundation/explorer/blob/master/app/mcp/README.md"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm font-medium text-dark-accent no-underline"
                >
                    How to run
                    <ExternalLink size={12} aria-hidden />
                </a>
            </span>
        );
    }
    if (status.state === 'disabled') {
        return (
            <span className="flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-neutral-500" aria-hidden />
                Disabled
                <a
                    href="https://github.com/solana-foundation/explorer/blob/master/app/mcp/README.md"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm font-medium text-dark-accent no-underline"
                >
                    How to run
                    <ExternalLink size={12} aria-hidden />
                </a>
            </span>
        );
    }
    return (
        <span className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-dark-accent" aria-hidden />
            Ready{status.ms !== undefined && <span className="text-neutral-500">· {status.ms} ms</span>}
        </span>
    );
}
