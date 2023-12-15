import { Address } from '@components/common/Address';
import { useFetchAccountInfo, useMintAccountInfo, useTokenAccountInfo } from '@providers/accounts';
import { ParsedInstruction, ParsedTransaction, PublicKey, SignatureResult } from '@solana/web3.js';
import { normalizeTokenAmount } from '@utils/index';
import { ParsedInfo } from '@validators/index';
import React from 'react';
import { create } from 'superstruct';
import useSWR from 'swr';

import { useCluster } from '@/app/providers/cluster';
import { Cluster } from '@/app/utils/cluster';
import { TOKEN_IDS } from '@/app/utils/programs';
import { getTokenInfo, getTokenInfoSwrKey } from '@/app/utils/token-info';

import { InstructionCard } from '../InstructionCard';
import { IX_STRUCTS, IX_TITLES, TokenAmountUi, TokenInstructionType } from './types';

type DetailsProps = {
    tx: ParsedTransaction;
    ix: ParsedInstruction;
    result: SignatureResult;
    index: number;
    innerCards?: JSX.Element[];
    childIndex?: number;
};

export function TokenDetailsCard(props: DetailsProps) {
    const parsed = create(props.ix.parsed, ParsedInfo);
    const { type: rawType, info } = parsed;
    const type = create(rawType, TokenInstructionType);
    const title = `${TOKEN_IDS[props.ix.programId.toString()]}: ${IX_TITLES[type]}`;
    const created = create(info, IX_STRUCTS[type] as any);
    return <TokenInstruction title={title} info={created} {...props} />;
}

type InfoProps = {
    ix: ParsedInstruction;
    info: any;
    result: SignatureResult;
    index: number;
    title: string;
    innerCards?: JSX.Element[];
    childIndex?: number;
};

async function fetchTokenInfo([_, address, cluster, url]: ['get-token-info', string, Cluster, string]) {
    return await getTokenInfo(new PublicKey(address), cluster, url);
}

function TokenInstruction(props: InfoProps) {
    const { mintAddress: infoMintAddress, tokenAddress } = React.useMemo(() => {
        let mintAddress: string | undefined;
        let tokenAddress: string | undefined;

        // No sense fetching accounts if we don't need to convert an amount
        if (!('amount' in props.info)) return {};

        if ('mint' in props.info && props.info.mint instanceof PublicKey) {
            mintAddress = props.info.mint.toBase58();
        } else if ('account' in props.info && props.info.account instanceof PublicKey) {
            tokenAddress = props.info.account.toBase58();
        } else if ('source' in props.info && props.info.source instanceof PublicKey) {
            tokenAddress = props.info.source.toBase58();
        }
        return {
            mintAddress,
            tokenAddress,
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const tokenInfo = useTokenAccountInfo(tokenAddress);
    const mintAddress = infoMintAddress || tokenInfo?.mint.toBase58();
    const mintInfo = useMintAccountInfo(mintAddress);
    const fetchAccountInfo = useFetchAccountInfo();

    React.useEffect(() => {
        if (tokenAddress && !tokenInfo) {
            fetchAccountInfo(new PublicKey(tokenAddress), 'parsed');
        }
    }, [fetchAccountInfo, tokenAddress]); // eslint-disable-line react-hooks/exhaustive-deps

    React.useEffect(() => {
        if (mintAddress && !mintInfo) {
            fetchAccountInfo(new PublicKey(mintAddress), 'parsed');
        }
    }, [fetchAccountInfo, mintAddress]); // eslint-disable-line react-hooks/exhaustive-deps

    const { cluster, url } = useCluster();
    const { data: tokenDetails } = useSWR(
        mintAddress ? getTokenInfoSwrKey(mintAddress, cluster, url) : null,
        fetchTokenInfo
    );

    const attributes: JSX.Element[] = [];
    let decimals = mintInfo?.decimals;
    let tokenSymbol = '';

    if ('tokenAmount' in props.info) {
        decimals = props.info.tokenAmount.decimals;
    }

    if (mintAddress) {
        if (tokenDetails) {
            tokenSymbol = tokenDetails.symbol;
        }

        attributes.push(
            <tr key={mintAddress}>
                <td>Token</td>
                <td className="text-lg-end">
                    <Address pubkey={new PublicKey(mintAddress)} alignRight link fetchTokenLabelInfo />
                </td>
            </tr>
        );
    }

    for (let key in props.info) {
        let value = props.info[key];
        if (value === undefined) continue;

        // Flatten lists of public keys
        if (Array.isArray(value) && value.every(v => v instanceof PublicKey)) {
            for (let i = 0; i < value.length; i++) {
                const publicKey = value[i];
                const label = `${key.charAt(0).toUpperCase() + key.slice(1)} - #${i + 1}`;

                attributes.push(
                    <tr key={key + i}>
                        <td>{label}</td>
                        <td className="text-lg-end">
                            <Address pubkey={publicKey} alignRight link />
                        </td>
                    </tr>
                );
            }
            continue;
        }

        if (key === 'tokenAmount') {
            key = 'amount';
            value = (value as TokenAmountUi).amount;
        }

        let tag;
        let labelSuffix = '';
        if (value instanceof PublicKey) {
            tag = <Address pubkey={value} alignRight link />;
        } else if (key === 'amount') {
            let amount;
            if (decimals === undefined) {
                labelSuffix = ' (raw)';
                amount = new Intl.NumberFormat('en-US').format(value);
            } else {
                amount = new Intl.NumberFormat('en-US', {
                    maximumFractionDigits: decimals,
                    minimumFractionDigits: decimals,
                }).format(normalizeTokenAmount(value, decimals));
            }
            tag = (
                <>
                    {amount} {tokenSymbol}
                </>
            );
        } else {
            tag = <>{value}</>;
        }

        const label = key.charAt(0).toUpperCase() + key.slice(1) + labelSuffix;

        attributes.push(
            <tr key={key}>
                <td>{label}</td>
                <td className="text-lg-end">{tag}</td>
            </tr>
        );
    }

    return (
        <InstructionCard
            ix={props.ix}
            index={props.index}
            result={props.result}
            title={props.title}
            innerCards={props.innerCards}
            childIndex={props.childIndex}
        >
            {attributes}
        </InstructionCard>
    );
}
