import { Address } from '@components/common/Address';
import { SolBalance } from '@components/common/SolBalance';
import { RawDataField } from '@components/shared/RawDataField';
import type { Account } from '@providers/accounts';

import { KeyValue } from '@/app/shared/ui/key-value';

export type BaseRawAccountRowsProps = {
    account: Account;
    rawData?: Uint8Array;
    isLoading: boolean;
};

export function BaseRawAccountRows({ account, rawData, isLoading }: BaseRawAccountRowsProps) {
    return (
        <>
            <KeyValue label="Address">
                <Address pubkey={account.pubkey} raw />
            </KeyValue>
            <KeyValue label="Balance (SOL)">
                <SolBalance lamports={account.lamports} />
            </KeyValue>
            <KeyValue label="Assigned Program Id">
                <Address pubkey={account.owner} link />
            </KeyValue>
            {account.space !== undefined && <KeyValue label="Allocated Data Size">{account.space} byte(s)</KeyValue>}
            <KeyValue label="Executable">{account.executable ? 'Yes' : 'No'}</KeyValue>
            <KeyValue label="Raw Data">
                <RawDataField data={rawData} filename={account.pubkey.toBase58()} loading={isLoading} />
            </KeyValue>
        </>
    );
}
