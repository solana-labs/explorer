import { TableCardBodyProps } from '@components/common/TableCardBody';
import { useRawAccountDataOnMount } from '@entities/account';
import type { Account } from '@providers/accounts';

import { BaseAccountCard } from '@/app/shared/ui/BaseAccountCard';
import { BaseRawAccountRows } from '@/app/shared/ui/BaseRawAccountRows';

import { AccountDownloadDropdown } from './AccountDownloadDropdown';

type AccountCardProps = TableCardBodyProps & {
    title: React.ReactNode;
    account: Account;
    refresh?: () => void;
    showRawButton?: boolean;
    analyticsSection?: string;
    /** Render the title + actions as a section header above the card instead of in CardHeader. */
    headerOutside?: boolean;
};

// FIXME: missing Storybook story — RawAccountRows uses useRawAccountDataOnMount (SWR); visuals already covered by BaseAccountCard + RawAccountRows stories.
export function AccountCard({ account, children, ...rest }: AccountCardProps) {
    return (
        <BaseAccountCard
            rawContent={<RawAccountRows account={account} />}
            headerActions={<AccountDownloadDropdown pubkey={account.pubkey} space={account.space} />}
            {...rest}
        >
            {children}
        </BaseAccountCard>
    );
}

function RawAccountRows({ account }: { account: Account }) {
    const { data, isLoading } = useRawAccountDataOnMount(account.pubkey);

    return <BaseRawAccountRows account={account} rawData={data} isLoading={isLoading} />;
}
