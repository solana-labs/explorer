import { Address } from '@components/common/Address';
import { SolBalance } from '@components/common/SolBalance';
import { CollapsibleSection } from '@components/shared/ui/collapsible-section';
import type { BlockData } from '@entities/block-data';
import type { Reward } from '@solana/kit';
import React from 'react';

import {
    GridHeaderRow,
    LoadMoreButton,
    type ResponsiveCell,
    ResponsiveGridRow,
    TIGHT_CARD,
} from '@/app/components/block/shared';
import { Card } from '@/app/shared/ui/Card';

const PAGE_SIZE = 10;

const HEADERS = [
    { label: 'Address' },
    { label: 'Type' },
    { label: 'Amount' },
    { label: 'Post Balance' },
    { label: '% Change' },
];

// Address takes the slack (`1fr`); the numeric columns are capped so long balances can't squeeze the
// address column to nothing. Header and rows share this template so columns stay aligned. Inline (not a
// `grid-cols-[…]` class) so the Storybook JIT can't purge it.
const GRID_TEMPLATE: React.CSSProperties = {
    gridTemplateColumns: 'minmax(0,1fr) minmax(auto,4rem) minmax(auto,6.5rem) minmax(auto,8.5rem) minmax(auto,7.5rem)',
};

// Share of the pre-reward balance that this reward moved.
function percentChange(reward: Reward): string | undefined {
    if (!reward.postBalance) {
        return undefined;
    }
    const preBalance = reward.postBalance - reward.lamports;
    if (preBalance === 0n) return undefined;

    const precision = 1_000_000_000n;
    const absoluteLamports = reward.lamports < 0n ? -reward.lamports : reward.lamports;
    const absolutePreBalance = preBalance < 0n ? -preBalance : preBalance;
    const scaledPercent = (absoluteLamports * 100n * precision) / absolutePreBalance;
    const whole = scaledPercent / precision;
    const fraction = (scaledPercent % precision).toString().padStart(9, '0');
    return `${whole}.${fraction}%`;
}

export function BlockRewardsCard({ block }: { block: BlockData }) {
    const [displayed, setDisplayed] = React.useState(PAGE_SIZE);

    if (!block.rewards || block.rewards.length < 1) {
        return null;
    }

    const rewards = block.rewards;
    const visible = rewards.slice(0, displayed);

    return (
        <CollapsibleSection title="Block Rewards" className="">
            <Card variant="tight" className={TIGHT_CARD}>
                <div className="text-sm text-white">
                    <GridHeaderRow headers={HEADERS} style={GRID_TEMPLATE} rightAlignFrom={2} />

                    {visible.map(reward => {
                        const pct = percentChange(reward);
                        const cells: ResponsiveCell[] = [
                            {
                                children: <Address address={reward.pubkey} link />,
                                desktopClassName: 'min-w-0',
                                key: 'address',
                                label: 'Address',
                            },
                            { children: reward.rewardType, key: 'type', label: 'Type' },
                            {
                                children: <SolBalance lamports={reward.lamports} />,
                                desktopClassName: 'text-right',
                                key: 'amount',
                                label: 'Amount',
                            },
                            {
                                children: reward.postBalance ? <SolBalance lamports={reward.postBalance} /> : '-',
                                desktopClassName: 'text-right',
                                key: 'postBalance',
                                label: 'Post Balance',
                            },
                            {
                                children: pct ?? '-',
                                desktopClassName: 'break-all text-right',
                                key: 'pctChange',
                                label: '% Change',
                                mobile: <span className="break-all">{pct ?? '-'}</span>,
                            },
                        ];
                        return (
                            <ResponsiveGridRow
                                key={reward.pubkey + reward.rewardType}
                                cells={cells}
                                gridStyle={GRID_TEMPLATE}
                            />
                        );
                    })}

                    {rewards.length > displayed && <LoadMoreButton onClick={() => setDisplayed(d => d + PAGE_SIZE)} />}
                </div>
            </Card>
        </CollapsibleSection>
    );
}
