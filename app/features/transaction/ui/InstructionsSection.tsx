import { ErrorCard } from '@components/common/ErrorCard';
import { LoadingCard } from '@components/common/LoadingCard';
import { AddressLookupTableDetailsCard } from '@components/instruction/AddressLookupTableDetailsCard';
import { BpfLoaderDetailsCard } from '@components/instruction/bpf-loader/BpfLoaderDetailsCard';
import { BpfUpgradeableLoaderDetailsCard } from '@components/instruction/bpf-upgradeable-loader/BpfUpgradeableLoaderDetailsCard';
import { ComputeBudgetDetailsCard } from '@components/instruction/ComputeBudgetDetailsCard';
import { Ed25519DetailsCard } from '@components/instruction/ed25519/Ed25519DetailsCard';
import { isEd25519Instruction } from '@components/instruction/ed25519/types';
import { MemoDetailsCard } from '@components/instruction/MemoDetailsCard';
import {
    isSolanaAttestationInstruction,
    SolanaAttestationDetailsCard,
} from '@components/instruction/sas/SolanaAttestationDetailsCard';
import { SystemDetailsCard } from '@components/instruction/system/SystemDetailsCard';
import { TokenDetailsCard } from '@components/instruction/token/TokenDetailsCard';
import { isTokenLendingInstruction } from '@components/instruction/token-lending/types';
import { isTokenSwapInstruction } from '@components/instruction/token-swap/types';
import { TokenLendingDetailsCard } from '@components/instruction/TokenLendingDetailsCard';
import { TokenSwapDetailsCard } from '@components/instruction/TokenSwapDetailsCard';
import { UnknownDetailsCard } from '@components/instruction/UnknownDetailsCard';
import { isWormholeInstruction } from '@components/instruction/wormhole/types';
import { WormholeDetailsCard } from '@components/instruction/WormholeDetailsCard';
import { ZkElGamalProofDetailsCard } from '@components/instruction/ZkElGamalProofDetailsCard';
import { CollapsibleSection } from '@components/shared/ui/collapsible-section';
import { TxInstructionSurface } from '@entities/instruction-card';
import { isParsedInstruction, useInstructionParser } from '@entities/instruction-parser';
import { isZkElGamalProofInstruction } from '@entities/zk-elgamal-proof';
import { getMangoInstructionLabel, isMangoInstruction } from '@explorer/decoder-mango/detection';
import { isPythInstruction } from '@explorer/decoder-pyth/detection';
import {
    getSerumInstructionLabel,
    isDeprecatedSerumProgram,
    isSerumInstruction,
} from '@explorer/decoder-serum/detection';
import {
    ADDRESS_LOOKUP_TABLE_PROGRAM_LABEL,
    BPF_LOADER_PROGRAM_LABEL,
    BPF_UPGRADEABLE_LOADER_PROGRAM_LABEL,
    SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_LABEL,
    SPL_MEMO_PROGRAM_LABEL,
    SPL_TOKEN_2022_PROGRAM_LABEL,
    SPL_TOKEN_PROGRAM_LABEL,
    STAKE_PROGRAM_LABEL,
    SYSTEM_PROGRAM_LABEL,
    VOTE_PROGRAM_LABEL,
} from '@explorer/parsers';
import { AssociatedTokenDetailsCard } from '@features/decode-instruction-associated-token';
import { isLighthouseInstruction, LighthouseDetailsCard } from '@features/decode-instruction-lighthouse';
import { isProgramMetadataInstruction } from '@features/decode-instruction-pmp/detection';
import { IdlInstructionCard, useIdlInstructionDecode } from '@features/decode-instruction-with-idl';
import { PythDetailsCard } from '@features/instruction-program-pyth';
import { MetaplexTokenMetadataDetailsCard } from '@features/mpl-token-metadata';
import { isStakeInstruction, RawStakeDetailsCard, StakeDetailsCard } from '@features/stake';
import {
    isRpcParsedBatchInstruction,
    isTokenBatchInstruction,
    RpcParsedTokenBatchCard,
    TokenBatchCard,
} from '@features/token-batch';
import { VoteDetailsCard } from '@features/vote';
import { MPL_TOKEN_METADATA_PROGRAM_ID } from '@metaplex-foundation/mpl-token-metadata';
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
import dynamic from 'next/dynamic';
import React from 'react';
import { ErrorBoundary } from 'react-error-boundary';

