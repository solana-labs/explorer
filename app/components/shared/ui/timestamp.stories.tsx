import type { Meta, StoryObj } from '@storybook-config/types';
import { expect, screen, userEvent, within } from 'storybook/test';

import { Label, Row, Value } from '@/app/components/shared/ui/detail-row';
import { cn } from '@/app/components/shared/utils';

import { Timestamp } from './timestamp';
import { setPinnedTimestampDisplay } from './use-timestamp-display';

// 06:41:51 Aug 06, 2026 (UTC) — the values from the reference design.
const unixTimestamp = 1785998511;

const meta: Meta<typeof Timestamp> = {
    argTypes: {
        display: { control: 'inline-radio', options: ['relative', 'local', 'utc', 'unix'] },
        unixTimestamp: { control: 'number' },
    },
    // The pinned representation is shared, persisted state — reset it so stories don't leak into each other.
    beforeEach: () => {
        setPinnedTimestampDisplay(undefined);
    },
    component: Timestamp,
    tags: ['autodocs', 'test'],
    title: 'Components/Shared/Timestamp',
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    args: { unixTimestamp },
};

// Opens the dropdown and asserts the three copyable rows are present.
export const OpenDropdown: Story = {
    args: { unixTimestamp },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(canvas.getByRole('button'));
        // PopoverContent portals to document.body, so query the screen rather than the canvas.
        expect(await screen.findByText('UTC')).toBeInTheDocument();
        expect(screen.getByText('Local')).toBeInTheDocument();
        expect(screen.getByText('Unix Timestamp')).toBeInTheDocument();
        expect(screen.getByText(String(unixTimestamp))).toBeInTheDocument();
    },
};

// A faithful slice of the transaction Overview card, built from the card's own Row/Label/Value
// primitives (app/components/shared/ui/detail-row.tsx) so it stays in sync with production —
// with the two legacy "Timestamp (Local)" / "Timestamp (UTC)" rows collapsed into a single
// clickable Timestamp. Rendered here to check the fit — especially on mobile.
function TransactionOverviewSlice({ unixTimestamp: ts }: { unixTimestamp: number }) {
    return (
        <div className="max-w-xl overflow-hidden rounded-lg border border-solid border-outer-space-800">
            <Row divider>
                <Label>Signature</Label>
                <Value>5Nf3xW8pQ7mKd2rBvLhTq9YzJ4cHs6UgAe1oPnR8tXwVbM3kD7yFjZ2uNqW5aCgE9iShL4rT6xUvB1nYmK</Value>
            </Row>
            <Row divider>
                <Label>Block</Label>
                <Value>312049876</Value>
            </Row>
            <Row divider>
                <Label>Timestamp</Label>
                <Value>
                    <Timestamp unixTimestamp={ts} />
                </Value>
            </Row>
            <Row>
                <Label>Fee</Label>
                <Value>0.000005 SOL</Value>
            </Row>
        </div>
    );
}

// How the component sits inside the transaction Overview table.
export const InTransactionOverview: Story = {
    args: { unixTimestamp },
    render: ({ unixTimestamp: ts }) => <TransactionOverviewSlice unixTimestamp={ts} />,
};

const MIN = 60;
const HOUR = 3600;
const DAY = 86400;

// A fixed reference "now" shared by every row below — passed as `referenceMs` so the relative
// labels are deterministic (no live clock, no ±1s flicker) and each row lands squarely in its band.
const REFERENCE_MS = unixTimestamp * 1000;

// One representative age (seconds into the past) per relative-time band in displayTimestampRelative.
const BANDS: { note: string; offset: number }[] = [
    { note: '< 1 min → seconds', offset: 25 },
    { note: '< 10 min → minutes + seconds', offset: 3 * MIN + 20 },
    { note: '10 min – 1 h → minutes', offset: 25 * MIN },
    { note: '1 – 8 h → hours + minutes', offset: 3 * HOUR + 15 * MIN },
    { note: '8 – 48 h → hours', offset: 20 * HOUR },
    { note: '48 h – 12 d → days + hours', offset: 5 * DAY + 4 * HOUR },
    { note: '12 – 30 d → days', offset: 20 * DAY },
    { note: '30 – 365 d → months + days', offset: 100 * DAY },
    { note: '1 – 3 y → years + months', offset: 400 * DAY },
    { note: '> 3 y → years', offset: 4 * 365 * DAY },
];

// One date per relative-time band, so every granularity (seconds … years) is visible at once.
export const RelativeTimeBands: Story = {
    render: () => (
        <div className="flex max-w-xl flex-col overflow-hidden rounded-lg border border-solid border-outer-space-800">
            {BANDS.map((band, index) => (
                <div
                    key={band.note}
                    className={cn(
                        'flex items-start justify-between gap-4 px-4 py-3',
                        index < BANDS.length - 1 && 'border-b border-solid border-white/10',
                    )}
                >
                    <span className="text-sm text-outer-space-300">{band.note}</span>
                    <Timestamp
                        unixTimestamp={unixTimestamp - band.offset}
                        display="relative"
                        referenceMs={REFERENCE_MS}
                    />
                </div>
            ))}
        </div>
    ),
};
