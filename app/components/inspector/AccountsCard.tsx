// Inspector Account List. It merges what used to be a standalone "SOL Balance Changes" table into the
// Account List as a "Change" column placed right before "Post Balance". The change values come from the
// simulation:
//   • before a run — the first row shows a small Simulate button in place of the value; every other row
//     shows a grey dash that turns into a Simulate button on row hover;
//   • after a run — each account shows its SOL balance delta (a grey dash if it did not change).
// On mobile each account renders as its own tappable card that opens a bottom detail drawer.
import { Address } from '@components/common/Address';
import { BalanceDelta } from '@components/common/BalanceDelta';
import { ErrorCard } from '@components/common/ErrorCard';
import { SolBalance } from '@components/common/SolBalance';
import { RawDataField } from '@components/shared/RawDataField';
import { cn } from '@components/shared/utils';
import { type AccountInfo, useAccountsInfo } from '@entities/account';
import { useAccountInfo, useAddressLookupTable, useFetchAccountInfo } from '@providers/accounts';
import { useCluster } from '@providers/cluster';
import { type PublicKey, type VersionedMessage } from '@solana/web3.js';
import { ClusterStatus } from '@utils/cluster';
import BN from 'bn.js';
import React, { useMemo } from 'react';
import { Code } from 'react-feather';

import { Badge } from '@/app/components/shared/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/app/components/shared/ui/popover';
import type { SolBalanceChange } from '@/app/features/instruction-simulation/lib/types';
import { useLastSimulatedAt } from '@/app/features/instruction-simulation/model/use-last-simulated-at';
import { type SimulationState } from '@/app/features/instruction-simulation/model/use-simulation';
import { LastSimulatedAtLabel } from '@/app/features/instruction-simulation/ui/LastSimulatedAt';
import { SimulateButton } from '@/app/features/instruction-simulation/ui/SimulateButton';
import { Section } from '@/app/features/transaction/ui/Section';

import { AccountDetailSlideover } from './AccountDetailSlideover';
import { AddressFromLookupTableWithContext } from './AddressWithContext';
import { LG_ONLY_CARD } from './inspector-table';

// Fallback for callers (isolated stories/tests) that don't own a simulation: the Change column then
// simply offers the Simulate affordance, which is a no-op until wired to a real run.
const IDLE_SIMULATION: SimulationState = { simulate: () => undefined, status: 'idle' };

// Shared 6-column track for the desktop (lg+) table: # / Address / Owner / Change / Post Balance / Size.
// The header row and every body row use the same columns so they stay aligned.
const COLS =
    'grid-cols-[minmax(auto,1.25rem)_1fr_minmax(auto,180px)_minmax(auto,140px)_minmax(auto,160px)_minmax(auto,110px)]';

// Desktop-only body row (lg+); the merged "Change" column sits between Owner and Post Balance. Below lg
// the row uses the mobile layout (AccountRowLayout).
const ROW_GRID_DESKTOP = cn(
    'hidden min-h-9 px-3 py-2.5 md:px-4 lg:grid',
    'items-start gap-x-5 whitespace-nowrap text-sm',
    "[grid-template-areas:'number_address_owned_change_balance_size']",
    COLS,
);

// Fixed-width per-row field label for the mobile layout.
const MOBILE_LABEL = 'w-16 shrink-0 text-outer-space-300';

// Header row (lg+ only).
const HEADER_GRID = cn(
    'hidden gap-5 px-3 py-2.5 md:px-4 lg:grid',
    COLS,
    'text-xs uppercase text-outer-space-300',
    'border-1 border-b border-white/10 [border-bottom-style:solid]',
);

