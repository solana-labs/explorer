import { ExternalLink as ExternalLinkIcon } from 'react-feather';

import { Badge } from '@/app/components/shared/ui/badge';
import { ExternalLink } from '@/app/components/shared/ui/external-link';
import { cn } from '@/app/components/shared/utils';
import { BaseTable } from '@/app/shared/ui/Table';

import type { SecurityTxtVersion } from './types';
import { isValidLink, parseCodeValue } from './utils';

export function CodeCell({ value, alignRight = true }: { value: string; alignRight: boolean }) {
    return (
        <BaseTable.Cell>
            <RenderCode value={value} alignRight={alignRight} />
        </BaseTable.Cell>
    );
}

export function SecurityTxtVersionBadge({
    version,
    className,
}: React.HTMLAttributes<unknown> & { version: SecurityTxtVersion }) {
    return (
        <Badge ui="dashkit" variant="info" className={className} data-testid="security-txt-version-badge">
            <SecurityTxtVersionBadgeTitle version={version} />
        </Badge>
    );
}

export function SecurityTxtVersionBadgeTitle({ version }: { version: SecurityTxtVersion }) {
    if (version === 'neodyme') {
        return <>Neodyme</>;
    }
    if (version === 'pmp') {
        return <>Program Metadata</>;
    }

    return null;
}

export function ContactInfo({ type, information }: { type: string; information: string }) {
    switch (type.toLowerCase()) {
        case 'discord':
            return <>Discord: {information}</>;
        case 'email':
            // Raw anchor on purpose: `ExternalLink` allows only http(s), so it would drop this link
            // entirely. The scheme is a literal here, so `information` cannot introduce a new one.
            return (
                <a rel="noopener noreferrer" target="_blank" href={`mailto:${information}`}>
                    {information}
                    <ExternalLinkIcon className="ml-1.5 align-text-top" size={13} />
                </a>
            );
        case 'telegram':
            return (
                <ExternalLink href={`https://t.me/${information}`}>
                    Telegram: {information}
                    <ExternalLinkIcon className="ml-1.5 align-text-top" size={13} />
                </ExternalLink>
            );
        case 'twitter':
            return (
                <ExternalLink href={`https://twitter.com/${information}`}>
                    Twitter {information}
                    <ExternalLinkIcon className="ml-1.5 align-text-top" size={13} />
                </ExternalLink>
            );
        case 'link':
            if (isValidLink(information)) {
                return (
                    <ExternalLink href={information}>
                        {information}
                        <ExternalLinkIcon className="ml-1.5 align-text-top" size={13} />
                    </ExternalLink>
                );
            }
            return <>{information}</>;
        case 'other':
        default:
            return (
                <>
                    {type}: {information}
                </>
            );
    }
}

export function RenderExternalLink({ url }: { url: string }) {
    return (
        <span className="font-mono">
            <ExternalLink href={url}>
                {url}
                <ExternalLinkIcon className="ml-1.5 align-text-top" size={13} />
            </ExternalLink>
        </span>
    );
}

export function ExternalLinkCell({ url }: { url: string }) {
    return (
        <BaseTable.Cell className="text-right">
            <RenderExternalLink url={url} />
        </BaseTable.Cell>
    );
}

export function StringCell({ value }: { value: string }) {
    return <BaseTable.Cell className="text-right font-mono">{value}</BaseTable.Cell>;
}

export function RenderCode({ value, alignRight = true }: { value: any; alignRight?: boolean }) {
    return (
        <div className="flex items-end">
            <pre className={cn('max-w-[500px] overflow-x-auto', { 'lg:ml-auto': alignRight })}>
                {parseCodeValue(value)}
            </pre>
        </div>
    );
}
