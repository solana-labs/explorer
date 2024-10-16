'use client';

import '@solana/wallet-adapter-react-ui/styles.css';

import { useEffect, useState } from 'react';

import { SignerWalletContext } from './MessageContext';
import { MessageForm } from './MessageForm';

export default function MessageSignerPage() {
    const [verified, setVerifiedInternal] = useState(false);
    const [openVerifiedSnackbar, showVerifiedSnackBar] = useState(false);
    const [verificationMessage, setVerificationMessage] = useState("");

    function setVerified(verified: boolean, showSnackBar = false, message = "") {
        if (verified || showSnackBar) {
            showVerifiedSnackBar(true);
        } else {
            showVerifiedSnackBar(false);
        }
        setVerificationMessage(message);
        setVerifiedInternal(verified);
    }

    // Auto-dismiss the snackbar after 5 seconds
    useEffect(() => {
        if (openVerifiedSnackbar) {
            const timer = setTimeout(() => {
                showVerifiedSnackBar(false);
            }, 3000);

            return () => clearTimeout(timer);
        }
    }, [openVerifiedSnackbar]);

    const message = verified
        ? `Message Verified${verificationMessage ? ": " + verificationMessage : ""}`
        : `Message Verification Failed${verificationMessage ? ": " + verificationMessage : ""}`;

    return (
        <SignerWalletContext>
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                minHeight: 'auto',
            }}>
                <div style={{
                    flex: 1,
                    overflow: 'auto',
                }}>
                    <MessageForm reportVerification={setVerified} />
                </div>
            </div>
            {openVerifiedSnackbar && (
                <div
                    className={`alert alert-${verified ? 'success' : 'danger'} alert-dismissible fade show mt-3`}
                    role="alert"
                    style={{
                        alignItems: 'center',
                        borderRadius: '0.5rem',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        margin: '1rem auto',
                        maxWidth: '600px',
                        padding: '1rem 1.5rem'
                    }}
                    onClick={() => showVerifiedSnackBar(false)}
                >
                    {message}
                </div>
            )}
        </SignerWalletContext>
    );
}