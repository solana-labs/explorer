import { getTokenIxValidator } from '@components/instruction/token/types';
import { formatTokenAmount } from '@entities/token-amount';
import { isParsedInstructionProgram, type ParserProgramLabel } from '@explorer/parsers';
import { unwrapOption } from '@solana/kit';
import { type ParsedInstruction, PublicKey } from '@solana/web3.js';
import {
    identifyToken2022Instruction,
    parseCloseAccountInstruction,
    parseInitializeAccountInstruction,
    parseInitializeGroupMemberPointerInstruction,
    parseInitializeGroupPointerInstruction,
    parseInitializeMetadataPointerInstruction,
    parseInitializeTokenGroupMemberInstruction,
    parseSyncNativeInstruction,
    parseTransferCheckedInstruction,
    parseTransferInstruction,
    parseUpdateGroupMemberPointerInstruction,
    parseUpdateGroupPointerInstruction,
    parseUpdateMetadataPointerInstruction,
    Token2022Instruction,
} from '@solana-program/token-2022';
import { create } from 'superstruct';

import type { KitInstruction } from '@/app/shared/lib/web3js-compat';

// The upstream Codama decoders for the SPL Token Metadata / Token Group interface
// instructions declare their 8-byte discriminator as an unbounded bytes field,
// which swallows the whole buffer and breaks every downstream field. These local
// parsers bound the discriminator so the instructions decode correctly.
import {
    parseEmitTokenMetadataInstruction,
    parseInitializeTokenGroupInstruction,
    parseInitializeTokenMetadataInstruction,
    parseRemoveTokenMetadataKeyInstruction,
    parseUpdateTokenGroupMaxSizeInstruction,
    parseUpdateTokenGroupUpdateAuthorityInstruction,
    parseUpdateTokenMetadataFieldInstruction,
    parseUpdateTokenMetadataUpdateAuthorityInstruction,
} from './token-2022-interface-parsers';

/** RPC `parsed.program` discriminator for the Token-2022 program; also the slice's `programLabel`. */
export const TOKEN_2022_PROGRAM_LABEL = 'spl-token-2022' satisfies ParserProgramLabel;

/**
 * Canonical shape of a parsed Token-2022 instruction. Same shape as the SPL
 * Token slice's `TokenParsed` — both use the SPL token validator map for
 * RPC normalisation. `type` is a free-form string for the same reasons as
 * `TokenParsed`.
 */
export type Token2022Parsed = { type: string; info: unknown };

