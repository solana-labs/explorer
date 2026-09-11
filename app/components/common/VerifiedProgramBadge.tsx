import { PublicKey } from '@solana/web3.js';
import Link from 'next/link';
import { ExternalLink } from 'react-feather';

import { Badge } from '@/app/components/shared/ui/badge';
import { Skeleton } from '@/app/components/shared/ui/skeleton';
import { useCluster } from '@/app/providers/cluster';
import { useClusterPath } from '@/app/utils/url';
import { supportsVerifiedBuilds, useIsProgramVerified } from '@/app/utils/verified-builds';
import { ProgramDataAccountInfo } from '@/app/validators/accounts/upgradeable-program';

const VERIFIED_BUILD_DOC_LINK = 'https://github.com/Ellipsis-Labs/solana-verifiable-build';

// Every value the Verified Build row can resolve to. The connected badge below maps the
// cluster + verified-build query onto one of these; the presentational badge renders it.
export type VerifiedBuildState = 'not-mainnet' | 'loading' | 'error' | 'verified' | 'not-verified';

/**
 * Presentational Verified Build badge — renders one state, no hooks. The whole value is a single
 * soft badge, on the tw `Badge`: `tone="soft"` reuses the same success/warning hues, and
 * `whitespace-normal` lets the label wrap in a narrow column.
 */
export function VerifiedBuildBadge({
    state,
    size = 'xs',
    href,
}: {
    state: VerifiedBuildState;
    size?: 'xs' | 'sm';
    /**
     * Where the verified/not-verified badge links. When it points at this program's verified-build tab
     * (the default from {@link VerifiedProgramBadge}) it stays in-app — the trust signal takes users
     * straight to that program's hashes, uploader, repo, verification command, and timestamp. Falls
     * back to the general verified-build docs when no program-specific path is supplied.
     */
    href?: string;
}) {
    if (state === 'loading') {
        // Skeleton stands in for the value text; the row height is held by the label's line-box.
        return (
            <span className="min-w-0 break-words">
                <Skeleton
                    data-testid="verified-build-loading"
                    className="relative -top-0.5 inline-block h-3.5 w-40 align-middle"
                />
            </span>
        );
    }
    if (state === 'not-mainnet') {
        return (
            <Badge
                className="relative -top-0.5 justify-start whitespace-normal text-left"
                size={size}
                tone="soft"
                ui="tw"
                variant="warning"
            >
                Verified Builds only available on Mainnet and Devnet
            </Badge>
        );
    }
    if (state === 'error') {
        return (
            <Badge
                className="relative -top-0.5 justify-start whitespace-normal text-left"
                size={size}
                tone="soft"
                ui="tw"
                variant="warning"
            >
                Error fetching verified build information
            </Badge>
        );
    }

    // verified / not-verified: the whole badge is a link. In-app to this program's verified-build tab
    // when a path is supplied (the trust signal points at the actual evidence); otherwise out to the
    // general docs, with a trailing external-link icon (the badge base sizes the svg + adds the gap).
    const variant = state === 'verified' ? 'success' : 'warning';
    const label = state === 'verified' ? 'Program Source Verified' : 'Program Not Verified';
    const isExternal = href === undefined;
    return (
        <Badge
            className="relative -top-0.5 cursor-pointer justify-start whitespace-normal text-left"
            size={size}
            tone="soft"
            ui="tw"
            variant={variant}
            asChild
        >
            {isExternal ? (
                <Link href={VERIFIED_BUILD_DOC_LINK} rel="noopener noreferrer" target="_blank">
                    {label}
                    <ExternalLink />
                </Link>
            ) : (
                <Link href={href}>{label}</Link>
            )}
        </Badge>
    );
}

export function VerifiedProgramBadge({
    programData,
    pubkey,
}: {
    programData: ProgramDataAccountInfo;
    pubkey: PublicKey;
}) {
    const { cluster } = useCluster();
    const {
        isLoading,
        data: isVerified,
        error,
    } = useIsProgramVerified({
        programData,
        programId: pubkey,
    });
    // Keep the trust signal pointing at this program's verified-build tab (hashes, uploader, repo,
    // verification command + timestamp) rather than generic docs.
    const verifiedBuildTabPath = useClusterPath({ pathname: `/address/${pubkey.toBase58()}/verified-build` });

    let state: VerifiedBuildState;
    if (!supportsVerifiedBuilds(cluster)) {
        state = 'not-mainnet';
    } else if (isLoading) {
        state = 'loading';
    } else if (error) {
        state = 'error';
    } else {
        state = isVerified ? 'verified' : 'not-verified';
    }

    return <VerifiedBuildBadge state={state} href={verifiedBuildTabPath} />;
}
