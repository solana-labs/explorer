import { Address } from '@components/common/Address';
import { AddressWithContext, programValidator } from '@components/inspector/AddressWithContext';
import { PublicKey } from '@solana/web3.js';

import { BaseTable } from '@/app/shared/ui/Table';

type ProgramFieldProps = {
    programId: PublicKey;
    showExtendedInfo?: boolean;
    /** For a card whose table is wider than two columns, so the row still reaches the right edge. */
    colSpan?: number;
};

export function ProgramField({ programId, showExtendedInfo = false, colSpan }: ProgramFieldProps) {
    return (
        <BaseTable.Row>
            <BaseTable.Cell>Program</BaseTable.Cell>
            <BaseTable.Cell className="text-right" colSpan={colSpan}>
                {showExtendedInfo ? (
                    <AddressWithContext pubkey={programId} validator={programValidator} />
                ) : (
                    <Address pubkey={programId} alignRight link />
                )}
            </BaseTable.Cell>
        </BaseTable.Row>
    );
}