export function AccountsCard({
    message,
    simulation: simulationProp,
}: {
    message: VersionedMessage;
    simulation?: SimulationState;
}) {
    const simulation = simulationProp ?? IDLE_SIMULATION;
    const { url } = useCluster();

    const pubkeys = useMemo(() => message.staticAccountKeys, [message.staticAccountKeys]);
    const { accounts, error: fetchError, loading } = useAccountsInfo(pubkeys, url);

    // Tracked here (a persistently-mounted host) so the header popover can show the last run's time even
    // though its own content mounts only while open.
    const simulatedAt = useLastSimulatedAt(simulation);

    // Index the simulated SOL balance changes by account so each row can look up its own delta.
    const changeByKey = React.useMemo(() => {
        const map = new Map<string, SolBalanceChange>();
        if (simulation.status === 'done') {
            for (const change of simulation.result.solBalanceChanges ?? []) {
                map.set(change.pubkey.toBase58(), change);
            }
        }
        return map;
    }, [simulation]);

    const { validMessage, error } = React.useMemo(() => {
        const { numRequiredSignatures, numReadonlySignedAccounts, numReadonlyUnsignedAccounts } = message.header;

        if (numReadonlySignedAccounts >= numRequiredSignatures) {
            return { error: 'Invalid header', validMessage: undefined };
        } else if (numReadonlyUnsignedAccounts >= message.staticAccountKeys.length) {
            return { error: 'Invalid header', validMessage: undefined };
        } else if (message.staticAccountKeys.length === 0) {
            return { error: 'Message has no accounts', validMessage: undefined };
        }

        return {
            error: undefined,
            validMessage: message,
        };
    }, [message]);

    const { accountRows } = React.useMemo(() => {
        const message = validMessage;
        if (!message) return { accountRows: undefined };
        const staticAccountRows = message.staticAccountKeys.map((publicKey, accountIndex) => {
            const { numRequiredSignatures, numReadonlySignedAccounts, numReadonlyUnsignedAccounts } = message.header;

            let readOnly = false;
            let signer = false;
            if (accountIndex < numRequiredSignatures) {
                signer = true;
                if (accountIndex >= numRequiredSignatures - numReadonlySignedAccounts) {
                    readOnly = true;
                }
            } else if (accountIndex >= message.staticAccountKeys.length - numReadonlyUnsignedAccounts) {
                readOnly = true;
            }

            const props = {
                accountIndex,
                accountInfo: accounts.get(publicKey.toBase58()),
                changeByKey,
                loading,
                publicKey,
                readOnly,
                signer,
                simulation,
            };

            return <AccountRow key={accountIndex} {...props} />;
        });

        let accountIndex = message.staticAccountKeys.length;
        const writableLookupTableRows = message.addressTableLookups.flatMap(lookup => {
            return lookup.writableIndexes.map(lookupTableIndex => {
                const props = {
                    accountIndex,
                    changeByKey,
                    lookupTableIndex,
                    lookupTableKey: lookup.accountKey,
                    readOnly: false,
                    simulation,
                };

                accountIndex += 1;
                return <AccountFromLookupTableRow key={accountIndex} {...props} />;
            });
        });

        const readonlyLookupTableRows = message.addressTableLookups.flatMap(lookup => {
            return lookup.readonlyIndexes.map(lookupTableIndex => {
                const props = {
                    accountIndex,
                    changeByKey,
                    lookupTableIndex,
                    lookupTableKey: lookup.accountKey,
                    readOnly: true,
                    simulation,
                };

                accountIndex += 1;
                return <AccountFromLookupTableRow key={accountIndex} {...props} />;
            });
        });

        return {
            accountRows: [...staticAccountRows, ...writableLookupTableRows, ...readonlyLookupTableRows],
        };
    }, [accounts, loading, validMessage, simulation, changeByKey]);

    const totalAccountSize = React.useMemo(
        () => Array.from(accounts.values()).reduce((acc, account) => acc + account.size, 0),
        [accounts],
    );

    if (fetchError) {
        return (
            <Section title="Account List" className="">
                <ErrorCard text="Failed to fetch accounts info" />
            </Section>
        );
    }

    if (error) {
        return <ErrorCard text={`Unable to display accounts. ${error}`} />;
    }

    return (
        <Section title="Account List" className={LG_ONLY_CARD}>
            <div className={HEADER_GRID}>
                <div>#</div>
                <div>Address</div>
                <div>Owner</div>
                <div className="flex items-center justify-end gap-1.5 text-right">
                    Change (SOL)
                    {/* "S" badge marks this as a simulation-derived column; hovering it opens a popover
                        with the Simulate control (and the last run's time once one has completed). */}
                    <SimulatedHeaderTag simulation={simulation} simulatedAt={simulatedAt} />
                </div>
                <div className="text-right">Post Balance (SOL)</div>
                <div className="text-right">Size</div>
            </div>
            {accountRows}
            {!loading && totalAccountSize > 0 && (
                <div className="py-3 text-sm text-outer-space-300 lg:ml-10 lg:px-4">
                    <div className="flex flex-col">
                        <div className="flex items-baseline gap-2">
                            <span>Total Account Size:</span>
                            <span className="text-white">{totalAccountSize.toLocaleString('en-US')} bytes</span>
                        </div>
                        <span className="text-xs">
                            Current data. This data may have been different at the time of the transaction.
                        </span>
                    </div>
                </div>
            )}
        </Section>
    );
}

