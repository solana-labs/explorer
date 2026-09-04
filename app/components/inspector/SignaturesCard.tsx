import { Address } from '@components/common/Address';
import { Signature } from '@components/common/Signature';
import { CollapsibleSection } from '@components/shared/ui/collapsible-section';
import {
    getBase58Encoder,
    getPublicKeyFromAddress,
    isSolanaError,
    signatureBytes,
    SOLANA_ERROR__KEYS__INVALID_SIGNATURE_BYTE_LENGTH,
    verifySignature,
} from '@solana/kit';
import { type PublicKey, type VersionedMessage } from '@solana/web3.js';
import React from 'react';

import { Badge } from '@/app/components/shared/ui/badge';
import { toKitAddress } from '@/app/shared/lib/web3js-compat';
import { BaseTable } from '@/app/shared/ui/Table';

import { CARD_TABLE_HEADER } from './inspector-table';

const BASE58_ENCODER = getBase58Encoder();

async function verifySignatures(
    signatures: (string | undefined)[],
    message: VersionedMessage,
    rawMessage: Uint8Array,
): Promise<(boolean | undefined)[]> {
    return await Promise.all(
        signatures.map(async (signature, index) => {
            if (!signature) return undefined;
            try {
                const publicKey = await getPublicKeyFromAddress(toKitAddress(message.staticAccountKeys[index]));
                const rawSignature = signatureBytes(new Uint8Array(BASE58_ENCODER.encode(signature)));
                return await verifySignature(publicKey, rawSignature, rawMessage);
            } catch (error) {
                return isSolanaError(error, SOLANA_ERROR__KEYS__INVALID_SIGNATURE_BYTE_LENGTH) ? false : undefined;
            }
        }),
    );
}

export function TransactionSignatures({
    signatures,
    message,
    rawMessage,
}: {
    signatures: (string | undefined)[];
    message: VersionedMessage;
    rawMessage: Uint8Array;
}) {
    const [verification, setVerification] = React.useState<{
        message: VersionedMessage;
        rawMessage: Uint8Array;
        results: (boolean | undefined)[];
        signatures: (string | undefined)[];
    }>();

    React.useEffect(() => {
        let cancelled = false;
        verifySignatures(signatures, message, rawMessage).then(results => {
            if (!cancelled) setVerification({ message, rawMessage, results, signatures });
        });
        return () => {
            cancelled = true;
        };
    }, [signatures, message, rawMessage]);

    const verificationResults =
        verification &&
        verification.signatures === signatures &&
        verification.message === message &&
        verification.rawMessage === rawMessage
            ? verification.results
            : undefined;

    const signatureRows = signatures.map((signature, index) => {
        const publicKey = message.staticAccountKeys[index];

        const props = {
            index,
            pending: verificationResults === undefined,
            signature,
            signer: publicKey,
            verified: verificationResults?.[index],
        };

        return <SignatureRow key={index} {...props} />;
    });

    return (
        <CollapsibleSection title="Signatures">
            <BaseTable ui="dashkit" variant="card" density="dense" nowrap className={CARD_TABLE_HEADER}>
                <BaseTable.Head>
                    <BaseTable.Row>
                        <BaseTable.HeaderCell className="w-px text-outer-space-300">#</BaseTable.HeaderCell>
                        <BaseTable.HeaderCell className="text-outer-space-300">Signature</BaseTable.HeaderCell>
                        <BaseTable.HeaderCell className="text-outer-space-300">Signer</BaseTable.HeaderCell>
                    </BaseTable.Row>
                </BaseTable.Head>
                <BaseTable.Body>{signatureRows}</BaseTable.Body>
            </BaseTable>
        </CollapsibleSection>
    );
}

function renderValidity(
    signature: string | undefined,
    verified: boolean | undefined,
    pending: boolean,
): React.ReactNode {
    if (!signature) return 'N/A';
    if (pending) return undefined;
    if (verified === undefined) return 'N/A';
    return verified ? (
        <Badge ui="dashkit" variant="success" className="mr-[3px]">
            Valid
        </Badge>
    ) : (
        <Badge ui="dashkit" variant="warning" className="mr-[3px]">
            Invalid
        </Badge>
    );
}

function SignatureRow({
    signature,
    signer,
    verified,
    pending,
    index,
}: {
    signature: string | undefined;
    signer: PublicKey;
    verified?: boolean;
    pending: boolean;
    index: number;
}) {
    return (
        <BaseTable.Row>
            <BaseTable.Cell>
                <span className="text-outer-space-300">{index + 1}</span>
            </BaseTable.Cell>
            <BaseTable.Cell>
                <div className="flex flex-col gap-1">
                    <div>{signature ? <Signature signature={signature} /> : 'Missing Signature'}</div>
                    <div>{renderValidity(signature, verified, pending)}</div>
                </div>
            </BaseTable.Cell>
            <BaseTable.Cell>
                <div className="flex flex-col gap-1">
                    <Address pubkey={signer} link />
                    {index === 0 && (
                        <div>
                            <Badge ui="dashkit" variant="info" className="mr-[3px]">
                                Fee Payer
                            </Badge>
                        </div>
                    )}
                </div>
            </BaseTable.Cell>
        </BaseTable.Row>
    );
}
