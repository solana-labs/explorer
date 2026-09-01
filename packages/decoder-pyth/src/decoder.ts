import {
    addDecoderSizePrefix,
    type Decoder,
    fixDecoderSize,
    getAddressDecoder,
    getArrayDecoder,
    getBytesDecoder,
    getI32Decoder,
    getI64Decoder,
    getStructDecoder,
    getU8Decoder,
    getU32Decoder,
    getU64Decoder,
    getUtf8Decoder,
} from '@solana/kit';
import { PublicKey, type TransactionInstruction } from '@solana/web3.js';

import {
    PYTH_INSTRUCTION_VERSION,
    PYTH_INSTRUCTIONS,
    type PythInstructionType,
    pythInstructionTypeAt,
} from './instructions';

type PythHeader = { version: number; type: number };

const headerDecoder = () =>
    getStructDecoder([
        ['version', getU32Decoder()],
        ['type', getU32Decoder()],
    ] as const);

const lpStringDecoder = () => addDecoderSizePrefix(getUtf8Decoder(), getU8Decoder());

const attributesDecoder = () =>
    getArrayDecoder(
        getStructDecoder([
            ['key', lpStringDecoder()],
            ['value', lpStringDecoder()],
        ] as const),
        { size: 'remainder' },
    );

const headerOnlyDecoder = getStructDecoder([['header', headerDecoder()]] as const);

const priceUpdateDecoder = getStructDecoder([
    ['header', headerDecoder()],
    ['status', getU32Decoder()],
    // Padding: the C struct aligns the i64 price to 8 bytes.
    ['unused1', getU32Decoder()],
    ['price', getI64Decoder()],
    ['conf', getU64Decoder()],
    ['publishSlot', getU64Decoder()],
] as const);

const priceAccountDecoder = getStructDecoder([
    ['header', headerDecoder()],
    ['exponent', getI32Decoder()],
    ['priceType', getU32Decoder()],
] as const);

const publisherDecoder = getStructDecoder([
    ['header', headerDecoder()],
    ['publisherPubkey', getAddressDecoder()],
] as const);

/** `satisfies` rather than an annotation: it pins exhaustiveness without widening each payload type. */
const PAYLOAD_DECODERS = {
    AddMapping: headerOnlyDecoder,
    AddPrice: priceAccountDecoder,
    AddProduct: headerOnlyDecoder,
    AddPublisher: publisherDecoder,
    AggregatePrice: headerOnlyDecoder,
    DeletePublisher: publisherDecoder,
    InitMapping: headerOnlyDecoder,
    InitPrice: priceAccountDecoder,
    InitTest: headerOnlyDecoder,
    SetMinPublishers: getStructDecoder([
        ['header', headerDecoder()],
        ['minPublishers', getU8Decoder()],
        // Padding: minPublishers is a u8 sitting in a u32 slot.
        ['unused1', fixDecoderSize(getBytesDecoder(), 3)],
    ] as const),
    UpdatePrice: priceUpdateDecoder,
    UpdatePriceNoFailOnError: priceUpdateDecoder,
    UpdateProduct: getStructDecoder([
        ['header', headerDecoder()],
        ['attributes', attributesDecoder()],
    ] as const),
    UpdateTest: headerOnlyDecoder,
} satisfies Record<PythInstructionType, Decoder<{ header: PythHeader }>>;

function decoderFor<T extends PythInstructionType>(type: T) {
    return { decoder: PAYLOAD_DECODERS[type], index: PYTH_INSTRUCTIONS[type].index };
}

function decodeData<T extends { header: PythHeader }>(
    { decoder, index }: { decoder: Decoder<T>; index: number },
    data: Uint8Array,
): T {
    let decoded: T;
    try {
        decoded = decoder.decode(data);
    } catch (err) {
        throw new Error(`invalid instruction; ${err}`);
    }

    if (decoded.header.type !== index) {
        throw new Error(`invalid instruction; instruction index mismatch ${decoded.header.type} != ${index}`);
    }

    return decoded;
}

export enum PriceType {
    Unknown = 0,
    Price,
}

export enum TradingStatus {
    Unknown = 0,
    Trading,
    Halted,
    Auction,
}

export type InitMappingParams = {
    fundingPubkey: PublicKey;
    mappingPubkey: PublicKey;
};

export type AddMappingParams = {
    fundingPubkey: PublicKey;
    mappingPubkey: PublicKey;
    nextMappingPubkey: PublicKey;
};

export type AddProductParams = {
    fundingPubkey: PublicKey;
    mappingPubkey: PublicKey;
    productPubkey: PublicKey;
};

export type UpdateProductParams = {
    fundingPubkey: PublicKey;
    productPubkey: PublicKey;
    attributes: Map<string, string>;
};

export type AddPriceParams = {
    fundingPubkey: PublicKey;
    productPubkey: PublicKey;
    pricePubkey: PublicKey;
    exponent: number;
    priceType: PriceType;
};

export type BasePublisherOperationParams = {
    signerPubkey: PublicKey;
    pricePubkey: PublicKey;
    publisherPubkey: PublicKey;
};

export type UpdatePriceParams = {
    publisherPubkey: PublicKey;
    pricePubkey: PublicKey;
    status: TradingStatus;
    price: number;
    conf: number;
    publishSlot: number;
};

