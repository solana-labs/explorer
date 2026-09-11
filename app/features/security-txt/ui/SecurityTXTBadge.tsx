import { PublicKey } from '@solana/web3.js';
import { useClusterPath } from '@utils/url';
import Link from 'next/link';
import { ExternalLink } from 'react-feather';

import { Badge } from '@/app/components/shared/ui/badge';

import { NO_SECURITY_TXT_ERROR } from '../lib/constants';
import { useSecurityTxt } from '../model/useSecurityTxt';

export function ProgramSecurityTXTBadge({ programPubkey }: { programPubkey: PublicKey }) {
    const securityTabPath = useClusterPath({ pathname: `/address/${programPubkey.toBase58()}/security` });
    const { securityTxt, isLoading } = useSecurityTxt(programPubkey.toBase58());

    if (isLoading) {
        return <></>;
    }

    const maybeError = securityTxt ? undefined : NO_SECURITY_TXT_ERROR;
    return <SecurityTXTBadge error={maybeError} href={securityTabPath} />;
}

// Presentational Security.txt badge — the whole value is a single soft badge, on the tw `Badge`.
// With an error it shows the error text itself; otherwise "Included" links to the security tab.
// `whitespace-normal` lets a long error wrap in a narrow column.
export function SecurityTXTBadge({ error, href, size = 'xs' }: { error?: string; href: string; size?: 'xs' | 'sm' }) {
    if (error) {
        return (
            <Badge
                className="relative -top-0.5 justify-start whitespace-normal text-left"
                size={size}
                tone="soft"
                ui="tw"
                variant="warning"
            >
                {error}
            </Badge>
        );
    }

    return (
        <Badge
            className="relative -top-0.5 cursor-pointer justify-start whitespace-normal text-left"
            size={size}
            tone="soft"
            ui="tw"
            variant="success"
            asChild
        >
            <Link href={href} rel="noopener noreferrer" target="_blank">
                Included
                <ExternalLink />
            </Link>
        </Badge>
    );
}
