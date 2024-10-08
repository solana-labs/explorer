import { ed25519 } from '@noble/curves/ed25519';
import { useWallet } from '@solana/wallet-adapter-react';
import bs58 from 'bs58';
import React, { useCallback } from 'react';

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

export const SignMessageBox = (props: Props) => {
    const { publicKey, signMessage } = useWallet();

    const onClick = useCallback(async () => {
        try {
            if (!publicKey) throw new Error('Wallet not connected!');
            if (!signMessage) throw new Error('Wallet does not support message signing!');

            const formattedMessage = `${props.signingcontext.input}`;
            const signature = await signMessage(new TextEncoder().encode(formattedMessage));
            if (!ed25519.verify(signature, new TextEncoder().encode(formattedMessage), publicKey.toBytes())) {
                throw new Error('Message signature invalid!');
            }

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
