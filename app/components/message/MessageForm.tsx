import { ed25519 } from "@noble/curves/ed25519";
import { PublicKey } from "@solana/web3.js";
import bs58 from 'bs58';
import dynamic from 'next/dynamic';
import { SetStateAction, useCallback, useEffect, useMemo, useState } from "react";

import { MeteredMessageBox } from "./MeteredMessageBox";
import { SIGNING_DOMAIN, SigningContext, SignMessageBox } from "./SignMessageButton";

const ConnectButton = dynamic(async () => ((await import('@solana/wallet-adapter-react-ui')).WalletMultiButton), { ssr: false });

export type ReportMessageVerification = (verified: boolean, show?: boolean, message?: string) => void;

const MAX_MSG_LENGTH = 1500;

function getPluralizedWord(count: number): string {
    return count === 1 ? "character" : "characters";
}

function sanitizeInput(input: string) {
    input = input.replace(/<script.*?>.*?<\/script>/gi, '');
    if (input.length > MAX_MSG_LENGTH) {
        console.log("Message length limit reached. Truncating...");
        input = input.substring(0, MAX_MSG_LENGTH);
    }
    return input;
}

export const MessageForm = (props: { reportVerification: ReportMessageVerification }) => {
    const [address, setAddress] = useState("");
    const [message, setMessage] = useState("");
    const [signature, setSignature] = useState("");
    const [addressError, setAddressError] = useState(false);
    const [verified, setVerifiedInternal] = useState(false);

    const setVerified = useCallback((verified: boolean, show = false, message = "") => {
        setVerifiedInternal(verified);
        props.reportVerification(verified, show, message);
    }, [props]);

    const handleAddressChange = useCallback((event: { target: { value: SetStateAction<string>; }; }) => {
        setVerified(false);
        const update = event.target.value;
        setAddress(update);

        try {
            let isError = false;
            if (update.length > 0 && !PublicKey.isOnCurve(update)) {
                isError = true;
            }
            setAddressError(isError);
        } catch (error: unknown) {
            if (error instanceof Error) {
                console.error(error.message);
            }
            setAddressError(true);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleSignatureChange = useCallback((event: { target: { value: SetStateAction<string>; }; }) => {
        setVerified(false);
        setSignature(event.target.value);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleInputChange = useCallback((event: { target: { value: string; }; }) => {
        setVerified(false);
        setMessage(sanitizeInput(event.target.value));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleVerifyClick = useCallback(() => {
        try {
            const messageBytes = new TextEncoder().encode(SIGNING_DOMAIN + message);
            const verified = ed25519.verify(bs58.decode(signature), messageBytes, bs58.decode(address));
            if (!verified) throw new Error("Message verification failed!");
            setVerified(true)
        } catch (error) {
            console.error("Message verification failed!");
            setVerified(false, true);
        }
    }, [setVerified, address, message, signature]);

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const urlAddress = urlParams.get('address');
        const urlMessage = urlParams.get('message');
        const urlSignature = urlParams.get('signature');

        if (urlAddress && urlMessage && urlSignature) {
            handleAddressChange({ target: { value: urlAddress } });
            handleInputChange({ target: { value: urlMessage } });
            handleSignatureChange({ target: { value: urlSignature } });
        }
    }, [handleAddressChange, handleInputChange, handleSignatureChange]);

    const signingContext = useMemo(() => {
        return {
            address,
            input: message,
            setAddress: handleAddressChange,
            setInput: handleInputChange,
            setSignature: handleSignatureChange,
            setVerified,
            signature,
        } as SigningContext;
    }, [message, address, signature, handleAddressChange, handleSignatureChange, handleInputChange, setVerified]);

    function writeToClipboard() {
        const encodedAddress = encodeURIComponent(address);
        const encodedMessage = encodeURIComponent(message);
        const encodedSignature = encodeURIComponent(signature);
        const newUrl = `${window.location.origin}${window.location.pathname}?address=${encodedAddress}&message=${encodedMessage}&signature=${encodedSignature}`;
        navigator.clipboard.writeText(newUrl).catch(err => {
            console.error("Failed to copy to clipboard: ", err);
        });
    }

    const placeholder_message = 'Type a message here...';
    const placeholder_address = 'Enter an address whose signature you want to verify...';
    const placeholder_signature = 'Paste a signature...';
    const verifyButtonDisabled = !address || !message || !signature;

    return (
        <div className="card" >
            <div className="card-header" style={{ padding: '2.5rem 1.5rem' }}>
                <div className="row align-items-center d-flex justify-content-between">
                    <div className="col">
                        <h2 className="card-header-title">Message Signer</h2>
                    </div>
                    <div className="col-auto">
                        <ConnectButton style={{
                            borderRadius: '0.5rem',
                        }} />
                    </div>
                </div>
            </div>
            <div className="card-header">
                <h3 className="card-header-title">Address</h3>
            </div>
            <div className="card-body">
                <textarea
                    rows={2}
                    onChange={handleAddressChange}
                    value={address}
                    className="form-control form-control-auto"
                    placeholder={placeholder_address}
                />
                {addressError && (
                    <div className="text-warning small mt-2">
                        <i className="fe fe-alert-circle"></i> Invalid address.
                    </div>
                )}
            </div>
            <div className="card-header">
                <h3 className="card-header-title">Message</h3>
            </div>
            <div className="card-body">
                <p className="text-muted small">Make sure you understand what you&apos;re signing. Transaction signing is not allowed. Message signing is free.</p>
                <MeteredMessageBox
                    value={message}
                    onChange={handleInputChange}
                    placeholder={placeholder_message}
                    word={getPluralizedWord(MAX_MSG_LENGTH - message.length)}
                    limit={MAX_MSG_LENGTH}
                    count={message.length}
                    charactersremaining={MAX_MSG_LENGTH - message.length} />
            </div>

            <div className="card-header">
                <h3 className="card-header-title">Signature</h3>
            </div>
            <div className="card-body">
                <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, overflowY: 'auto' }}>
                    <textarea
                        rows={2}
                        onChange={handleSignatureChange}
                        value={signature}
                        className="form-control form-control-auto"
                        placeholder={placeholder_signature}
                    />
                </div>
            </div>

            <div className="card-footer d-flex justify-content-end">
                <div className="me-2" data-bs-toggle="tooltip" data-bs-placement="top" title={!verified ? "Verify first to enable this action" : ""}>
                    <button
                        className="btn btn-primary"
                        onClick={writeToClipboard}
                        disabled={!verified}
                    >
                        Copy URL
                    </button>
                </div>
                <div className="me-2" data-bs-toggle="tooltip" data-bs-placement="top" title={verifyButtonDisabled ? "Complete the form to enable this action" : ""}>
                    <button
                        className="btn btn-primary"
                        onClick={handleVerifyClick}
                        disabled={verifyButtonDisabled}
                    >
                        Verify
                    </button>
                </div>
                <SignMessageBox className="btn btn-primary me-2" signingcontext={signingContext} />
            </div>
        </div >
    );
};