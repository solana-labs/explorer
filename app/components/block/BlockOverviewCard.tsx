import { Address } from '@components/common/Address';
import { Copyable } from '@components/common/Copyable';
import { Epoch } from '@components/common/Epoch';
import { ExternalLinkWarning } from '@components/common/ExternalLinkWarning';
import { Slot } from '@components/common/Slot';
import { cn } from '@components/shared/utils';
import type { BlockWithV1 } from '@entities/block-data';
import { summarizeBlockComputeUnits } from '@entities/compute-unit';
import { useCluster } from '@providers/cluster';
import { PublicKey } from '@solana/web3.js';
import { IBRL_EXPLORER_URL } from '@utils/env';
import { ExternalLink } from 'react-feather';

import { Label, Row, Value } from '@/app/components/shared/ui/detail-row';
import { Timestamp } from '@/app/components/shared/ui/timestamp';
import { Card } from '@/app/shared/ui/Card';

type BlockOverviewCardProps = {
    block: BlockWithV1;
    slot: number;
    epoch: bigint | undefined;
    blockLeader?: PublicKey;
    childSlot?: number;
    childLeader?: PublicKey;
    parentLeader?: PublicKey;
    className?: string;
};

export function BlockOverviewCard({
    block,
    slot,
    epoch,
    blockLeader,
    childSlot,
    childLeader,
    parentLeader,
    className,
}: BlockOverviewCardProps) {
    const { cluster } = useCluster();

    const {
        consumed: totalCUs,
        requested: totalRequestedCUs,
        cost: totalCostUnits,
        max: maxComputeUnits,
    } = summarizeBlockComputeUnits({ block, cluster, epoch });

    const showSuccessfulCount = block.transactions.every(tx => tx.meta !== null);
    const successfulTxs = block.transactions.filter(tx => tx.meta?.err === null);

    return (
        <section className={cn('flex flex-col gap-3', className)}>
            <div className="flex items-center justify-between">
                <h2 className="m-0 text-lg font-normal text-white">Overview</h2>
                {IBRL_EXPLORER_URL && (
                    <ExternalLinkWarning href={`${IBRL_EXPLORER_URL}/block/${slot}`}>
                        <>
                            <ExternalLink className="me-2 align-text-top" size={13} />
                            IBRL Explorer
                        </>
                    </ExternalLinkWarning>
                )}
            </div>
            <Card ui="dashkit">
                <Row divider>
                    <Label>Blockhash</Label>
                    <Value className="flex w-full min-w-0 items-baseline">
                        <Copyable text={block.blockhash}>
                            <span className="min-w-0 break-all">{block.blockhash}</span>
                        </Copyable>
                    </Value>
                </Row>
                <Row divider>
                    <Label>Slot</Label>
                    <Value className="flex w-full min-w-0 items-baseline">
                        <Copyable text={String(slot)}>
                            <Slot slot={slot} />
                        </Copyable>
                    </Value>
                </Row>
                {blockLeader !== undefined && (
                    <Row divider>
                        <Label>Slot Leader</Label>
                        <Value>
                            <Address pubkey={blockLeader} link noTruncate />
                        </Value>
                    </Row>
                )}
                <Row divider>
                    <Label>Timestamp</Label>
                    <Value mono={false}>
                        {block.blockTime ? <Timestamp unixTimestamp={block.blockTime} /> : 'Unavailable'}
                    </Value>
                </Row>
                {epoch !== undefined && (
                    <Row divider>
                        <Label>Epoch</Label>
                        <Value>
                            <Epoch epoch={epoch} link />
                        </Value>
                    </Row>
                )}
                <Row divider>
                    <Label>Parent Blockhash</Label>
                    <Value className="flex w-full min-w-0 items-baseline">
                        <Copyable text={block.previousBlockhash}>
                            <span className="min-w-0 break-all">{block.previousBlockhash}</span>
                        </Copyable>
                    </Value>
                </Row>
                <Row divider>
                    <Label>Parent Slot</Label>
                    <Value>
                        <Slot slot={block.parentSlot} link />
                    </Value>
                </Row>
                {parentLeader !== undefined && (
                    <Row divider>
                        <Label>Parent Slot Leader</Label>
                        <Value>
                            <Address pubkey={parentLeader} link noTruncate />
                        </Value>
                    </Row>
                )}
                {childSlot !== undefined && (
                    <Row divider>
                        <Label>Child Slot</Label>
                        <Value>
                            <Slot slot={childSlot} link />
                        </Value>
                    </Row>
                )}
                {childLeader !== undefined && (
                    <Row divider>
                        <Label>Child Slot Leader</Label>
                        <Value>
                            <Address pubkey={childLeader} link noTruncate />
                        </Value>
                    </Row>
                )}
                <Row divider>
                    <Label>Processed Transactions</Label>
                    <Value mono={false}>{block.transactions.length}</Value>
                </Row>
                {showSuccessfulCount && (
                    <Row divider>
                        <Label>Successful Transactions</Label>
                        <Value mono={false}>{successfulTxs.length}</Value>
                    </Row>
                )}
                <Row divider>
                    <Label>Total CUs Consumed</Label>
                    <Value mono={false}>{totalCUs.toLocaleString()}</Value>
                </Row>
                <Row divider>
                    <Label>Transaction Cost Utilization</Label>
                    <Value mono={false} breakAll={false}>
                        {totalCostUnits.toLocaleString()} / {maxComputeUnits.toLocaleString()}{' '}
                        <span className="text-outer-space-300">
                            ({Math.round((totalCostUnits / maxComputeUnits) * 100)}%)
                        </span>
                    </Value>
                </Row>
                <Row>
                    <Label>Reserved Compute Units</Label>
                    <Value mono={false} breakAll={false}>
                        {totalRequestedCUs.toLocaleString()} / {maxComputeUnits.toLocaleString()}{' '}
                        <span className="text-outer-space-300">
                            ({Math.round((totalRequestedCUs / maxComputeUnits) * 100)}%)
                        </span>
                    </Value>
                </Row>
            </Card>
        </section>
    );
}