export type AggregatePriceParams = {
    fundingPubkey: PublicKey;
    pricePubkey: PublicKey;
};

export type InitPriceParams = {
    fundingPubkey: PublicKey;
    pricePubkey: PublicKey;
    exponent: number;
    priceType: PriceType;
};

export type SetMinPublishersParams = {
    fundingPubkey: PublicKey;
    pricePubkey: PublicKey;
    minPublishers: number;
};

export function parsePythInstructionType(instruction: TransactionInstruction): PythInstructionType {
    const header = headerDecoder().decode(instruction.data);
    if (header.version !== PYTH_INSTRUCTION_VERSION) {
        throw new Error(`Unsupported Pyth version: ${header.version}`);
    }

    const type = pythInstructionTypeAt(header.type);
    if (!type) {
        throw new Error(`Unknown Pyth instruction index: ${header.type}`);
    }

    return type;
}

export function decodeInitMapping(instruction: TransactionInstruction): InitMappingParams {
    decodeData(decoderFor('InitMapping'), instruction.data);
    return {
        fundingPubkey: instruction.keys[0].pubkey,
        mappingPubkey: instruction.keys[1].pubkey,
    };
}

export function decodeAddMapping(instruction: TransactionInstruction): AddMappingParams {
    decodeData(decoderFor('AddMapping'), instruction.data);
    return {
        fundingPubkey: instruction.keys[0].pubkey,
        mappingPubkey: instruction.keys[1].pubkey,
        nextMappingPubkey: instruction.keys[2].pubkey,
    };
}

export function decodeAddProduct(instruction: TransactionInstruction): AddProductParams {
    decodeData(decoderFor('AddProduct'), instruction.data);
    return {
        fundingPubkey: instruction.keys[0].pubkey,
        mappingPubkey: instruction.keys[1].pubkey,
        productPubkey: instruction.keys[2].pubkey,
    };
}

export function decodeUpdateProduct(instruction: TransactionInstruction): UpdateProductParams {
    const { attributes } = decodeData(decoderFor('UpdateProduct'), instruction.data);
    return {
        attributes: new Map(attributes.map(({ key, value }) => [key, value])),
        fundingPubkey: instruction.keys[0].pubkey,
        productPubkey: instruction.keys[1].pubkey,
    };
}

export function decodeAddPrice(instruction: TransactionInstruction): AddPriceParams {
    const { exponent, priceType } = decodeData(decoderFor('AddPrice'), instruction.data);
    return {
        exponent,
        fundingPubkey: instruction.keys[0].pubkey,
        pricePubkey: instruction.keys[2].pubkey,
        priceType,
        productPubkey: instruction.keys[1].pubkey,
    };
}

export function decodeAddPublisher(instruction: TransactionInstruction): BasePublisherOperationParams {
    const { publisherPubkey } = decodeData(decoderFor('AddPublisher'), instruction.data);
    return {
        pricePubkey: instruction.keys[1].pubkey,
        publisherPubkey: new PublicKey(publisherPubkey),
        signerPubkey: instruction.keys[0].pubkey,
    };
}

export function decodeDeletePublisher(instruction: TransactionInstruction): BasePublisherOperationParams {
    const { publisherPubkey } = decodeData(decoderFor('DeletePublisher'), instruction.data);
    return {
        pricePubkey: instruction.keys[1].pubkey,
        publisherPubkey: new PublicKey(publisherPubkey),
        signerPubkey: instruction.keys[0].pubkey,
    };
}

export function decodeUpdatePrice(instruction: TransactionInstruction): UpdatePriceParams {
    return toUpdatePriceParams(decodeData(decoderFor('UpdatePrice'), instruction.data), instruction);
}

export function decodeUpdatePriceNoFailOnError(instruction: TransactionInstruction): UpdatePriceParams {
    return toUpdatePriceParams(decodeData(decoderFor('UpdatePriceNoFailOnError'), instruction.data), instruction);
}

function toUpdatePriceParams(
    { conf, price, publishSlot, status }: { conf: bigint; price: bigint; publishSlot: bigint; status: number },
    instruction: TransactionInstruction,
): UpdatePriceParams {
    return {
        conf: Number(conf),
        price: Number(price),
        pricePubkey: instruction.keys[1].pubkey,
        publishSlot: Number(publishSlot),
        publisherPubkey: instruction.keys[0].pubkey,
        status,
    };
}

export function decodeAggregatePrice(instruction: TransactionInstruction): AggregatePriceParams {
    decodeData(decoderFor('AggregatePrice'), instruction.data);
    return {
        fundingPubkey: instruction.keys[0].pubkey,
        pricePubkey: instruction.keys[1].pubkey,
    };
}

export function decodeInitPrice(instruction: TransactionInstruction): InitPriceParams {
    const { exponent, priceType } = decodeData(decoderFor('InitPrice'), instruction.data);
    return {
        exponent,
        fundingPubkey: instruction.keys[0].pubkey,
        pricePubkey: instruction.keys[1].pubkey,
        priceType,
    };
}

export function decodeSetMinPublishers(instruction: TransactionInstruction): SetMinPublishersParams {
    const { minPublishers } = decodeData(decoderFor('SetMinPublishers'), instruction.data);
    return {
        fundingPubkey: instruction.keys[0].pubkey,
        minPublishers,
        pricePubkey: instruction.keys[1].pubkey,
    };
}
