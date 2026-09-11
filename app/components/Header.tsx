import { AccountHeader } from '@components/account/AccountHeader';
import { isTokenProgramData } from '@providers/accounts';
import { type ComponentProps, useMemo } from 'react';

import { TokenMarketData, useTokenMarketData } from '@/app/features/token-market-data';
import { TokenVerificationBadge, type VerificationTarget } from '@/app/features/token-verification-badge';
import { toKitAddress } from '@/app/shared/lib/web3js-compat';
import { isNativeMint, isTokenMintByOwner } from '@/app/shared/model/token-program';

type HeaderProps = ComponentProps<typeof AccountHeader>;

export function Header({ address, account, tokenInfo, isTokenInfoLoading }: HeaderProps) {
    const parsedData = account?.data.parsed;
    // isTokenProgramData + parsed.type check gonna be replaced with isTokenMintByOwner(owner, data) at some point
    const isTokenMint =
        !isNativeMint(address) &&
        parsedData &&
        isTokenProgramData(parsedData) &&
        parsedData?.parsed.type === 'mint' &&
        isTokenMintByOwner(toKitAddress(account.owner), account.data.raw);

    const marketData = useTokenMarketData(address, !!isTokenMint);

    const verificationTarget: VerificationTarget = useMemo(
        () => ({
            address,
            isTokenMint: !!isTokenMint,
            solflareVerified: tokenInfo && 'verified' in tokenInfo ? tokenInfo.verified : undefined,
        }),
        [address, isTokenMint, tokenInfo],
    );

    return (
        <div className="mb-9 lg:mb-12">
            <div className="flex flex-col items-start gap-4 pb-3 pt-2 lg:flex-row lg:items-end lg:justify-between lg:gap-1">
                <AccountHeader
                    address={address}
                    account={account}
                    tokenInfo={tokenInfo}
                    isTokenInfoLoading={isTokenInfoLoading}
                />
                {isTokenMint && (
                    <div className="flex w-full flex-col gap-1 sm:items-start sm:gap-2 md:w-auto md:flex-row">
                        <TokenVerificationBadge target={verificationTarget} isTokenInfoLoading={isTokenInfoLoading} />
                        <TokenMarketData marketData={marketData} />
                    </div>
                )}
            </div>
        </div>
    );
}
