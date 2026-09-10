import { INITIAL_VIEWPORTS, withViewportFromGlobal } from '@storybook-config/responsive-decorators';
import type { Meta, StoryObj } from '@storybook-config/types';

import { BaseTable } from '@/app/shared/ui/Table';

import { Badge } from './badge';

// Shows how dashkit badges wrap and float at different viewports. Mirrors the real usage:
// in-table status pills, inline meta tags next to addresses, header pills, and dense inline groups.
const meta = {
    component: Badge,
    decorators: [withViewportFromGlobal],
    parameters: {
        docs: { story: { height: INITIAL_VIEWPORTS.iphonex.styles.height } },
        viewport: { options: INITIAL_VIEWPORTS },
    },
    tags: ['autodocs', 'test'],
    title: 'Components/Shared/Badge@Media',
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

const TableRow = () => (
    <div className="rounded-dk border border-solid border-outer-space-800 bg-dk-gray-800-dark p-3">
        <h3 className="mb-2 text-dk-sm text-dk-gray-700">In-table status (parent 13px → badge ≈10px)</h3>
        <BaseTable ui="dashkit" variant="card" nowrap>
            <BaseTable.Head>
                <BaseTable.Row>
                    <BaseTable.HeaderCell>Slot</BaseTable.HeaderCell>
                    <BaseTable.HeaderCell>Result</BaseTable.HeaderCell>
                </BaseTable.Row>
            </BaseTable.Head>
            <BaseTable.Body>
                <BaseTable.Row>
                    <BaseTable.Cell>123456789</BaseTable.Cell>
                    <BaseTable.Cell>
                        <Badge ui="dashkit" variant="success">
                            Success
                        </Badge>
                    </BaseTable.Cell>
                </BaseTable.Row>
                <BaseTable.Row>
                    <BaseTable.Cell>123456790</BaseTable.Cell>
                    <BaseTable.Cell>
                        <Badge ui="dashkit" variant="warning">
                            Failed
                        </Badge>
                    </BaseTable.Cell>
                </BaseTable.Row>
            </BaseTable.Body>
        </BaseTable>
    </div>
);

const InlineMetaRow = () => (
    <div className="rounded-dk border border-solid border-outer-space-800 bg-dk-gray-800-dark p-3">
        <h3 className="mb-2 text-dk-sm text-dk-gray-700">Inline meta tags (wrap)</h3>
        <div className="flex flex-col gap-2">
            <div>
                Account #1
                <span className="ml-1.5">
                    <Badge ui="dashkit" variant="info" className="mr-[3px]">
                        Fee Payer
                    </Badge>
                    <Badge ui="dashkit" variant="info" className="mr-[3px]">
                        Signer
                    </Badge>
                    <Badge ui="dashkit" variant="destructive" className="mr-[3px]">
                        Writable
                    </Badge>
                    <Badge ui="dashkit" variant="warning" className="mr-[3px]">
                        Program
                    </Badge>
                    <Badge ui="dashkit" variant="gray">
                        Address Table Lookup
                    </Badge>
                </span>
            </div>
        </div>
    </div>
);

const HeaderPillsRow = () => (
    <div className="rounded-dk border border-solid border-outer-space-800 bg-dk-gray-800-dark p-3">
        <h3 className="mb-2 text-dk-sm text-dk-gray-700">Header pills (solid, e.g. NFT metadata)</h3>
        <div className="flex flex-wrap gap-1.5">
            <Badge ui="dashkit" variant="dark" tone="solid">
                Compressed
            </Badge>
            <Badge ui="dashkit" variant="dark" tone="solid">
                Mutable
            </Badge>
            <Badge ui="dashkit" variant="dark" tone="solid">
                Master Edition
            </Badge>
            <Badge ui="dashkit" variant="dark" tone="solid">
                Verified Collection
            </Badge>
            <Badge ui="dashkit" variant="dark" tone="solid">
                Primary Market
            </Badge>
        </div>
    </div>
);

const StatusToggleRow = () => (
    <div className="rounded-dk border border-solid border-outer-space-800 bg-dk-gray-800-dark p-3">
        <h3 className="mb-2 text-dk-sm text-dk-gray-700">Feature activation status (solid)</h3>
        <div className="flex flex-wrap gap-1.5">
            <Badge ui="dashkit" variant="success" tone="solid">
                Active on mainnet-beta
            </Badge>
            <Badge ui="dashkit" variant="warning" tone="solid">
                Pending activation on testnet
            </Badge>
        </div>
    </div>
);

const TitleBadgeRow = () => (
    <div className="rounded-dk border border-solid border-outer-space-800 bg-dk-gray-800-dark p-3">
        <h3 className="mb-2 text-dk-sm text-dk-gray-700">Title with leading index badge (truncation)</h3>
        <div className="flex min-w-0 items-center">
            <Badge ui="dashkit" variant="info" className="mr-1.5 flex-none">
                #3
            </Badge>
            <span className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
                Some Very Long Program Name That Will Truncate On Mobile Layouts
            </span>
            <span className="ml-1.5 flex-none">Instruction</span>
        </div>
    </div>
);

const Showcase = () => (
    <div className="flex flex-col gap-3">
        <TableRow />
        <InlineMetaRow />
        <HeaderPillsRow />
        <StatusToggleRow />
        <TitleBadgeRow />
    </div>
);

export const Mobile: Story = {
    globals: { viewport: { value: 'iphonex' } },
    render: () => <Showcase />,
};

export const TabletPortrait: Story = {
    globals: { viewport: { value: 'ipad' } },
    render: () => <Showcase />,
};

export const TabletLandscape: Story = {
    globals: { viewport: { isRotated: true, value: 'ipad' } },
    render: () => <Showcase />,
};