function AccountRow({
    accountIndex,
    accountInfo,
    loading,
    publicKey,
    signer,
    readOnly,
    simulation,
    changeByKey,
}: {
    accountIndex: number;
    accountInfo: AccountInfo | undefined;
    loading: boolean;
    publicKey: PublicKey;
    signer: boolean;
    readOnly: boolean;
    simulation: SimulationState;
    changeByKey: Map<string, SolBalanceChange>;
}) {
    return (
        <AccountRowLayout
            index={accountIndex}
            pubkey={publicKey}
            addressSlot={<Address pubkey={publicKey} link />}
            simulation={simulation}
            changeByKey={changeByKey}
            badges={
                <>
                    {signer && (
                        <Badge ui="dashkit" variant="info">
                            Signer
                        </Badge>
                    )}
                    {!readOnly && (
                        <Badge ui="dashkit" variant="destructive">
                            Writable
                        </Badge>
                    )}
                </>
            }
            sizeSlot={<AccountDataSize accountInfo={accountInfo} loading={loading} address={publicKey.toBase58()} />}
        />
    );
}

function AccountFromLookupTableRow({
    accountIndex,
    lookupTableKey,
    lookupTableIndex,
    readOnly,
    simulation,
    changeByKey,
}: {
    accountIndex: number;
    lookupTableKey: PublicKey;
    lookupTableIndex: number;
    readOnly: boolean;
    simulation: SimulationState;
    changeByKey: Map<string, SolBalanceChange>;
}) {
    const lookupTableInfo = useAddressLookupTable(lookupTableKey.toBase58());
    const lookupTable = lookupTableInfo && lookupTableInfo[0];
    const pubkey =
        lookupTable && typeof lookupTable !== 'string' && lookupTableIndex < lookupTable.state.addresses.length
            ? lookupTable.state.addresses[lookupTableIndex]
            : undefined;

    return (
        <AccountRowLayout
            index={accountIndex}
            pubkey={pubkey}
            addressSlot={
                <AddressFromLookupTableWithContext
                    lookupTableKey={lookupTableKey}
                    lookupTableIndex={lookupTableIndex}
                    hideInfo
                    align="left"
                />
            }
            simulation={simulation}
            changeByKey={changeByKey}
            badges={
                <>
                    {!readOnly && (
                        <Badge ui="dashkit" variant="destructive">
                            Writable
                        </Badge>
                    )}
                    <Badge ui="dashkit" variant="gray">
                        Address Table Lookup
                    </Badge>
                </>
            }
        />
    );
}

// Zero delta reused for unchanged accounts after a run — BalanceDelta renders it as the "+0" badge.
const ZERO_DELTA = new BN(0);

function ChangeDash() {
    return <span className="text-outer-space-500">—</span>;
}

// The Change-column form of the shared Simulate button. Both variants are pinned to `!h-5` — the row's
// text line-height — so the button never grows the row taller than the plain dash/delta state (i.e. the
// row height doesn't jump between pre-run, hover and post-run). `table` is the tiny in-cell form;
// `drawer` keeps the same height with slightly larger, more legible text for the detail popup.
function ChangeSimulateButton({
    simulation,
    size = 'table',
}: {
    simulation: SimulationState;
    size?: 'table' | 'drawer';
}) {
    return (
        <SimulateButton
            simulation={simulation}
            size="compact"
            className={cn('!h-5 leading-none', size === 'drawer' ? 'px-2.5 !text-xs' : '!px-2 !text-[10px]')}
        />
    );
}

// The "S" column-header badge. Hovering it opens a popover holding the Simulate control, plus the
// "Simulated at …" line once a run has completed. It is a popover (not a tooltip) because the content is
// interactive; opening is driven by hover with a short close delay so the pointer can travel from the
// badge into the popover (which portals out of the header) without it snapping shut.
function SimulatedHeaderTag({ simulation, simulatedAt }: { simulation: SimulationState; simulatedAt?: Date }) {
    const [open, setOpen] = React.useState(false);
    const closeTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    const openNow = () => {
        if (closeTimer.current) clearTimeout(closeTimer.current);
        setOpen(true);
    };
    const closeSoon = () => {
        if (closeTimer.current) clearTimeout(closeTimer.current);
        closeTimer.current = setTimeout(() => setOpen(false), 120);
    };

    React.useEffect(() => () => void (closeTimer.current && clearTimeout(closeTimer.current)), []);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <span className="cursor-default" onMouseEnter={openNow} onMouseLeave={closeSoon}>
                    <Badge ui="dashkit" className="border-accent/50 border border-solid !text-[10px] text-accent">
                        S
                    </Badge>
                </span>
            </PopoverTrigger>
            <PopoverContent
                side="top"
                align="end"
                onMouseEnter={openNow}
                onMouseLeave={closeSoon}
                onOpenAutoFocus={e => e.preventDefault()}
                className="flex flex-col gap-2 p-3"
            >
                <ChangeSimulateButton simulation={simulation} />
                {simulatedAt && <LastSimulatedAtLabel at={simulatedAt} />}
            </PopoverContent>
        </Popover>
    );
}

