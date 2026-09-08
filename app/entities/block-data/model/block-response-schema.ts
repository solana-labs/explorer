import {
    array,
    bigint,
    literal,
    nullable,
    number,
    optional,
    record,
    string,
    tuple,
    type,
    union,
    unknown,
} from 'superstruct';

const rpcInteger = () => union([bigint(), number()]);

const TransactionMetaSchema = nullable(
    type({
        computeUnitsConsumed: optional(rpcInteger()),
        // `costUnits` is served by RPC nodes but is not yet present in kit's response type.
        costUnits: optional(rpcInteger()),
        err: nullable(union([string(), record(string(), unknown())])),
        fee: rpcInteger(),
        innerInstructions: optional(
            nullable(
                array(
                    type({
                        index: number(),
                        instructions: array(
                            type({
                                accounts: array(number()),
                                data: string(),
                                programIdIndex: number(),
                            }),
                        ),
                    }),
                ),
            ),
        ),
        loadedAddresses: optional(nullable(type({ readonly: array(string()), writable: array(string()) }))),
        logMessages: nullable(array(string())),
    }),
);

export const BlockTransactionResponseSchema = type({
    meta: TransactionMetaSchema,
    transaction: tuple([string(), literal('base64')]),
});

export const BlockResponseSchema = type({
    blockTime: nullable(rpcInteger()),
    blockhash: string(),
    parentSlot: rpcInteger(),
    previousBlockhash: string(),
    rewards: optional(
        nullable(
            array(
                type({
                    commission: optional(nullable(number())),
                    lamports: rpcInteger(),
                    postBalance: nullable(rpcInteger()),
                    pubkey: string(),
                    rewardType: nullable(string()),
                }),
            ),
        ),
    ),
    transactions: array(unknown()),
});
