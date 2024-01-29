import * as anchor from '@project-serum/anchor';
import { PublicKey } from '@solana/web3.js';

type Opts = {
    logs?: boolean;
    simulate?: boolean;
    verbose?: boolean;
    signers?: anchor.web3.Keypair[];
    lookupTableAddress?: anchor.web3.PublicKey;
};

export const PRE_INSTRUCTIONS = [
    anchor.web3.ComputeBudgetProgram.setComputeUnitLimit({
        units: 1_400_000,
    }),
    // Only need this is we consume too much heap while resolving / identifying accounts
    anchor.web3.ComputeBudgetProgram.requestHeapFrame({
        bytes: 1024 * 32 * 8,
    }),
];

export async function sendTransaction(
    connection: anchor.web3.Connection,
    payer: PublicKey,
    ixs: anchor.web3.TransactionInstruction[],
    opts: Opts = {
        lookupTableAddress: undefined,
        simulate: false,
        verbose: false,
    }
): Promise<{ computeUnits: number }> {
    let lookupTable: anchor.web3.AddressLookupTableAccount | null = null;
    if (opts.lookupTableAddress) {
        lookupTable = (await connection.getAddressLookupTable(opts.lookupTableAddress, { commitment: 'finalized' }))
            .value;
    }

    let numReplays = 0;
    while (numReplays < 3) {
        try {
            const message = anchor.web3.MessageV0.compile({
                addressLookupTableAccounts: lookupTable ? [lookupTable] : undefined,
                instructions: PRE_INSTRUCTIONS.concat(ixs),
                payerKey: payer,
                recentBlockhash: (await connection.getLatestBlockhash()).blockhash,
            });
            const transaction = new anchor.web3.VersionedTransaction(message);

            if (opts.simulate) {
                const simulationResult = await connection.simulateTransaction(transaction, {
                    commitment: 'confirmed',
                });

                if (opts.logs && simulationResult.value.logs) {
                    console.log(simulationResult.value.logs.join('\n'));
                }

                return { computeUnits: simulationResult.value.unitsConsumed ?? -1 };
            } else {
                throw new Error("Don't use this function for real transactions");
            }
        } catch (e) {
            if (e instanceof anchor.web3.TransactionExpiredTimeoutError) {
                console.log('Retrying transaction');
                numReplays += 1;
            } else {
                throw e;
            }
        }
    }

    return { computeUnits: -1 };
}