// Change column cell. Post-run: the account's SOL delta (or a dash if unchanged). Pre-run behaviour
// depends on `mode`:
//   • 'table' (desktop rows): a dash that swaps to the Simulate button on row hover (the row wrapper
//     carries `group`; gated to mouse devices via `@media (hover: hover) and (pointer: fine)` so on touch,
//     where hover is emulated and would stick, the dash simply stays).
//   • 'plain' (mobile list summary): just the dash — the Simulate button is not shown in the list.
//   • 'action' (mobile detail drawer): a visible Simulate button, so a run can be started from there.
function ChangeCell({
    simulation,
    changeByKey,
    pubkey,
    mode = 'table',
}: {
    simulation: SimulationState;
    changeByKey: Map<string, SolBalanceChange>;
    pubkey?: PublicKey;
    mode?: 'table' | 'plain' | 'action';
}) {
    if (simulation.status === 'done') {
        const change = pubkey ? changeByKey.get(pubkey.toBase58()) : undefined;
        // Unchanged accounts render a "+0" delta badge, matching the transaction details page.
        return <BalanceDelta delta={change ? change.delta : ZERO_DELTA} isSol />;
    }

    if (mode === 'plain') return <ChangeDash />;
    if (mode === 'action') return <ChangeSimulateButton simulation={simulation} size="drawer" />;

    return (
        <>
            <span className="[@media(hover:hover)_and_(pointer:fine)]:group-hover:hidden">
                <ChangeDash />
            </span>
            <span className="hidden [@media(hover:hover)_and_(pointer:fine)]:group-hover:inline-flex">
                <ChangeSimulateButton simulation={simulation} />
            </span>
        </>
    );
}

