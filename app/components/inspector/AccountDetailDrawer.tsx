// Mobile drawer for an account row. On mobile, tapping an account row opens a bottom drawer showing
// the SAME fields as the list (Owner, Change, Post Balance, Size) plus quick actions. The top holds only
// the address and its tags; the fields sit below. The Change row carries the Simulate button (a run can
// be started from the drawer) — the list itself never shows it. Reuses the app's Drawer primitive so
// the chrome matches the transaction details page. Fields are passed in as pre-rendered nodes so the
// drawer stays agnostic of how each is produced (owner/balance come from the accounts provider, size is
// the interactive raw-data element, etc.).
import type { PublicKey } from '@solana/web3.js';
import { useClusterPath } from '@utils/url';
import Link from 'next/link';
import React from 'react';
import { ExternalLink, X } from 'react-feather';

import { Button } from '@/app/components/shared/ui/button';
import { DialogClose, DialogTitle } from '@/app/components/shared/ui/dialog';
import { EditIcon, NicknameEditor, useNickname } from '@/app/features/nicknames';
import { CopyButton } from '@/app/shared/ui/CopyButton';
import { Drawer } from '@/app/shared/ui/drawer';

// A label | value row in the drawer body — mirrors the tx page's DetailRow (AccountExpandedLayout).
// Vertical rhythm comes from the parent's `flex flex-col gap-1.5`, so the row carries no own padding.
function DrawerField({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="grid grid-cols-[clamp(100px,25%,200px)_1fr] items-baseline gap-2 px-4">
            <div className="text-sm text-outer-space-300">{label}</div>
            <div className="min-w-0 break-words text-sm text-white">{children}</div>
        </div>
    );
}

export function AccountDetailDrawer({
    open,
    onOpenChange,
    index,
    pubkey,
    badges,
    ownerSlot,
    changeSlot,
    balanceSlot,
    sizeSlot,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    index: number;
    pubkey: PublicKey;
    badges?: React.ReactNode;
    ownerSlot?: React.ReactNode;
    changeSlot: React.ReactNode;
    balanceSlot?: React.ReactNode;
    sizeSlot?: React.ReactNode;
}) {
    const address = pubkey.toBase58();
    const nickname = useNickname(address);
    const [nicknameOpen, setNicknameOpen] = React.useState(false);
    const addressPath = useClusterPath({ pathname: `/address/${address}` });

    const handleOpenChange = (next: boolean) => {
        // Closing the drawer should also dismiss the nickname editor it may have opened.
        if (!next) setNicknameOpen(false);
        onOpenChange(next);
    };
    const handleEscapeKeyDown = (event: KeyboardEvent) => {
        // NicknameEditor uses Escape to cancel editing; keep that from also closing the drawer.
        if (nicknameOpen) event.preventDefault();
    };

    const header = (
        <Drawer.Header>
            <div className="min-w-0 flex-1">
                <DialogTitle className="mb-1.5 tracking-wide !text-outer-space-300">Account {index + 1}</DialogTitle>
                <div className="break-all font-mono text-xl leading-snug text-white">{nickname ?? address}</div>
                {nickname && <span className="break-all text-sm text-outer-space-300">{address}</span>}
            </div>
            {badges && <div className="flex flex-wrap gap-1">{badges}</div>}
        </Drawer.Header>
    );

    const footer = (
        <Drawer.Footer>
            <Button className="flex-1" onClick={() => setNicknameOpen(true)} size="tile" variant="outline">
                <EditIcon width={16} />
                Nickname
            </Button>
            <CopyButton value={address} noun="address" size="tile" flash className="flex-1">
                Copy
            </CopyButton>
            <Button asChild className="flex-1" size="tile" variant="accent">
                <Link href={addressPath} target="_blank">
                    <ExternalLink size={16} />
                    Open
                </Link>
            </Button>
            <DialogClose asChild>
                <Button className="flex-1" size="tile" variant="outline">
                    <X size={16} />
                    Close
                </Button>
            </DialogClose>
        </Drawer.Footer>
    );

    return (
        <>
            <Drawer
                open={open}
                onOpenChange={handleOpenChange}
                onEscapeKeyDown={handleEscapeKeyDown}
                aria-describedby={undefined}
                header={header}
                footer={footer}
            >
                {/* Change carries the Simulate button pre-run; the other fields mirror the list. */}
                <div className="flex flex-col gap-1.5 py-2.5">
                    {ownerSlot && <DrawerField label="Owner">{ownerSlot}</DrawerField>}
                    <DrawerField label="Change (SOL)">{changeSlot}</DrawerField>
                    {balanceSlot && <DrawerField label="Post Balance (SOL)">{balanceSlot}</DrawerField>}
                    {sizeSlot && <DrawerField label="Size">{sizeSlot}</DrawerField>}
                </div>
            </Drawer>
            <NicknameEditor address={address} open={nicknameOpen} onClose={() => setNicknameOpen(false)} />
        </>
    );
}