import { CommonInstructionDetailsCard } from './CommonInstructionDetailsCard';

const SerumDetailsCard = dynamic(
    () => import('@features/instruction-program-serum').then(mod => mod.SerumDetailsCard),
    { ssr: false },
);

// The PMP card carries the generated client plus pako/yaml/smol-toml (~35 kB gzip), which only a transaction that
// actually touches the program needs. `isProgramMetadataInstruction` comes from the light `/detection` entry so
// the branch above can stay static.
const PmpDetailsCard = dynamic(() => import('@features/decode-instruction-pmp').then(mod => mod.PmpDetailsCard), {
    loading: () => <LoadingCard />,
    ssr: false,
});

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
    const { cluster } = useCluster();
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
        <CollapsibleSection id="programs" title="Programs" className="">
            <TxInstructionSurface result={result}>
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
                            />
                        );
                    })}
                </React.Suspense>
            </TxInstructionSurface>
        </CollapsibleSection>
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
}: {
    ix: ParsedInstruction | PartiallyDecodedInstruction;
    tx: ParsedTransaction;
    result: SignatureResult;
    index: number;
    signature: TransactionSignature;
    innerCards?: JSX.Element[];
    childIndex?: number;
}) {
    const key = `${index}-${childIndex}`;
    const dispatcher = useInstructionParser();

    const parsedIx = React.useMemo(
        () => ('parsed' in ix ? dispatcher.fromParsedInstruction(ix) : undefined),
        [dispatcher, ix],
    );

    // Raw form is needed by both the native tiers below and the dynamic IDL tier; `intoTransactionInstruction`
    // returns undefined for RPC-pre-parsed instructions. Lifted above the early returns so the hooks order
    // stays stable.
    const transactionIx = React.useMemo(() => intoTransactionInstruction(tx, ix), [tx, ix]);
    // Dynamic IDL tier — shared with the inspector. See app/components/inspector/InstructionsSection.tsx.
    // Memoized so the Anchor Program / Borsh coder isn't rebuilt on every re-render.
    const idlDecode = useIdlInstructionDecode({ programId: ix.programId.toString(), raw: transactionIx });

    if ('parsed' in ix && parsedIx) {
        const props = {
            childIndex,
            index,
            innerCards,
            ix: parsedIx,
            result,
            tx,
        };

        switch (ix.program) {
            case SPL_TOKEN_PROGRAM_LABEL:
            case SPL_TOKEN_2022_PROGRAM_LABEL: {
                // The RPC parses batch instructions (disc 0xff) as ParsedInstruction
                // with type "batch". Route them to the batch card before TokenDetailsCard
                // throws on the unrecognised type.
                if (isRpcParsedBatchInstruction(ix.parsed)) {
                    return (
                        <ErrorBoundary fallback={<UnknownDetailsCard {...props} />} key={key}>
                            <RpcParsedTokenBatchCard
                                ix={ix}
                                index={index}
                                result={result}
                                innerCards={innerCards}
                                childIndex={childIndex}
                            />
                        </ErrorBoundary>
                    );
                }
                return (
                    <ErrorBoundary fallback={<UnknownDetailsCard {...props} />} key={key}>
                        <TokenDetailsCard {...props} key={key} />
                    </ErrorBoundary>
                );
            }
            case BPF_LOADER_PROGRAM_LABEL:
                return <BpfLoaderDetailsCard {...props} key={key} />;
            case BPF_UPGRADEABLE_LOADER_PROGRAM_LABEL:
                return <BpfUpgradeableLoaderDetailsCard {...props} key={key} />;
            case SYSTEM_PROGRAM_LABEL:
                return <SystemDetailsCard {...props} key={key} />;
            case STAKE_PROGRAM_LABEL:
                return <StakeDetailsCard {...props} key={key} />;
            case SPL_MEMO_PROGRAM_LABEL:
                return <MemoDetailsCard {...props} key={key} />;
            case SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_LABEL:
                return (
                    <AssociatedTokenDetailsCard
                        key={key}
                        ix={parsedIx}
                        index={index}
                        result={result}
                        innerCards={innerCards}
                        childIndex={childIndex}
                    />
                );
            case VOTE_PROGRAM_LABEL:
                return <VoteDetailsCard {...props} key={key} />;
            case ADDRESS_LOOKUP_TABLE_PROGRAM_LABEL:
                return <AddressLookupTableDetailsCard {...props} key={key} />;
            default:
                return <UnknownDetailsCard {...props} key={key} />;
        }
    }

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

    if (isEd25519Instruction(transactionIx)) {
        return <Ed25519DetailsCard key={key} {...props} tx={tx} />;
    }
    if (isMangoInstruction(transactionIx)) {
        return (
            <CommonInstructionDetailsCard
                key={key}
                {...props}
                instructionName={getMangoInstructionLabel(transactionIx)}
            />
        );
    }
    if (isSerumInstruction(transactionIx)) {
        // Dead Serum DEX deployments get the generic name-only card; the active OpenBook fork keeps full decoding.
        if (isDeprecatedSerumProgram(transactionIx.programId.toBase58())) {
            return (
                <CommonInstructionDetailsCard
                    key={key}
                    {...props}
                    instructionName={getSerumInstructionLabel(transactionIx)}
                />
            );
        }
        return (
            <ErrorBoundary fallback={<UnknownDetailsCard {...props} />} key={key}>
                <SerumDetailsCard {...props} />
            </ErrorBoundary>
        );
    }
    if (isTokenSwapInstruction(transactionIx)) {
        return <TokenSwapDetailsCard key={key} {...props} />;
    }
    if (isTokenLendingInstruction(transactionIx)) {
        return <TokenLendingDetailsCard key={key} {...props} />;
    }
    if (isWormholeInstruction(transactionIx)) {
        return <WormholeDetailsCard key={key} {...props} />;
    }
    if (isPythInstruction(transactionIx)) {
        return (
            <PythDetailsCard
                key={key}
                ix={transactionIx}
                index={index}
                innerCards={innerCards}
                childIndex={childIndex}
                signature={signature}
            />
        );
    }
    if (ComputeBudgetProgram.programId.equals(transactionIx.programId)) {
        return <ComputeBudgetDetailsCard key={key} {...props} />;
    }
    if (isZkElGamalProofInstruction(transactionIx)) {
        return <ZkElGamalProofDetailsCard key={key} {...props} />;
    }
    if (isLighthouseInstruction(transactionIx)) {
        const dispatched = dispatcher.fromTransactionInstruction(transactionIx);
        if (isParsedInstruction(dispatched)) {
            return (
                <LighthouseDetailsCard
                    key={key}
                    ix={dispatched}
                    raw={transactionIx}
                    index={index}
                    result={result}
                    innerCards={innerCards}
                    childIndex={childIndex}
                />
            );
        }
        return <UnknownDetailsCard key={key} {...props} />;
    }
    if (isStakeInstruction(transactionIx)) {
        return <RawStakeDetailsCard key={key} {...props} />;
    }
    if (isTokenBatchInstruction(transactionIx)) {
        return (
            <ErrorBoundary fallback={<UnknownDetailsCard {...props} />} key={key}>
                <TokenBatchCard {...props} />
            </ErrorBoundary>
        );
    }
    if (isSolanaAttestationInstruction(transactionIx)) {
        return (
            <ErrorBoundary fallback={<UnknownDetailsCard {...props} />} key={key}>
                <SolanaAttestationDetailsCard {...props} />
            </ErrorBoundary>
        );
    }
    if (transactionIx.programId.toBase58() === MPL_TOKEN_METADATA_PROGRAM_ID) {
        return (
            <ErrorBoundary fallback={<UnknownDetailsCard {...props} />} key={key}>
                <MetaplexTokenMetadataDetailsCard {...props} />
            </ErrorBoundary>
        );
    }
    // PMP owns every instruction on its program id: `setData`/`initialize`/`write` render decoded content from
    // the bundled typed decoders (no IDL needed), and the housekeeping instructions delegate to the IDL tier
    // from inside the card. Must sit before the generic idlDecode tier so it wins for the content instructions.
    if (isProgramMetadataInstruction(transactionIx)) {
        return (
            <PmpDetailsCard
                key={key}
                {...props}
                // The card cannot import the IDL feature (boundaries/dependencies), so this surface decides what
                // a non-content PMP instruction falls back to. Same two outcomes as before the branch existed.
                fallback={
                    idlDecode ? (
                        <IdlInstructionCard decoded={idlDecode} {...props} />
                    ) : (
                        <UnknownDetailsCard {...props} />
                    )
                }
            />
        );
    }
    if (idlDecode) {
        return <IdlInstructionCard key={key} decoded={idlDecode} {...props} />;
    }

    return <UnknownDetailsCard key={key} {...props} />;
}
