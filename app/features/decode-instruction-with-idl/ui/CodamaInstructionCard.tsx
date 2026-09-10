import { parseInstruction } from '@codama/dynamic-parsers';
import { isSignerRole, isWritableRole } from '@solana/kit';
import { PublicKey, SignatureResult, TransactionInstruction } from '@solana/web3.js';

import { Address } from '@/app/components/common/Address';
import { mapCodamaIxArgsToRows } from '@/app/components/instruction/codama/codamaUtils';
import { InstructionCard } from '@/app/components/instruction/InstructionCard';
import { UnknownDetailsCard } from '@/app/components/instruction/UnknownDetailsCard';
import { Badge } from '@/app/components/shared/ui/badge';
import { BaseTable } from '@/app/shared/ui/Table';

export function CodamaInstructionCard({
    ix,
    result,
    index,
    childIndex,
    innerCards,
    parsedIx,
}: {
    ix: TransactionInstruction;
    result: SignatureResult;
    index: number;
    childIndex?: number;
    innerCards?: JSX.Element[];
    parsedIx: ReturnType<typeof parseInstruction>;
}) {
    if (parsedIx?.path[0].kind !== 'rootNode') {
        return (
            <UnknownDetailsCard ix={ix} result={result} index={index} childIndex={childIndex} innerCards={innerCards} />
        );
    }
    const rawProgramName = parsedIx?.path[0].program.name;
    const programName = rawProgramName.charAt(0).toUpperCase() + rawProgramName.slice(1);
    const lastNode = parsedIx?.path[parsedIx?.path.length - 1];
    if (lastNode.kind !== 'instructionNode') {
        return (
            <UnknownDetailsCard ix={ix} result={result} index={index} childIndex={childIndex} innerCards={innerCards} />
        );
    }
    const instructionName = lastNode.name;
    const ixTitle = `${programName}: ${instructionName.charAt(0).toUpperCase() + instructionName.slice(1)}`;

    const accounts = parsedIx?.accounts;

    const accountDetails = [];
    for (let i = 0; i < accounts.length; i++) {
        const account = accounts[i];
        const isWritable = isWritableRole(account.role);
        const isSigner = isSignerRole(account.role);
        let accountName = `Account ${i + 1}`;
        if (account.name) {
            accountName = account.name.charAt(0).toUpperCase() + account.name.slice(1);
        }

        accountDetails.push(
            <BaseTable.Row key={i}>
                <BaseTable.Cell>
                    <div className="mr-1.5 md:inline">{accountName}</div>
                    {isWritable && (
                        <Badge ui="dashkit" variant="destructive" className="mr-[3px]">
                            Writable
                        </Badge>
                    )}
                    {isSigner && (
                        <Badge ui="dashkit" variant="info" className="mr-[3px]">
                            Signer
                        </Badge>
                    )}
                </BaseTable.Cell>
                <BaseTable.Cell className="text-right" colSpan={2}>
                    <Address pubkey={new PublicKey(account.address)} alignRight link />
                </BaseTable.Cell>
            </BaseTable.Row>,
        );
    }

    // `mapCodamaIxArgsToRows` drops the discriminator (and option/enum markers), so a discriminator-only
    // instruction (e.g. Close) yields no rows — don't render the Argument table header in that case.
    const argRows = parsedIx.data ? mapCodamaIxArgsToRows(parsedIx.data) : [];
    const hasArgs = argRows.some(Boolean);

    return (
        <InstructionCard
            title={ixTitle}
            ix={ix}
            result={result}
            index={index}
            childIndex={childIndex}
            innerCards={innerCards}
        >
            <BaseTable.Row>
                <BaseTable.Cell>Program</BaseTable.Cell>
                <BaseTable.Cell className="text-right" colSpan={2}>
                    <Address pubkey={new PublicKey(ix.programId)} alignRight link raw overrideText={programName} />
                </BaseTable.Cell>
            </BaseTable.Row>
            {accountDetails.length > 0 && (
                <BaseTable.Row className="bg-dark-background text-dk-xs font-semibold uppercase tracking-[0.08em] text-dark-muted-foreground">
                    <BaseTable.Cell>Account Name</BaseTable.Cell>
                    <BaseTable.Cell className="text-right" colSpan={2}>
                        Address
                    </BaseTable.Cell>
                </BaseTable.Row>
            )}
            {accountDetails}
            {hasArgs && (
                <>
                    <BaseTable.Row className="bg-dark-background text-dk-xs font-semibold uppercase tracking-[0.08em] text-dark-muted-foreground">
                        <BaseTable.Cell>Argument Name</BaseTable.Cell>
                        <BaseTable.Cell>Type</BaseTable.Cell>
                        <BaseTable.Cell className="text-right">Value</BaseTable.Cell>
                    </BaseTable.Row>
                    {argRows}
                </>
            )}
        </InstructionCard>
    );
}
