import { PublicKey } from '@solana/web3.js';
import { describe, expect, it } from 'vitest';

import {
    decodeAddMapping,
    decodeAddPrice,
    decodeAddProduct,
    decodeAddPublisher,
    decodeAggregatePrice,
    decodeDeletePublisher,
    decodeInitMapping,
    decodeInitPrice,
    decodeSetMinPublishers,
    decodeUpdatePrice,
    decodeUpdatePriceNoFailOnError,
    decodeUpdateProduct,
    parsePythInstructionType,
} from '../decoder';
import { ACCOUNTS, i64, lpString, PUBLISHER, pythInstruction, rawPythInstruction, u32, u64 } from './fixtures';

const PRICE_UPDATE = [u32(1), u32(0), i64(-12345n), u64(678n), u64(170_640_000n)];

/**
 * Which account each decoder reads from which position, and how it reads the payload. The account
 * mapping is positional and invisible in the instruction data, so nothing but this pins it.
 */
const CASES = [
    {
        decoded: () => decodeInitMapping(pythInstruction('InitMapping')),
        expected: { fundingPubkey: ACCOUNTS.first, mappingPubkey: ACCOUNTS.second },
        name: 'InitMapping',
    },
    {
        decoded: () => decodeAddMapping(pythInstruction('AddMapping')),
        expected: {
            fundingPubkey: ACCOUNTS.first,
            mappingPubkey: ACCOUNTS.second,
            nextMappingPubkey: ACCOUNTS.third,
        },
        name: 'AddMapping',
    },
    {
        decoded: () => decodeAddProduct(pythInstruction('AddProduct')),
        expected: {
            fundingPubkey: ACCOUNTS.first,
            mappingPubkey: ACCOUNTS.second,
            productPubkey: ACCOUNTS.third,
        },
        name: 'AddProduct',
    },
    {
        decoded: () => decodeAddPrice(pythInstruction('AddPrice', u32(0xffff_fff7), u32(1))),
        expected: {
            exponent: -9,
            fundingPubkey: ACCOUNTS.first,
            pricePubkey: ACCOUNTS.third,
            priceType: 1,
            productPubkey: ACCOUNTS.second,
        },
        name: 'AddPrice',
    },
    {
        decoded: () => decodeAddPublisher(pythInstruction('AddPublisher', [...PUBLISHER.toBytes()])),
        expected: {
            pricePubkey: ACCOUNTS.second,
            publisherPubkey: PUBLISHER.toBase58(),
            signerPubkey: ACCOUNTS.first,
        },
        name: 'AddPublisher',
    },
    {
        decoded: () => decodeDeletePublisher(pythInstruction('DeletePublisher', [...PUBLISHER.toBytes()])),
        expected: {
            pricePubkey: ACCOUNTS.second,
            publisherPubkey: PUBLISHER.toBase58(),
            signerPubkey: ACCOUNTS.first,
        },
        name: 'DeletePublisher',
    },
    {
        decoded: () => decodeUpdatePrice(pythInstruction('UpdatePrice', ...PRICE_UPDATE)),
        expected: {
            conf: 678,
            price: -12345,
            pricePubkey: ACCOUNTS.second,
            publishSlot: 170_640_000,
            publisherPubkey: ACCOUNTS.first,
            status: 1,
        },
        name: 'UpdatePrice',
    },
    {
        decoded: () => decodeUpdatePriceNoFailOnError(pythInstruction('UpdatePriceNoFailOnError', ...PRICE_UPDATE)),
        expected: {
            conf: 678,
            price: -12345,
            pricePubkey: ACCOUNTS.second,
            publishSlot: 170_640_000,
            publisherPubkey: ACCOUNTS.first,
            status: 1,
        },
        name: 'UpdatePriceNoFailOnError',
    },
    {
        decoded: () => decodeAggregatePrice(pythInstruction('AggregatePrice')),
        expected: { fundingPubkey: ACCOUNTS.first, pricePubkey: ACCOUNTS.second },
        name: 'AggregatePrice',
    },
    {
        decoded: () => decodeInitPrice(pythInstruction('InitPrice', u32(0xffff_fff7), u32(1))),
        expected: {
            exponent: -9,
            fundingPubkey: ACCOUNTS.first,
            pricePubkey: ACCOUNTS.second,
            priceType: 1,
        },
        name: 'InitPrice',
    },
    {
        decoded: () => decodeSetMinPublishers(pythInstruction('SetMinPublishers', [3], [0, 0, 0])),
        expected: { fundingPubkey: ACCOUNTS.first, minPublishers: 3, pricePubkey: ACCOUNTS.second },
        name: 'SetMinPublishers',
    },
];

describe('decoder', () => {
    it.each(CASES)('should decode $name', ({ decoded, expected }) => {
        expect(asBase58(decoded())).toEqual(expected);
    });

    it('should decode the trailing attribute list of an update product instruction', () => {
        const ix = pythInstruction(
            'UpdateProduct',
            lpString('symbol'),
            lpString('BTC/USD'),
            lpString('asset_type'),
            lpString('Crypto'),
        );
        const { attributes, fundingPubkey, productPubkey } = decodeUpdateProduct(ix);

        expect(Object.fromEntries(attributes)).toEqual({ asset_type: 'Crypto', symbol: 'BTC/USD' });
        expect(fundingPubkey.toBase58()).toBe(ACCOUNTS.first);
        expect(productPubkey.toBase58()).toBe(ACCOUNTS.second);
    });

    it('should read an empty attribute list as no attributes', () => {
        expect(decodeUpdateProduct(pythInstruction('UpdateProduct')).attributes.size).toBe(0);
    });
});

describe('parsePythInstructionType', () => {
    it('should resolve the instruction type from the header', () => {
        expect(parsePythInstructionType(pythInstruction('InitMapping'))).toBe('InitMapping');
        expect(parsePythInstructionType(pythInstruction('UpdatePrice', ...PRICE_UPDATE))).toBe('UpdatePrice');
    });

    it('should reject an unsupported Pyth version', () => {
        expect(() => parsePythInstructionType(rawPythInstruction([...u32(1), ...u32(0)]))).toThrow(
            'Unsupported Pyth version: 1',
        );
    });

    it('should reject an index no instruction uses', () => {
        expect(() => parsePythInstructionType(rawPythInstruction([...u32(2), ...u32(14)]))).toThrow(
            'Unknown Pyth instruction index: 14',
        );
    });

    it('should reject data whose instruction index does not match the decoder', () => {
        expect(() => decodeInitMapping(pythInstruction('AddMapping'))).toThrow('instruction index mismatch 1 != 0');
    });
});

/** Addresses as base58, so a wrong account reads as a wrong string rather than an opaque object diff. */
function asBase58(params: object): Record<string, unknown> {
    return Object.fromEntries(
        Object.entries(params).map(([key, value]) => [key, value instanceof PublicKey ? value.toBase58() : value]),
    );
}
