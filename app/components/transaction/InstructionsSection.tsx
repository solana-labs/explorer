import { ErrorCard } from '@components/common/ErrorCard';
import { LoadingCard } from '@components/common/LoadingCard';
import { isAddressLookupTableInstruction } from '@components/instruction/address-lookup-table/types';
import { AddressLookupTableDetailsCard } from '@components/instruction/AddressLookupTableDetailsCard';
import { AssociatedTokenDetailsCard } from '@components/instruction/associated-token/AssociatedTokenDetailsCard';
import { BpfLoaderDetailsCard } from '@components/instruction/bpf-loader/BpfLoaderDetailsCard';
import { BpfUpgradeableLoaderDetailsCard } from '@components/instruction/bpf-upgradeable-loader/BpfUpgradeableLoaderDetailsCard';
import { ComputeBudgetDetailsCard } from '@components/instruction/ComputeBudgetDetailsCard';
import { MangoDetailsCard } from '@components/instruction/MangoDetails';
import { MemoDetailsCard } from '@components/instruction/MemoDetailsCard';
import { PythDetailsCard } from '@components/instruction/pyth/PythDetailsCard';
import { isPythInstruction } from '@components/instruction/pyth/types';
import { isSerumInstruction } from '@components/instruction/serum/types';
import { SerumDetailsCard } from '@components/instruction/SerumDetailsCard';
import { StakeDetailsCard } from '@components/instruction/stake/StakeDetailsCard';
import { SystemDetailsCard } from '@components/instruction/system/SystemDetailsCard';
import { TokenDetailsCard } from '@components/instruction/token/TokenDetailsCard';
import { isTokenLendingInstruction } from '@components/instruction/token-lending/types';
import { isTokenSwapInstruction } from '@components/instruction/token-swap/types';
import { TokenLendingDetailsCard } from '@components/instruction/TokenLendingDetailsCard';
import { TokenSwapDetailsCard } from '@components/instruction/TokenSwapDetailsCard';
import { UnknownDetailsCard } from '@components/instruction/UnknownDetailsCard';
import { VoteDetailsCard } from '@components/instruction/vote/VoteDetailsCard';
import { isWormholeInstruction } from '@components/instruction/wormhole/types';
import { WormholeDetailsCard } from '@components/instruction/WormholeDetailsCard';
import { useAnchorProgram } from '@providers/anchor';
import { useCluster } from '@providers/cluster';
import { useTransactionDetails, useTransactionStatus } from '@providers/transactions';
import { useFetchTransactionDetails } from '@providers/transactions/parsed';
import {
    ComputeBudgetProgram,
    ParsedInnerInstruction,
    ParsedInstruction,
    ParsedTransaction,
    PartiallyDecodedInstruction,
    SignatureResult,
    TransactionSignature,
} from '@solana/web3.js';
import { Cluster } from '@utils/cluster';
import { INNER_INSTRUCTIONS_START_SLOT, SignatureProps } from '@utils/index';
import { intoTransactionInstruction } from '@utils/tx';
import React from 'react';
import { ErrorBoundary } from 'react-error-boundary';

import AnchorDetailsCard from '../instruction/AnchorDetailsCard';
import { isMangoInstruction } from '../instruction/mango/types';

export type InstructionDetailsProps = {
    tx: ParsedTransaction;
    ix: ParsedInstruction;
    index: number;
    result: SignatureResult;
    innerCards?: JSX.Element[];
    childIndex?: number;
};

