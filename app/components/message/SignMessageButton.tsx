import { ed25519 } from '@noble/curves/ed25519';
import { useWallet } from '@solana/wallet-adapter-react';
import { Message, Transaction } from '@solana/web3.js';
import bs58 from 'bs58';
import React, { useCallback } from 'react';

export const SIGNING_DOMAIN = "_sign offchain_\n"

export interface SigningContext {
    input: string;
    address: string;
    signature: string;
    setInput: (event: { target: { value: string; } }) => void;
    setAddress: (event: { target: { value: string; } }) => void;
    setSignature: (event: { target: { value: string; } }) => void;
    setVerified: (verified: boolean, show?: boolean, message?: string) => void;
}

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
    signingcontext: SigningContext;
};

function shouldSign(input: string): boolean {
    try {
        const decodedMessage = bs58.decode(input);
        const isTransaction = (() => { try { Transaction.from(decodedMessage); return true; } catch { return false; } })();
        const isMessage = (() => { try { Message.from(decodedMessage); return true; } catch { return false; } })();
        return !isTransaction && !isMessage;
    } catch (error: unknown) {
        return true;
    }
}

export const SignMessageBox = (props: Props) => {
    const { publicKey, signMessage } = useWallet();

    const onClick = useCallback(async () => {
        try {
            if (!publicKey) throw new Error('Wallet not connected!');
            if (!signMessage) throw new Error('Wallet does not support message signing!');

            const formattedMessage = `${props.signingcontext.input}`;
            if (!shouldSign(formattedMessage)) {
                throw new Error('Message may be used in a transaction! Refusing to sign.');
            }
            const messageBytes = new TextEncoder().encode(SIGNING_DOMAIN + formattedMessage);
            console.log(`Signing message: ${formattedMessage}`);
            const signature = await signMessage(messageBytes);
            if (!ed25519.verify(signature, messageBytes, publicKey.toBytes())) {
                throw new Error('Message signature invalid!');
            }
            console.log(`Finished signing`);

            // update the UI fields to reflect the signed message
            props.signingcontext.setInput({ target: { value: formattedMessage } });
            props.signingcontext.setAddress({ target: { value: publicKey.toBase58() } });
            props.signingcontext.setSignature({ target: { value: bs58.encode(signature) } });
            props.signingcontext.setVerified(true, true);
        } catch (error) {
            if (error instanceof Error) {
                console.error(`Sign Message failed: ${error.message}`);
                props.signingcontext.setVerified(false, true, error.message);
            }
        }
    }, [publicKey, signMessage, props]);

    const buttonDisabled = !props.signingcontext.input || !publicKey || !signMessage

    return (
        <div>
            <div data-bs-toggle="tooltip" data-bs-placement="top" title={buttonDisabled ? "Connect a wallet to enable this action" : ""}>
                <button
                    {...props}
                    className={`btn btn-primary ${props.className || ''}`}
                    onClick={onClick}
                    disabled={buttonDisabled}
                >
                    Sign Message
                </button>
            </div>
        </div>
    );
};
