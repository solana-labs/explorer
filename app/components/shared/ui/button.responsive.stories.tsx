import { INITIAL_VIEWPORTS, withViewportFromGlobal } from '@storybook-config/responsive-decorators';
import type { Meta, StoryObj } from '@storybook-config/types';
import { ChevronDown, Download, RefreshCw, X } from 'react-feather';

import { Button } from './button';

// Shows how dashkit buttons wrap and float against each other at different viewports.
// Mirrors the real usage patterns (card-header toolbars, "Load More" footers, dropdown triggers).
const meta = {
    component: Button,
    decorators: [withViewportFromGlobal],
    parameters: {
        docs: { story: { height: INITIAL_VIEWPORTS.iphonex.styles.height } },
        viewport: { options: INITIAL_VIEWPORTS },
    },
    tags: ['autodocs', 'test'],
    title: 'Components/Shared/Button@Media',
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

const ToolbarRow = () => (
    <div className="rounded-dk border border-solid border-outer-space-800 bg-dk-gray-800-dark p-3">
        <h3 className="mb-2 text-dk-sm text-dk-gray-700">Card-header toolbar</h3>
        <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-auto text-dk-h4 font-medium">Program Account</span>
            <Button ui="dashkit" variant="white" size="sm">
                <RefreshCw className="mr-1.5 align-text-top" size={13} /> Refresh
            </Button>
            <Button ui="dashkit" variant="white" size="sm">
                <Download className="mr-1.5" size={13} /> Download
            </Button>
            <Button ui="dashkit" variant="outline-danger" size="sm">
                <X className="mr-1.5" size={13} /> Remove
            </Button>
        </div>
    </div>
);

const ToggleRow = () => (
    <div className="rounded-dk border border-solid border-outer-space-800 bg-dk-gray-800-dark p-3">
        <h3 className="mb-2 text-dk-sm text-dk-gray-700">Toggle group</h3>
        <div className="flex flex-wrap gap-1.5">
            <Button ui="dashkit" variant="black" active size="sm">
                30m
            </Button>
            <Button ui="dashkit" variant="white" size="sm">
                2h
            </Button>
            <Button ui="dashkit" variant="white" size="sm">
                6h
            </Button>
            <Button ui="dashkit" variant="white" size="sm">
                24h
            </Button>
        </div>
    </div>
);

const FooterRow = () => (
    <div className="rounded-dk border border-solid border-outer-space-800 bg-dk-gray-800-dark p-3">
        <h3 className="mb-2 text-dk-sm text-dk-gray-700">Footer (full-width Load More)</h3>
        <Button ui="dashkit" variant="primary" className="w-full">
            Load More
        </Button>
    </div>
);

const DropdownTriggerRow = () => (
    <div className="rounded-dk border border-solid border-outer-space-800 bg-dk-gray-800-dark p-3">
        <h3 className="mb-2 text-dk-sm text-dk-gray-700">Dropdown triggers</h3>
        <div className="flex flex-wrap gap-1.5">
            <Button ui="dashkit" variant="dark" size="sm" className="w-[150px]">
                Creators <ChevronDown size={15} className="align-text-top" />
            </Button>
            <Button ui="dashkit" variant="white" size="sm">
                Filter: All <ChevronDown className="align-text-top" size={13} />
            </Button>
        </div>
    </div>
);

const ModalFooterRow = () => (
    <div className="rounded-dk border border-solid border-outer-space-800 bg-dk-gray-800-dark p-3">
        <h3 className="mb-2 text-dk-sm text-dk-gray-700">Modal-style action row</h3>
        <div className="flex justify-between gap-1.5">
            <Button ui="dashkit" variant="outline-danger" size="sm">
                Remove
            </Button>
            <div className="flex gap-1.5">
                <Button ui="dashkit" variant="secondary" size="sm">
                    Cancel
                </Button>
                <Button ui="dashkit" variant="primary" size="sm">
                    Save
                </Button>
            </div>
        </div>
    </div>
);

const Showcase = () => (
    <div className="flex flex-col gap-3">
        <ToolbarRow />
        <ToggleRow />
        <DropdownTriggerRow />
        <FooterRow />
        <ModalFooterRow />
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
