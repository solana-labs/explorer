import { Button } from '@components/shared/ui/button';
import { DialogClose, DialogTitle } from '@components/shared/ui/dialog';
import type { AccountInfo } from '@entities/account';
import type { ParsedMessage, ParsedMessageAccount } from '@solana/web3.js';
import { useClusterPath } from '@utils/url';
import Link from 'next/link';
import React, { useState } from 'react';
import { ExternalLink, X } from 'react-feather';

import { EditIcon, NicknameEditor, useNickname } from '@/app/features/nicknames';
import { CopyButton } from '@/app/shared/ui/CopyButton';
import { Drawer } from '@/app/shared/ui/drawer';

import { AccountBadges } from './AccountBadges';
import { AccountExpandedContent } from './AccountExpandedContent';

type Props = {
    account: ParsedMessageAccount;
    accountInfo?: AccountInfo;
    accountInfoLoading: boolean;
    index: number;
    message: ParsedMessage;
    onOpenChange: (open: boolean) => void;
    open: boolean;
};

export function AccountDetailDrawer({
    account,
    accountInfo,
    accountInfoLoading,
    index,
    message,
    onOpenChange,
    open,
}: Props) {
    const pubkey = account.pubkey;
    const address = pubkey.toBase58();
    const nickname = useNickname(address);
    const [nicknameOpen, setNicknameOpen] = useState(false);
    const addressPath = useClusterPath({ pathname: `/address/${address}` });
    const handleOpenChange = (nextOpen: boolean) => {
        if (!nextOpen) setNicknameOpen(false);
        onOpenChange(nextOpen);
    };
    const handleEscapeKeyDown = (event: KeyboardEvent) => {
        if (!nicknameOpen) return;

        // NicknameEditor uses Escape to cancel editing. Prevent Radix from also
        // dismissing the parent sheet from its capture-phase document listener.
        event.preventDefault();
    };

    const header = (
        <Drawer.Header>
            <div className="min-w-0 flex-1">
                <DialogTitle className="mb-1.5 tracking-wide !text-outer-space-300">Account {index + 1}</DialogTitle>
                <div className="break-all font-mono text-xl leading-snug text-white">{nickname ?? address}</div>
                {nickname && <span className="break-all text-sm text-outer-space-300">{address}</span>}
            </div>
            <div className="flex flex-wrap gap-1">
                <AccountBadges index={index} account={account} message={message} pubkey={pubkey} />
            </div>
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
                <div className="overflow-x-hidden py-2">
                    <AccountExpandedContent
                        accountInfo={accountInfo}
                        accountInfoLoading={accountInfoLoading}
                        address={address}
                        enabled={open}
                        flat
                    />
                </div>
            </Drawer>
            <NicknameEditor address={address} open={nicknameOpen} onClose={() => setNicknameOpen(false)} />
        </>
    );
}