// Shared presentational row. Reads the on-chain account state (owner + balance) from the accounts
// provider; renders the merged Change column from `simulation`/`changeByKey`; `sizeSlot` is the
// interactive size element.
function AccountRowLayout({
    index,
    pubkey,
    addressSlot,
    badges,
    simulation,
    changeByKey,
    sizeSlot,
}: {
    index: number;
    pubkey?: PublicKey;
    addressSlot: React.ReactNode;
    badges?: React.ReactNode;
    simulation: SimulationState;
    changeByKey: Map<string, SolBalanceChange>;
    sizeSlot?: React.ReactNode;
}) {
    const { account } = useInspectorAccountInfo(pubkey);
    // Mobile-only: tapping the row opens a bottom drawer with the account's full details.
    const [drawerOpen, setDrawerOpen] = React.useState(false);

    let ownedNode: React.ReactNode = null;
    let balanceNode: React.ReactNode = null;
    let sizeNode: React.ReactNode = sizeSlot;

    if (!account) {
        ownedNode = (
            <span className="text-outer-space-300">
                <span className="spinner-grow spinner-grow-sm mr-1.5"></span>
                Loading
            </span>
        );
    } else if (account.lamports === 0) {
        ownedNode = <span className="text-outer-space-300">Account doesn&apos;t exist</span>;
    } else {
        ownedNode = <Address pubkey={account.owner} link />;
        balanceNode = <SolBalance lamports={account.lamports} />;
        if (sizeNode == undefined && account.space !== undefined) {
            sizeNode = (
                <span className="text-outer-space-300">
                    {new Intl.NumberFormat('en-US').format(account.space)} bytes
                </span>
            );
        }
    }

    return (
        // Row divider is desktop-only; on mobile each entry is a standalone card instead.
        <div className="lg:border-1 group lg:border-b lg:border-white/10 lg:[border-bottom-style:solid] lg:last:border-b-0">
            {/* Mobile layout: a tappable card (address + badges, ordinal, change, balance). The card
                framing makes it clear the whole entry is tappable. Owner and size drop out here and move
                into the detail drawer, mirroring the TX page. Tapping anywhere opens the drawer. */}
            <div
                className={cn(
                    // Full-width like the other page cards (no horizontal inset), same dashkit surface
                    // (bg-dk-gray-800-dark + outer-space border); `mb-3` keeps the vertical gap between
                    // entries. Hidden at lg+ where rows form the table.
                    'mb-3 flex flex-col gap-1 rounded-lg border border-solid border-outer-space-800 bg-dk-gray-800-dark p-3 text-sm lg:hidden',
                    pubkey && 'cursor-pointer',
                )}
                onClick={() => pubkey && setDrawerOpen(true)}
            >
                <div className="flex items-start justify-between gap-2">
                    {/* `pointer-events-none` so a tap opens the drawer instead of following the address
                        link; the link is recoloured green to read as a plain value (matches the TX page). */}
                    <div className="pointer-events-none min-w-0 [&_a]:!text-[#33a382] [&_a]:!no-underline">
                        {addressSlot}
                        <span className="mt-1 flex flex-wrap items-center gap-1 empty:hidden">{badges}</span>
                    </div>
                    <span className="shrink-0 text-outer-space-300">{index + 1}</span>
                </div>
                <div className="flex items-start gap-2">
                    <span className={MOBILE_LABEL}>Change</span>
                    {/* `plain`: the list never shows the Simulate button — it lives in the drawer. */}
                    <span className="min-w-0">
                        <ChangeCell simulation={simulation} changeByKey={changeByKey} pubkey={pubkey} mode="plain" />
                    </span>
                </div>
                {balanceNode && (
                    <div className="flex items-start gap-2">
                        <span className={MOBILE_LABEL}>Balance</span>
                        <span className="min-w-0">{balanceNode}</span>
                    </div>
                )}
            </div>

            {/* Desktop layout (lg+): 6-column grid driven by the header. */}
            <div className={ROW_GRID_DESKTOP}>
                <div className="text-outer-space-300 [grid-area:number]">{index + 1}</div>
                <div className="min-w-0 [grid-area:address]">
                    {addressSlot}
                    <span className="mt-1 flex flex-wrap items-center gap-1 empty:hidden">{badges}</span>
                </div>
                <div className="justify-self-start [grid-area:owned]">{ownedNode}</div>
                <div className="justify-self-end [grid-area:change]">
                    <ChangeCell simulation={simulation} changeByKey={changeByKey} pubkey={pubkey} mode="table" />
                </div>
                <div className="justify-self-end [grid-area:balance]">{balanceNode}</div>
                <div className="justify-self-end [grid-area:size]">{sizeNode}</div>
            </div>

            {/* Mobile detail drawer (portaled; only reachable via the mobile summary's tap). Carries the
                same fields as the list — Owner, Change, Balance, Size — with the Simulate button living in
                its Change row (`mode="action"`). */}
            {pubkey && (
                <AccountDetailSlideover
                    open={drawerOpen}
                    onOpenChange={setDrawerOpen}
                    index={index}
                    pubkey={pubkey}
                    badges={badges}
                    ownerSlot={ownedNode}
                    changeSlot={
                        <ChangeCell simulation={simulation} changeByKey={changeByKey} pubkey={pubkey} mode="action" />
                    }
                    balanceSlot={balanceNode}
                    sizeSlot={sizeNode}
                />
            )}
        </div>
    );
}

// The interactive size element: shows the account's data size and, on click, opens the raw-data viewer
// (Hex / Base64 with copy and download) in a popover — the shared RawDataField used on the account and
// transaction pages.
function AccountDataSize({
    accountInfo,
    loading,
    address,
}: {
    accountInfo: AccountInfo | undefined;
    loading: boolean;
    address: string;
}) {
    if (loading) return <span className="text-outer-space-300">Loading...</span>;
    if (!accountInfo) return null;

    return (
        <Popover>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    className="inline-flex cursor-pointer appearance-none items-center gap-1 whitespace-nowrap border-0 bg-transparent p-0 text-outer-space-300 transition-colors hover:text-white"
                >
                    <Code size={11} />
                    <span>{accountInfo.size.toLocaleString('en-US')} bytes</span>
                </button>
            </PopoverTrigger>
            {/* RawDataField brings its own card chrome, so the popover wrapper is left transparent (its
                drop shadow is kept for depth). */}
            <PopoverContent align="end" className="w-auto !border-0 !bg-transparent p-0">
                <RawDataField data={accountInfo.data} filename={address} loading={loading} />
            </PopoverContent>
        </Popover>
    );
}

// Fetches on-chain account state (owner, balance, space) from the accounts provider.
function useInspectorAccountInfo(pubkey?: PublicKey) {
    const address = pubkey?.toBase58() ?? '';
    const fetchAccount = useFetchAccountInfo();
    const info = useAccountInfo(address);
    const { status } = useCluster();

    React.useEffect(() => {
        if (pubkey && !info && status === ClusterStatus.Connected) {
            fetchAccount(pubkey, 'skip');
        }
    }, [address, status]); // eslint-disable-line react-hooks/exhaustive-deps

    return { account: info?.data };
}