export function InstructionsSection({ signature }: SignatureProps) {
    const status = useTransactionStatus(signature);
    const details = useTransactionDetails(signature);
    const { cluster, url } = useCluster();
    const fetchDetails = useFetchTransactionDetails();
    const refreshDetails = () => fetchDetails(signature);

    const result = status?.data?.info?.result;
    const transactionWithMeta = details?.data?.transactionWithMeta;
    if (!result || !transactionWithMeta) {
        return <ErrorCard retry={refreshDetails} text="No instructions found" />;
    }
    const { meta, transaction } = transactionWithMeta;

    if (transaction.message.instructions.length === 0) {
        return <ErrorCard retry={refreshDetails} text="No instructions found" />;
    }

    const innerInstructions: {
        [index: number]: (ParsedInstruction | PartiallyDecodedInstruction)[];
    } = {};

    if (
        meta?.innerInstructions &&
        (cluster !== Cluster.MainnetBeta || transactionWithMeta.slot >= INNER_INSTRUCTIONS_START_SLOT)
    ) {
        meta.innerInstructions.forEach((parsed: ParsedInnerInstruction) => {
            if (!innerInstructions[parsed.index]) {
                innerInstructions[parsed.index] = [];
            }

            parsed.instructions.forEach(ix => {
                innerInstructions[parsed.index].push(ix);
            });
        });
    }

    return (
        <>
            <div className="container">
                <div className="header">
                    <div className="header-body">
                        <h3 className="mb-0">
                            {transaction.message.instructions.length > 1 ? 'Instructions' : 'Instruction'}
                        </h3>
                    </div>
                </div>
            </div>
            <React.Suspense fallback={<LoadingCard message="Loading Instructions" />}>
                {transaction.message.instructions.map((instruction, index) => {
                    const innerCards: JSX.Element[] = [];

                    if (index in innerInstructions) {
                        innerInstructions[index].forEach((ix, childIndex) => {
                            const res = (
                                <InstructionCard
                                    key={`${index}-${childIndex}`}
                                    index={index}
                                    ix={ix}
                                    result={result}
                                    signature={signature}
                                    tx={transaction}
                                    childIndex={childIndex}
                                    url={url}
                                />
                            );
                            innerCards.push(res);
                        });
                    }

                    return (
                        <InstructionCard
                            key={`${index}`}
                            index={index}
                            ix={instruction}
                            result={result}
                            signature={signature}
                            tx={transaction}
                            innerCards={innerCards}
                            url={url}
                        />
                    );
                })}
            </React.Suspense>
        </>
    );
}

function InstructionCard({
    ix,
    tx,
    result,
    index,
    signature,
    innerCards,
    childIndex,
    url,
}: {
    ix: ParsedInstruction | PartiallyDecodedInstruction;
    tx: ParsedTransaction;
    result: SignatureResult;
    index: number;
    signature: TransactionSignature;
    innerCards?: JSX.Element[];
    childIndex?: number;
    url: string;
}) {
    const key = `${index}-${childIndex}`;
    const { program: anchorProgram } = useAnchorProgram(ix.programId.toString(), url);

    if ('parsed' in ix) {
        const props = {
            childIndex,
            index,
            innerCards,
            ix,
            result,
            tx,
        };

        switch (ix.program) {
            case 'spl-token':
                return (
                    <ErrorBoundary fallback={<UnknownDetailsCard {...props} />} key={key}>
                        <TokenDetailsCard {...props} key={key} />
                    </ErrorBoundary>
                );
            case 'bpf-loader':
                return <BpfLoaderDetailsCard {...props} key={key} />;
            case 'bpf-upgradeable-loader':
                return <BpfUpgradeableLoaderDetailsCard {...props} key={key} />;
            case 'system':
                return <SystemDetailsCard {...props} key={key} />;
            case 'stake':
                return <StakeDetailsCard {...props} key={key} />;
            case 'spl-memo':
                return <MemoDetailsCard {...props} key={key} />;
            case 'spl-associated-token-account':
                return <AssociatedTokenDetailsCard {...props} key={key} />;
            case 'vote':
                return <VoteDetailsCard {...props} key={key} />;
            default:
                return <UnknownDetailsCard {...props} key={key} />;
        }
    }

    const transactionIx = intoTransactionInstruction(tx, ix);

    if (!transactionIx) {
        return <ErrorCard key={key} text="Could not display this instruction, please report" />;
    }

    const props = {
        childIndex,
        index,
        innerCards,
        ix: transactionIx,
        result,
        signature,
    };

    if (isAddressLookupTableInstruction(transactionIx)) {
        return <AddressLookupTableDetailsCard key={key} {...props} />;
    } else if (isMangoInstruction(transactionIx)) {
        return <MangoDetailsCard key={key} {...props} />;
    } else if (isSerumInstruction(transactionIx)) {
        return <SerumDetailsCard key={key} {...props} />;
    } else if (isTokenSwapInstruction(transactionIx)) {
        return <TokenSwapDetailsCard key={key} {...props} />;
    } else if (isTokenLendingInstruction(transactionIx)) {
        return <TokenLendingDetailsCard key={key} {...props} />;
    } else if (isWormholeInstruction(transactionIx)) {
        return <WormholeDetailsCard key={key} {...props} />;
    } else if (isPythInstruction(transactionIx)) {
        return <PythDetailsCard key={key} {...props} />;
    } else if (ComputeBudgetProgram.programId.equals(transactionIx.programId)) {
        return <ComputeBudgetDetailsCard key={key} {...props} />;
    } else if (anchorProgram) {
        return (
            <ErrorBoundary fallback={<UnknownDetailsCard {...props} />} key={key}>
                <AnchorDetailsCard anchorProgram={anchorProgram} {...props} />
            </ErrorBoundary>
        );
    } else {
        return <UnknownDetailsCard key={key} {...props} />;
    }
}
