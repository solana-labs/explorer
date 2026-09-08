import type { Meta, StoryObj } from '@storybook-config/types';
import React from 'react';

import { Switch } from '@/app/components/shared/ui/switch';

import { PageHeader } from '../PageHeader';
import { PageLayout } from '../PageLayout';
import { PageSections } from '../PageSections';

// Design-system layout primitives for a detail page (Transaction / Block / Account). Compose them:
// `PageLayout` is the shell, `PageSections` is the block rhythm, `PageHeader` is the eyebrow + title.
// All live in `@/app/shared/ui/page-layout` and are applied directly by the real pages — there is no
// separate constant to hand-wire.
const meta = {
    component: PageLayout,
    parameters: {
        docs: {
            description: {
                component: [
                    'Layout primitives for a detail page (Transaction / Block / Account).',
                    '',
                    '- `PageLayout` — the page shell: content max-width + horizontal/top padding. The wide',
                    '  values switch at `lg` (992px). It does not own the between-blocks rhythm.',
                    '- `PageSections` — the between-blocks vertical rhythm, as a stack that wraps the blocks.',
                    '- `PageHeader` — the eyebrow + title. `spacing="inline"` (default, transaction page) sits',
                    '  inside the rhythm and carries the negative margin that tightens it against the sticky',
                    '  tabs; `spacing="standalone"` (block page) sits above the rhythm and owns its own gap.',
                    '',
                    '## References',
                    '',
                    '- [Card](?path=/docs/components-shared-card-basecard--docs) — the block surface the example blocks stand in for.',
                    '- [PageContainer](?path=/docs/components-shared-pagecontainer--docs) — the Bootstrap-container replacement for list/legacy pages.',
                ].join('\n'),
            },
        },
        layout: 'fullscreen',
    },
    tags: ['autodocs'],
    title: 'Design System/Page Layout',
} satisfies Meta<typeof PageLayout>;

export default meta;
type Story = StoryObj<typeof meta>;

// A stand-in content block, matched to the detail-page card surface.
function Block({ children }: { children: React.ReactNode }) {
    return (
        <div className="rounded-xl border border-solid border-heavy-metal-950 bg-heavy-metal-800 px-6 py-8 text-sm text-neutral-200">
            {children}
        </div>
    );
}

// Reference: what each spacing token resolves to per tier. Documentation only — pages get these
// values by applying the components, never by reading this table.
const TIERS = [
    { key: 'mobile', label: 'Mobile', range: 'xs–md' },
    { key: 'desktop', label: 'Desktop', range: 'lg+' },
] as const;

const SPACING_REFERENCE: { name: string; label: string; values: Record<'mobile' | 'desktop', string> }[] = [
    { label: 'Page padding (horizontal)', name: 'px-4 lg:px-6', values: { desktop: '24px', mobile: '16px' } },
    { label: 'Before header (page top)', name: 'pt-3 lg:pt-5', values: { desktop: '20px', mobile: '12px' } },
    { label: 'Eyebrow → title', name: 'gap-1.5', values: { desktop: '6px', mobile: '6px' } },
    { label: 'Between blocks', name: 'space-y-9 lg:space-y-12', values: { desktop: '48px', mobile: '36px' } },
];

// The transaction-page shape: the header sits inside <PageSections> as the first block (inline
// spacing), so it participates in the rhythm. This is the common case.
export const Default: Story = {
    render: () => (
        <div className="min-h-screen bg-heavy-metal-900 py-8">
            <PageLayout>
                <PageSections>
                    <PageHeader eyebrow="Details" title="Transaction" />
                    <Block>Summary</Block>
                    <Block>Accounts</Block>
                    <Block>Instructions</Block>
                </PageSections>
            </PageLayout>
        </div>
    ),
};

// The block-page shape: the header sits above <PageSections> (standalone spacing) and owns its own
// gap to the first section.
export const StandaloneHeader: Story = {
    render: () => (
        <div className="min-h-screen bg-heavy-metal-900 py-8">
            <PageLayout>
                <PageHeader eyebrow="Details" spacing="standalone" title="Block" />
                <PageSections>
                    <Block>Overview</Block>
                    <Block>Transactions</Block>
                </PageSections>
            </PageLayout>
        </div>
    ),
};

// `width="full"` spans the parent instead of capping at max-w-5xl.
export const FullWidth: Story = {
    render: () => (
        <div className="min-h-screen bg-heavy-metal-900 py-8">
            <PageLayout width="full">
                <PageSections>
                    <PageHeader eyebrow="width=full" title="Full-width column" />
                    <Block>Spans the parent instead of capping at max-w-5xl.</Block>
                </PageSections>
            </PageLayout>
        </div>
    ),
};

// The per-tier spacing reference table for design hand-off.
function ReferenceView() {
    return (
        <div className="min-h-screen bg-heavy-metal-900 py-8">
            <div className="mx-auto w-full max-w-5xl px-4">
                <h2 className="m-0 mb-3 text-xs font-medium uppercase tracking-wide text-outer-space-300">
                    Page spacing — per tier
                </h2>
                <div className="overflow-x-auto rounded-lg border border-solid border-outer-space-800">
                    <table className="w-full border-collapse text-sm text-white">
                        <thead>
                            <tr className="text-left text-xs uppercase text-outer-space-300">
                                <th className="px-3 py-2 font-normal">Spacing</th>
                                <th className="px-3 py-2 font-normal">Class</th>
                                {TIERS.map(t => (
                                    <th key={t.key} className="px-3 py-2 font-normal">
                                        {t.label} ({t.range})
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {SPACING_REFERENCE.map(s => (
                                <tr key={s.name} className="border-t border-solid border-outer-space-800">
                                    <td className="px-3 py-2">{s.label}</td>
                                    <td className="px-3 py-2 font-mono text-outer-space-300">{s.name}</td>
                                    {TIERS.map(t => (
                                        <td key={t.key} className="px-3 py-2 font-mono">
                                            {s.values[t.key]}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

export const Reference: Story = {
    render: () => <ReferenceView />,
};

// Live example with an outline overlay toggle, so the block boxes and the gaps between them are
// visible without altering the real layout.
function AnnotatedView() {
    const [outline, setOutline] = React.useState(true);
    const ring = outline ? 'outline outline-1 outline-dashed outline-accent/50' : '';
    return (
        <div className="min-h-screen bg-heavy-metal-900 py-8">
            <div className="mx-auto mb-6 flex w-full max-w-5xl items-center gap-3 px-4">
                <Switch aria-label="Show layout outlines" checked={outline} onCheckedChange={setOutline} />
                <span className="select-none text-sm text-white">Show layout outlines</span>
            </div>
            <PageLayout className={ring}>
                <PageSections className={ring}>
                    <PageHeader className={ring} eyebrow="Details" title="Transaction" />
                    <div className={ring}>
                        <Block>Summary</Block>
                    </div>
                    <div className={ring}>
                        <Block>Accounts</Block>
                    </div>
                </PageSections>
            </PageLayout>
        </div>
    );
}

export const Annotated: Story = {
    render: () => <AnnotatedView />,
};
