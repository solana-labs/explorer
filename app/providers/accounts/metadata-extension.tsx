import { base64 } from '@project-serum/anchor/dist/cjs/utils/bytes';
import { createEmitInstruction, TokenMetadata, unpack as deserializeTokenMetadata } from '@solana/spl-token-metadata';
import { useConnection } from '@solana/wallet-adapter-react';
import { MessageV0, PublicKey, VersionedTransaction } from '@solana/web3.js';
import { useEffect, useState } from 'react';

export function useTokenMetadataExtension(programId: PublicKey | undefined, metadataPointer: PublicKey | undefined) {
    const { connection } = useConnection();
    const [tokenMetadata, setTokenMetadata] = useState<TokenMetadata | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchTokenMetadata() {
            if (!programId || !metadataPointer) {
                return;
            }
            const ix = createEmitInstruction({ metadata: metadataPointer, programId });
            const message = MessageV0.compile({
                instructions: [ix],
                payerKey: new PublicKey('86xCnPeV69n6t3DnyGvkKobf9FdN2H9oiVDdaMpo2MMY'),
                recentBlockhash: (await connection.getLatestBlockhashAndContext()).value.blockhash,
            });

            const tx = new VersionedTransaction(message);
            const result = await connection.simulateTransaction(tx, {
                commitment: 'confirmed',
                replaceRecentBlockhash: true,
                sigVerify: false,
            });

            if (result.value.returnData) {
                const buffer = base64.decode(result.value.returnData.data[0]);
                console.log('Inner found metadata, setting');
                setTokenMetadata(deserializeTokenMetadata(buffer));
            }

            setLoading(false);
        }

        fetchTokenMetadata();
    }, [connection, programId, metadataPointer]);

    return loading ? null : tokenMetadata;
}
