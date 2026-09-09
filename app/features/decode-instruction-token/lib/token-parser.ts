import { getTokenIxValidator } from '@components/instruction/token/types';
import { formatTokenAmount } from '@entities/token-amount';
import { isParsedInstructionProgram, type ParserProgramLabel } from '@explorer/parsers';
import { type ParsedInstruction, PublicKey } from '@solana/web3.js';
import {
    identifyTokenInstruction,
    parseCloseAccountInstruction,
    parseInitializeAccountInstruction,
    parseSyncNativeInstruction,
    parseTransferCheckedInstruction,
    parseTransferInstruction,
    TokenInstruction,
} from '@solana-program/token';
import { create } from 'superstruct';

import type { KitInstruction } from '@/app/shared/lib/web3js-compat';

/** RPC `parsed.program` discriminator for the SPL Token program; also the slice's `programLabel`. */
export const TOKEN_PROGRAM_LABEL = 'spl-token' satisfies ParserProgramLabel;

/**
 * Canonical shape of a parsed SPL Token / Token-2022 instruction.
 * `info` is left as `unknown` because the SPL token family covers ~60+
 * instruction types; consumers narrow via the existing per-type superstruct
 * validators in `app/components/instruction/token/types.ts`. `type` is a
 * free-form string because the RPC layer reports types as strings and the
 * compat wrap erases the discriminator before cards read it anyway.
 */
export type TokenParsed = { type: string; info: unknown };

export function parseTokenInstruction(ix: KitInstruction): TokenParsed | undefined {
    try {
        const instructionType = identifyTokenInstruction(ix.data);

        switch (instructionType) {
            case TokenInstruction.CloseAccount: {
                const parsed = parseCloseAccountInstruction(ix);
                return {
                    info: {
                        account: new PublicKey(parsed.accounts.account.address),
                        destination: new PublicKey(parsed.accounts.destination.address),
                        owner: new PublicKey(parsed.accounts.owner.address),
                    },
                    type: 'closeAccount',
                };
            }
            case TokenInstruction.InitializeAccount: {
                const parsed = parseInitializeAccountInstruction(ix);
                return {
                    info: {
                        account: new PublicKey(parsed.accounts.account.address),
                        mint: new PublicKey(parsed.accounts.mint.address),
                        owner: new PublicKey(parsed.accounts.owner.address),
                        rentSysvar: new PublicKey(parsed.accounts.rent.address),
                    },
                    type: 'initializeAccount',
                };
            }
            case TokenInstruction.SyncNative: {
                const parsed = parseSyncNativeInstruction(ix);
                return {
                    info: { account: new PublicKey(parsed.accounts.account.address) },
                    type: 'syncNative',
                };
            }
            case TokenInstruction.Transfer: {
                const parsed = parseTransferInstruction(ix);
                return {
                    info: {
                        amount: parsed.data.amount.toString(),
                        authority: new PublicKey(parsed.accounts.authority.address),
                        destination: new PublicKey(parsed.accounts.destination.address),
                        source: new PublicKey(parsed.accounts.source.address),
                    },
                    type: 'transfer',
                };
            }
            case TokenInstruction.TransferChecked: {
                const parsed = parseTransferCheckedInstruction(ix);
                const amount = parsed.data.amount.toString();
                const decimals = parsed.data.decimals;
                return {
                    info: {
                        authority: new PublicKey(parsed.accounts.authority.address),
                        destination: new PublicKey(parsed.accounts.destination.address),
                        mint: new PublicKey(parsed.accounts.mint.address),
                        source: new PublicKey(parsed.accounts.source.address),
                        tokenAmount: {
                            amount,
                            decimals,
                            uiAmountString: formatTokenAmount({ amount: BigInt(amount), decimals }),
                        },
                    },
                    type: 'transferChecked',
                };
            }
            default:
                return undefined;
        }
    } catch {
        return undefined;
    }
}

/**
 * Normalise an RPC-pre-parsed SPL Token ParsedInstruction. Token-2022 has its
 * own near-identical implementation in its slice; the duplication is ~10 LoC
 * and keeps slices independent (no feature-to-feature import).
 */
export function parseTokenRpcInstruction(ix: ParsedInstruction): TokenParsed | undefined {
    if (!isParsedInstructionProgram(ix, TOKEN_PROGRAM_LABEL)) return undefined;
    const validator = getTokenIxValidator(ix.parsed.type);
    if (!validator) return undefined;
    try {
        return { info: create(ix.parsed.info, validator), type: ix.parsed.type };
    } catch {
        return undefined;
    }
}