export function parseToken2022Instruction(ix: KitInstruction): Token2022Parsed | undefined {
    try {
        const instructionType = identifyToken2022Instruction(ix.data);

        switch (instructionType) {
            // Core SPL Token instructions that Token-2022 shares byte-for-byte.
            // These mirror the SPL Token slice's `parseTokenInstruction`; without
            // them the inspector renders Token-2022 transfers/etc. as raw hex.
            case Token2022Instruction.CloseAccount: {
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
            case Token2022Instruction.InitializeAccount: {
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
            case Token2022Instruction.SyncNative: {
                const parsed = parseSyncNativeInstruction(ix);
                return {
                    info: { account: new PublicKey(parsed.accounts.account.address) },
                    type: 'syncNative',
                };
            }
            case Token2022Instruction.Transfer: {
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
            case Token2022Instruction.TransferChecked: {
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
            case Token2022Instruction.InitializeTokenMetadata: {
                const parsed = parseInitializeTokenMetadataInstruction(ix);
                return {
                    info: {
                        metadata: new PublicKey(parsed.accounts.metadata.address),
                        mint: new PublicKey(parsed.accounts.mint.address),
                        mintAuthority: new PublicKey(parsed.accounts.mintAuthority.address),
                        name: parsed.data.name,
                        symbol: parsed.data.symbol,
                        updateAuthority: new PublicKey(parsed.accounts.updateAuthority.address),
                        uri: parsed.data.uri,
                    },
                    type: 'initializeTokenMetadata',
                };
            }
            case Token2022Instruction.UpdateTokenMetadataField: {
                const parsed = parseUpdateTokenMetadataFieldInstruction(ix);
                return {
                    info: {
                        field: tokenMetadataFieldToString(parsed.data.field),
                        metadata: new PublicKey(parsed.accounts.metadata.address),
                        updateAuthority: new PublicKey(parsed.accounts.updateAuthority.address),
                        value: parsed.data.value,
                    },
                    type: 'updateTokenMetadataField',
                };
            }
            case Token2022Instruction.RemoveTokenMetadataKey: {
                const parsed = parseRemoveTokenMetadataKeyInstruction(ix);
                return {
                    info: {
                        idempotent: parsed.data.idempotent,
                        key: parsed.data.key,
                        metadata: new PublicKey(parsed.accounts.metadata.address),
                        updateAuthority: new PublicKey(parsed.accounts.updateAuthority.address),
                    },
                    type: 'removeTokenMetadataKey',
                };
            }
            case Token2022Instruction.UpdateTokenMetadataUpdateAuthority: {
                const parsed = parseUpdateTokenMetadataUpdateAuthorityInstruction(ix);
                const newUpdateAuthority = unwrapOption(parsed.data.newUpdateAuthority);
                return {
                    info: {
                        metadata: new PublicKey(parsed.accounts.metadata.address),
                        newUpdateAuthority: newUpdateAuthority !== null ? new PublicKey(newUpdateAuthority) : undefined,
                        updateAuthority: new PublicKey(parsed.accounts.updateAuthority.address),
                    },
                    type: 'updateTokenMetadataUpdateAuthority',
                };
            }
            case Token2022Instruction.EmitTokenMetadata: {
                const parsed = parseEmitTokenMetadataInstruction(ix);
                const end = unwrapOption(parsed.data.end);
                const start = unwrapOption(parsed.data.start);
                return {
                    info: {
                        end: end !== null ? safeNumber(end) : undefined,
                        metadata: new PublicKey(parsed.accounts.metadata.address),
                        start: start !== null ? safeNumber(start) : undefined,
                    },
                    type: 'emitTokenMetadata',
                };
            }
            case Token2022Instruction.InitializeMetadataPointer: {
                const parsed = parseInitializeMetadataPointerInstruction(ix);
                const authority = unwrapOption(parsed.data.authority);
                const metadataAddress = unwrapOption(parsed.data.metadataAddress);
                return {
                    info: {
                        authority: authority !== null ? new PublicKey(authority) : undefined,
                        metadataAddress: metadataAddress !== null ? new PublicKey(metadataAddress) : undefined,
                        mint: new PublicKey(parsed.accounts.mint.address),
                    },
                    type: 'initializeMetadataPointer',
                };
            }
            case Token2022Instruction.UpdateMetadataPointer: {
                const parsed = parseUpdateMetadataPointerInstruction(ix);
                const metadataAddress = unwrapOption(parsed.data.metadataAddress);
                return {
                    info: {
                        authority: new PublicKey(parsed.accounts.metadataPointerAuthority.address),
                        metadataAddress: metadataAddress !== null ? new PublicKey(metadataAddress) : undefined,
                        mint: new PublicKey(parsed.accounts.mint.address),
                    },
                    type: 'updateMetadataPointer',
                };
            }
            case Token2022Instruction.InitializeGroupPointer: {
                const parsed = parseInitializeGroupPointerInstruction(ix);
                const authority = unwrapOption(parsed.data.authority);
                const groupAddress = unwrapOption(parsed.data.groupAddress);
                return {
                    info: {
                        authority: authority !== null ? new PublicKey(authority) : undefined,
                        groupAddress: groupAddress !== null ? new PublicKey(groupAddress) : undefined,
                        mint: new PublicKey(parsed.accounts.mint.address),
                    },
                    type: 'initializeGroupPointer',
                };
            }
            case Token2022Instruction.UpdateGroupPointer: {
                const parsed = parseUpdateGroupPointerInstruction(ix);
                const groupAddress = unwrapOption(parsed.data.groupAddress);
                return {
                    info: {
                        authority: new PublicKey(parsed.accounts.groupPointerAuthority.address),
                        groupAddress: groupAddress !== null ? new PublicKey(groupAddress) : undefined,
                        mint: new PublicKey(parsed.accounts.mint.address),
                    },
                    type: 'updateGroupPointer',
                };
            }
            case Token2022Instruction.InitializeGroupMemberPointer: {
                const parsed = parseInitializeGroupMemberPointerInstruction(ix);
                const authority = unwrapOption(parsed.data.authority);
                const memberAddress = unwrapOption(parsed.data.memberAddress);
                return {
                    info: {
                        authority: authority !== null ? new PublicKey(authority) : undefined,
                        memberAddress: memberAddress !== null ? new PublicKey(memberAddress) : undefined,
                        mint: new PublicKey(parsed.accounts.mint.address),
                    },
                    type: 'initializeGroupMemberPointer',
                };
            }
            case Token2022Instruction.UpdateGroupMemberPointer: {
                const parsed = parseUpdateGroupMemberPointerInstruction(ix);
                const memberAddress = unwrapOption(parsed.data.memberAddress);
                return {
                    info: {
                        authority: new PublicKey(parsed.accounts.groupMemberPointerAuthority.address),
                        memberAddress: memberAddress !== null ? new PublicKey(memberAddress) : undefined,
                        mint: new PublicKey(parsed.accounts.mint.address),
                    },
                    type: 'updateGroupMemberPointer',
                };
            }
            case Token2022Instruction.InitializeTokenGroup: {
                const parsed = parseInitializeTokenGroupInstruction(ix);
                const updateAuthority = unwrapOption(parsed.data.updateAuthority);
                return {
                    info: {
                        group: new PublicKey(parsed.accounts.group.address),
                        maxSize: parsed.data.maxSize,
                        mint: new PublicKey(parsed.accounts.mint.address),
                        mintAuthority: new PublicKey(parsed.accounts.mintAuthority.address),
                        updateAuthority: updateAuthority !== null ? new PublicKey(updateAuthority) : undefined,
                    },
                    type: 'initializeTokenGroup',
                };
            }
            case Token2022Instruction.UpdateTokenGroupMaxSize: {
                const parsed = parseUpdateTokenGroupMaxSizeInstruction(ix);
                return {
                    info: {
                        group: new PublicKey(parsed.accounts.group.address),
                        maxSize: parsed.data.maxSize,
                        updateAuthority: new PublicKey(parsed.accounts.updateAuthority.address),
                    },
                    type: 'updateTokenGroupMaxSize',
                };
            }
            case Token2022Instruction.UpdateTokenGroupUpdateAuthority: {
                const parsed = parseUpdateTokenGroupUpdateAuthorityInstruction(ix);
                const newUpdateAuthority = unwrapOption(parsed.data.newUpdateAuthority);
                return {
                    info: {
                        group: new PublicKey(parsed.accounts.group.address),
                        newUpdateAuthority: newUpdateAuthority !== null ? new PublicKey(newUpdateAuthority) : undefined,
                        updateAuthority: new PublicKey(parsed.accounts.updateAuthority.address),
                    },
                    type: 'updateTokenGroupUpdateAuthority',
                };
            }
            case Token2022Instruction.InitializeTokenGroupMember: {
                const parsed = parseInitializeTokenGroupMemberInstruction(ix);
                return {
                    info: {
                        group: new PublicKey(parsed.accounts.group.address),
                        groupUpdateAuthority: new PublicKey(parsed.accounts.groupUpdateAuthority.address),
                        member: new PublicKey(parsed.accounts.member.address),
                        memberMint: new PublicKey(parsed.accounts.memberMint.address),
                        memberMintAuthority: new PublicKey(parsed.accounts.memberMintAuthority.address),
                    },
                    type: 'initializeTokenGroupMember',
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
 * Token-2022 metadata fields are tagged unions: Name/Symbol/Uri map to lowercase
 * tag names; a custom Key field carries the user-defined key string in fields[0].
 */
function tokenMetadataFieldToString(field: { __kind: string; fields?: readonly [string] }): string {
    return field.fields?.[0] ?? field.__kind.toLowerCase();
}

/**
 * Normalise an RPC-pre-parsed Token-2022 ParsedInstruction. SPL Token and
 * Token-2022 share `IX_STRUCTS` for validation; only the program label differs.
 */
export function parseToken2022RpcInstruction(ix: ParsedInstruction): Token2022Parsed | undefined {
    if (!isParsedInstructionProgram(ix, TOKEN_2022_PROGRAM_LABEL)) return undefined;
    const validator = getTokenIxValidator(ix.parsed.type);
    if (!validator) return undefined;
    try {
        return { info: create(ix.parsed.info, validator), type: ix.parsed.type };
    } catch {
        return undefined;
    }
}

function safeNumber(value: bigint | number): number {
    return typeof value === 'bigint' ? Number(value) : value;
}
