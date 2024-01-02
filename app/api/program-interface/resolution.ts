import { sha256 } from '@noble/hashes/sha256';
import * as anchor from '@project-serum/anchor';
import { AccountMeta, PublicKey } from '@solana/web3.js';

import { PRE_INSTRUCTIONS, sendTransaction } from './sendTransaction';

type AdditionalAccounts = {
    accounts: anchor.web3.AccountMeta[];
    hasMore: boolean;
};

const MAX_ACCOUNTS = 30;

/**
 *
 * @param program
 * @param instructions
 * @returns
 */
export async function resolveRemainingAccounts(
    connection: anchor.web3.Connection,
    payer: anchor.web3.PublicKey,
    instructions: anchor.web3.TransactionInstruction[],
    verbose = false,
    slut: anchor.web3.PublicKey | undefined = undefined
): Promise<AdditionalAccounts> {
    // Simulate transaction
    let lookupTable: anchor.web3.AddressLookupTableAccount | null = null;
    if (slut) {
        if (verbose) {
            console.log(`SLUT resolution with ${slut.toBase58()}`);
        }
        while (!lookupTable) {
            lookupTable = (await connection.getAddressLookupTable(slut)).value;
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }

    const message = anchor.web3.MessageV0.compile({
        addressLookupTableAccounts: slut ? [lookupTable!] : undefined,
        instructions: PRE_INSTRUCTIONS.concat(instructions),
        payerKey: payer,
        recentBlockhash: (await connection.getLatestBlockhash()).blockhash,
    });
    const transaction = new anchor.web3.VersionedTransaction(message);

    const simulationResult = await connection.simulateTransaction(transaction, {
        commitment: 'confirmed',
    });
    const logs = simulationResult.value.logs;
    const unitsConsumed = simulationResult.value.unitsConsumed;
    const err = simulationResult.value.err;

    if (verbose) {
        console.log('CUs consumed:', unitsConsumed);
        console.log('Logs', logs);
        console.log('Result', err);
    }

    // When the simulation RPC response is fixed, then the following code will work
    // but until then, we have to parse the logs manually.
    //
    // ISSUE: rpc truncates trailing 0 bytes in `returnData` field, so we have
    // to actually parse the logs for the whole return data
    // ===============================================================
    // let returnDataTuple = simulationResult.value.returnData;
    // let [b64Data, encoding] = returnDataTuple["data"];
    // if (encoding !== "base64") {
    //   throw new Error("Unsupported encoding: " + encoding);
    // }
    // ===============================================================

    if (!logs) {
        throw new Error('No logs found in preflight simulation. This is likely an RPC error.');
    }

    try {
        const b64Data = anchor.utils.bytes.base64.decode(logs[logs.length - 2].split(' ')[3]);
        const data = b64Data;

        if (!data.length) {
            throw new Error(
                `No return data found in preflight simulation:
      ${logs}`
            );
        }

        if (data.length !== 1024) {
            throw new Error(
                `Return data incorrect size in preflight simulation:
      ${data.length} (expected 1024)`
            );
        }

        // We start deserializing the Vec<IAccountMeta> from the 5th byte
        // The first 4 bytes are u32 for the Vec of the return data
        const protocolVersion = data[0];
        if (protocolVersion !== 0) {
            throw new Error(`Unsupported Account Resolution Protocol version: ${protocolVersion}`);
        }
        const hasMore = data[1];
        const numAccounts = data.slice(4, 8);
        const numMetas = new anchor.BN(numAccounts, undefined, 'le');

        const offset = 8;
        const realAccountMetas: anchor.web3.AccountMeta[] = [];
        for (let i = 0; i < numMetas.toNumber(); i += 1) {
            const pubkey = new anchor.web3.PublicKey(data.slice(offset + i * 32, offset + (i + 1) * 32));
            const writable = data[offset + MAX_ACCOUNTS * 32 + i];
            realAccountMetas.push({
                isSigner: false,
                isWritable: writable === 1,
                pubkey,
            });
        }

        return {
            accounts: realAccountMetas,
            hasMore: hasMore != 0,
        };
    } catch (e) {
        throw new Error('Failed to parse return data: ' + e + '\n' + logs.join('\n'));
    }
}

async function extendLookupTable(
    additionalAccounts: anchor.web3.AccountMeta[],
    payer: PublicKey,
    lastSize: number,
    connection: anchor.web3.Connection,
    lookupTable: anchor.web3.PublicKey
): Promise<number> {
    while (additionalAccounts.flat().length - lastSize) {
        // 29 is max number of accounts we can extend a lookup table by in a single transaction
        // ironically due to tx limits
        const batchSize = Math.min(29, additionalAccounts.length - lastSize);

        const ix = anchor.web3.AddressLookupTableProgram.extendLookupTable({
            addresses: additionalAccounts
                .flat()
                .slice(lastSize, lastSize + batchSize)
                .map(acc => acc.pubkey),
            authority: payer,
            lookupTable,
            payer,
        });

        await sendTransaction(connection, payer, [ix]);
        lastSize += batchSize;
    }
    return lastSize;
}

async function pollForActiveLookupTable(
    additionalAccounts: anchor.web3.AccountMeta[],
    connection: anchor.web3.Connection,
    lookupTable: anchor.web3.PublicKey
) {
    let activeSlut = false;
    while (!activeSlut) {
        const table = await connection.getAddressLookupTable(lookupTable, {
            commitment: 'finalized',
        });
        if (table.value) {
            activeSlut = table.value.isActive() && table.value.state.addresses.length === additionalAccounts.length;
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
}

export function hashIxName(ixName: string): Buffer {
    return Buffer.from(sha256(`global:${ixName}`)).slice(0, 8);
}

/**
 * Takes a serialized Anchor Instruction
 * And executes a preflight instruction to get the remaining accounts
 * @param program
 * @param instruction
 * @param verbose
 * @returns
 */
export async function additionalAccountsRequest(
    connection: anchor.web3.Connection,
    payer: PublicKey,
    instruction: anchor.web3.TransactionInstruction,
    methodName: string,
    verbose = false,
    slut = false
): Promise<{
    ix: anchor.web3.TransactionInstruction;
    lookupTable?: anchor.web3.PublicKey;
}> {
    // NOTE: LOL we have to do this because slicing only generates a view
    // so we need to copy it to a new buffer
    // const originalData = Buffer.from(instruction.data);
    const originalKeys: AccountMeta[] = ([] as AccountMeta[]).concat(instruction.keys);

    // Overwrite the discriminator
    const currentBuffer = Buffer.from(instruction.data);

    const newIxDisc = hashIxName(`preflight_${methodName}`);
    currentBuffer.set(newIxDisc, 0);

    let additionalAccounts: anchor.web3.AccountMeta[] = [];
    let hasMore = true;
    let i = 0;
    let lookupTable: anchor.web3.PublicKey | undefined;
    let lastSize = 0;
    while (hasMore) {
        if (verbose) {
            console.log(`Iteration: ${i} | additionalAccounts: ${additionalAccounts.length}`);
        }

        // Write the current page number at the end of the instruction data
        instruction.data = currentBuffer;

        // Add found accounts to instruction
        instruction.keys = originalKeys.concat(additionalAccounts.flat());

        const result = await resolveRemainingAccounts(connection, payer, [instruction], verbose, lookupTable);

        if (verbose) {
            console.log(`Iteration: ${i} | requested: ${result.accounts.length}`);
        }
        hasMore = result.hasMore;
        additionalAccounts = additionalAccounts.concat(result.accounts);

        if (additionalAccounts.length >= 10 && slut) {
            if (!lookupTable) {
                const [ix, tableAddr] = anchor.web3.AddressLookupTableProgram.createLookupTable({
                    authority: payer,
                    payer: payer,
                    recentSlot: await connection.getSlot(),
                });

                await sendTransaction(connection, payer, [ix]);
                lookupTable = tableAddr;
            }

            // We want to minimize the number of non-transactional
            // txs we have to send on-chain. So we maximize # of accounts
            // to extend the lookup table by.
            // In practice, we can probably mix accounts from different resolutions
            // into the same extend LUT tx.
            if (additionalAccounts.length - lastSize >= 10) {
                if (verbose) {
                    console.log('Extending lookup table...');
                }
                lastSize = await extendLookupTable(additionalAccounts, payer, lastSize, connection, lookupTable);
                await pollForActiveLookupTable(additionalAccounts, connection, lookupTable);
                if (verbose) {
                    console.log('...extended!');
                }
            }
        }

        i++;
        if (i >= 32) {
            throw new Error(`Too many iterations ${i}`);
        }
    }

    if (slut && lookupTable) {
        await extendLookupTable(additionalAccounts, payer, lastSize, connection, lookupTable);
        await pollForActiveLookupTable(additionalAccounts, connection, lookupTable);
    }

    instruction.keys = originalKeys.concat(additionalAccounts);

    // Reset original data
    instruction.data.set(hashIxName(`${methodName}`), 0);

    return { ix: instruction, lookupTable };
}
