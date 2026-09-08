// Mobile drawer for an account row. On mobile, tapping an account row opens a bottom slideover showing
// the SAME fields as the list (Owner, Change, Post Balance, Size) plus quick actions. The top holds only
// the address and its tags; the fields sit below. The Change row carries the Simulate button (a run can
// be started from the drawer) — the list itself never shows it. Reuses the app's Slideover primitive so
// the chrome matches the transaction details page. Fields are passed in as pre-rendered nodes so the
// drawer stays agnostic of how each is produced (owner/balance come from the accounts provider, size is
// the interactive raw-data element, etc.).
import type { PublicKey } from '@solana/web3.js';
import { useClusterPath } from '@utils/url';
import Link from 'next/link';
import React from 'react';
import { CheckCircle, Copy, ExternalLink, X } from 'react-feather';

import { Button } from '@/app/components/shared/ui/button';
import {
    Slideover,
    SlideoverBody,
    SlideoverClose,
    SlideoverContent,
    SlideoverTitle,
} from '@/app/components/shared/ui/slideover';
import { EditIcon, NicknameEditor, useNickname } from '@/app/features/nicknames';
import { useCopyToClipboard } from '@/app/shared/lib/useCopyToClipboard';

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

export function AccountDetailSlideover({
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
    const [copyState, copy] = useCopyToClipboard(1500);
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

    return (
        <>
            <Slideover open={open} onOpenChange={handleOpenChange}>
                <SlideoverContent
                    aria-describedby={undefined}
                    className="border-t border-white/10 !bg-dk-gray-800-dark [border-top-style:solid]"
                    onEscapeKeyDown={handleEscapeKeyDown}
                >
                    <div className="space-y-1.5 p-4">
                        <div className="min-w-0 flex-1">
                            <SlideoverTitle className="mb-1.5 tracking-wide !text-outer-space-300">
                                Account {index + 1}
                            </SlideoverTitle>
                            <div className="break-all font-mono text-xl leading-snug text-white">
                                {nickname ?? address}
                            </div>
                            {nickname && <span className="break-all text-sm text-outer-space-300">{address}</span>}
                        </div>
                        {badges && <div className="flex flex-wrap gap-1">{badges}</div>}
                    </div>

                    {/* Change carries the Simulate button pre-run; the other fields mirror the list. */}
                    <SlideoverBody className="border-t border-white/10 py-2 [border-top-style:solid]">
                        <div className="flex flex-col gap-1.5 pb-2.5 pt-1">
                            {ownerSlot && <DrawerField label="Owner">{ownerSlot}</DrawerField>}
                            <DrawerField label="Change (SOL)">{changeSlot}</DrawerField>
                            {balanceSlot && <DrawerField label="Post Balance (SOL)">{balanceSlot}</DrawerField>}
                            {sizeSlot && <DrawerField label="Size">{sizeSlot}</DrawerField>}
                        </div>
                    </SlideoverBody>

                    <div className="flex shrink-0 gap-2 border-t border-white/10 px-3 pb-6 pt-3 [border-top-style:solid]">
                        <Button className="w-1/4" onClick={() => setNicknameOpen(true)} size="tile" variant="outline">
                            <EditIcon width={16} />
                            Nickname
                        </Button>
                        <Button className="w-1/4" onClick={() => copy(address)} size="tile" variant="outline">
                            {copyState === 'copied' ? <CheckCircle size={16} /> : <Copy size={16} />}
                            Copy
                        </Button>
                        <Button asChild className="w-1/4" size="tile" variant="accent">
                            <Link href={addressPath} target="_blank">
                                <ExternalLink size={16} />
                                Open
                            </Link>
                        </Button>
                        <SlideoverClose asChild>
                            <Button className="w-1/4" size="tile" variant="outline">
                                <X size={16} />
                                Close
                            </Button>
                        </SlideoverClose>
                    </div>
                </SlideoverContent>
            </Slideover>
            <NicknameEditor address={address} open={nicknameOpen} onClose={() => setNicknameOpen(false)} />
        </>
    );
}
