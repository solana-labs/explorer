import { VersionedMessage } from '@solana/web3.js';
import base58 from 'bs58';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import React from 'react';

import type { TransactionData } from './InspectorPage';

function getMessageDataFromBytes(bytes: Uint8Array): {
    message: VersionedMessage;
    rawMessage: Uint8Array;
} {
    const message = VersionedMessage.deserialize(bytes);
    return {
        message,
        rawMessage: bytes,
    };
}

function getTransactionDataFromUserSuppliedBytes(bytes: Uint8Array): {
    message: VersionedMessage;
    rawMessage: Uint8Array;
    signatures?: string[];
} {
    /**
     * Step 1: Try to parse the bytes as a *transaction* first (ie. with signatures at the front)
     */
    let offset = 0;
    const numSignatures = bytes[offset++];
    // If this were a transaction, would its message expect exactly `numSignatures`?
    let requiredSignaturesByteOffset = 1 + numSignatures * 64;
    if (VersionedMessage.deserializeMessageVersion(bytes.slice(requiredSignaturesByteOffset)) !== 'legacy') {
        requiredSignaturesByteOffset++;
    }
    const numRequiredSignaturesAccordingToMessage = bytes[requiredSignaturesByteOffset];
    if (numRequiredSignaturesAccordingToMessage !== numSignatures) {
        // We looked ahead into the message and could not match the number of signatures indicated
        // by the first byte of the transaction with the expected number of signatures in the
        // message. This is likely not a transaction at all, so try to parse it as a message now.
        return getMessageDataFromBytes(bytes);
    }
    const signatures = [];
    for (let ii = 0; ii < numSignatures; ii++) {
        const signatureBytes = bytes.subarray(offset, offset + 64);
        if (signatureBytes.length !== 64) {
            // We hit the end of the byte array before consuming `numSignatures` signatures. This
            // can't have been a transaction, so try to parse it as a message now.
            return getMessageDataFromBytes(bytes);
        }
        signatures.push(base58.encode(signatureBytes));
        offset += 64;
    }
    try {
        const transactionData = getMessageDataFromBytes(bytes.slice(offset));
        return {
            ...transactionData,
            ...(signatures.length ? { signatures } : null),
        };
    } catch {
        /**
         * Step 2: That didn't work, so presume that the bytes are a message, as asked for in the UI
         */
        return getMessageDataFromBytes(bytes);
    }
}

export const MIN_MESSAGE_LENGTH =
    3 + // header
    1 + // accounts length
    32 + // accounts, must have at least one address for fees
    32 + // recent blockhash
    1; // instructions length

export function RawInput({
    value,
    setTransactionData,
}: {
    value?: string;
    setTransactionData: (param: TransactionData | undefined) => void;
}) {
    const rawTransactionInput = React.useRef<HTMLTextAreaElement>(null);
    const [error, setError] = React.useState<string>();
    const [rows, setRows] = React.useState(3);
    const currentPathname = usePathname();
    const currentSearchParams = useSearchParams();
    const router = useRouter();
    const onInput = React.useCallback(() => {
        const base64 = rawTransactionInput.current?.value;
        if (base64) {
            // Clear url params when input is detected
            if (currentSearchParams?.get('message')) {
                const nextQueryParams = new URLSearchParams(currentSearchParams?.toString());
                nextQueryParams.delete('message');
                const queryString = nextQueryParams.toString();
                router.push(`${currentPathname}${queryString ? `?${queryString}` : ''}`);
            } else if (currentSearchParams?.get('transaction')) {
                const nextQueryParams = new URLSearchParams(currentSearchParams?.toString());
                nextQueryParams.delete('transaction');
                const queryString = nextQueryParams.toString();
                router.push(`${currentPathname}${queryString ? `?${queryString}` : ''}`);
            }

            // Dynamically expand height based on input length
            setRows(Math.max(3, Math.min(10, Math.round(base64.length / 150))));

            let buffer;
            try {
                buffer = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
            } catch (err) {
                console.error(err);
                setError('Input must be base64 encoded');
                return;
            }

            try {
                if (buffer.length < MIN_MESSAGE_LENGTH) {
                    throw new Error('Input is not long enough to be valid.');
                }
                const transactionData = getTransactionDataFromUserSuppliedBytes(buffer);
                setTransactionData(transactionData);
                setError(undefined);
                return;
            } catch (err) {
                if (err instanceof Error) setError(err.message);
            }
        } else {
            setError(undefined);
        }
    }, [currentSearchParams, router, currentPathname, setTransactionData]);

    React.useEffect(() => {
        const input = rawTransactionInput.current;
        if (input && value) {
            input.value = value;
            onInput();
        }
    }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

    const placeholder = 'Paste raw base64 encoded transaction message';
    return (
        <div className="card">
            <div className="card-header">
                <h3 className="card-header-title">Encoded Transaction Message</h3>
            </div>
            <div className="card-body">
                <textarea
                    rows={rows}
                    onInput={onInput}
                    ref={rawTransactionInput}
                    className="form-control form-control-flush form-control-auto font-monospace"
                    placeholder={placeholder}
                ></textarea>
                <div className="row align-items-center">
                    <div className="col d-flex align-items-center">
                        {error && (
                            <>
                                <span className="text-warning small me-2">
                                    <i className="fe fe-alert-circle"></i>
                                </span>

                                <span className="text-warning">{error}</span>
                            </>
                        )}
                    </div>
                </div>
            </div>
            <div className="card-footer">
                <h3>Instructions</h3>
                <ul>
                    <li className="mb-2">
                        <strong>CLI: </strong>Use <code>--dump-transaction-message</code> flag
                    </li>
                    <li className="mb-2">
                        <strong>Rust: </strong>Add <code>base64</code> crate dependency and{' '}
                        <code>println!(&quot;{}&quot;, base64::encode(&transaction.message_data()));</code>
                    </li>
                    <li>
                        <strong>JavaScript: </strong>Add{' '}
                        <code>console.log(tx.serializeMessage().toString(&quot;base64&quot;));</code>
                    </li>
                </ul>
            </div>
        </div>
    );
}
