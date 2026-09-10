import { TableCardBody } from '@components/common/TableCardBody';
import { CollapsibleCard } from '@components/shared/ui/collapsible-card';
import { ProgramField } from '@entities/instruction-card';
import { useScrollAnchor } from '@providers/scroll-anchor';
import { TransactionInstruction } from '@solana/web3.js';

import { Badge } from '@/app/components/shared/ui/badge';
import { BaseTable } from '@/app/shared/ui/Table';
import getInstructionCardScrollAnchorId from '@/app/utils/get-instruction-card-scroll-anchor-id';

import { BaseRawDetails } from '../common/BaseRawDetails';

export function UnknownDetailsCard({
    index,
    childIndex,
    ix,
    programName,
    innerCards,
}: {
    index: number;
    childIndex?: number;
    ix: TransactionInstruction;
    programName: string;
    innerCards?: React.ReactNode[];
}) {
    const scrollAnchorRef = useScrollAnchor(
        getInstructionCardScrollAnchorId(childIndex === undefined ? [index + 1] : [index + 1, childIndex + 1]),
    );

    return (
        <CollapsibleCard
            ref={scrollAnchorRef}
            defaultExpanded={false}
            title={
                <span className="flex min-w-0 flex-1 items-center">
                    <Badge ui="dashkit" variant="info" className="mr-1.5 flex-none">
                        #{index + 1}
                        {childIndex !== undefined ? `.${childIndex + 1}` : ''}
                    </Badge>
                    <span className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
                        {programName}
                    </span>
                    <span className="ml-1.5 flex-none">Instruction</span>
                </span>
            }
        >
            <TableCardBody>
                <ProgramField programId={ix.programId} showExtendedInfo />
                <BaseRawDetails ix={ix} />
                {innerCards && innerCards.length > 0 && (
                    <>
                        <BaseTable.Row className="bg-dark-background text-dk-xs font-semibold uppercase tracking-[0.08em] text-dark-muted-foreground">
                            <BaseTable.Cell colSpan={3}>Inner Instructions</BaseTable.Cell>
                        </BaseTable.Row>
                        <BaseTable.Row>
                            <BaseTable.Cell colSpan={3}>
                                <div>{innerCards}</div>
                            </BaseTable.Cell>
                        </BaseTable.Row>
                    </>
                )}
            </TableCardBody>
        </CollapsibleCard>
    );
}
