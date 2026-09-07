import { describe, expect, it } from 'vitest';

import { orderMintsByVerification } from '../order-mints-by-verification';
import type { TokenInfo } from '../types';

function tokenInfo(address: string, verified?: boolean): TokenInfo {
    return { address, decimals: 6, logoURI: null, name: address, symbol: address, verified };
}

function infos(...tokens: TokenInfo[]): ReadonlyMap<string, TokenInfo> {
    return new Map(tokens.map(token => [token.address, token]));
}

describe('orderMintsByVerification', () => {
    it('should put verified mints first, then listed, then unknown', () => {
        const mints = ['unknown', 'listed', 'verified'];

        expect(orderMintsByVerification(mints, infos(tokenInfo('verified', true), tokenInfo('listed', false)))).toEqual(
            ['verified', 'listed', 'unknown'],
        );
    });

    it('should keep the incoming order within a tier', () => {
        const mints = ['v1', 'u1', 'v2', 'u2', 'v3'];
        const tokenInfos = infos(tokenInfo('v1', true), tokenInfo('v2', true), tokenInfo('v3', true));

        expect(orderMintsByVerification(mints, tokenInfos)).toEqual(['v1', 'v2', 'v3', 'u1', 'u2']);
    });

    it('should be idempotent, so re-ordering an ordered list does not move rows', () => {
        const mints = ['a', 'b', 'c', 'd'];
        const tokenInfos = infos(tokenInfo('c', true), tokenInfo('a', false));

        const once = orderMintsByVerification(mints, tokenInfos);
        expect(orderMintsByVerification(once, tokenInfos)).toEqual(once);
    });

    it('should treat a listed mint with no verified flag as unverified rather than verified', () => {
        const tokenInfos = infos(tokenInfo('listed'), tokenInfo('verified', true));

        expect(orderMintsByVerification(['listed', 'verified'], tokenInfos)).toEqual(['verified', 'listed']);
    });

    it('should preserve every mint, including duplicates', () => {
        const mints = ['dup', 'verified', 'dup'];

        expect(orderMintsByVerification(mints, infos(tokenInfo('verified', true)))).toEqual(['verified', 'dup', 'dup']);
    });

    it('should fall back to the incoming order when no metadata resolved', () => {
        const mints = ['a', 'b', 'c'];

        expect(orderMintsByVerification(mints, new Map())).toEqual(mints);
    });

    it('should handle an empty list', () => {
        expect(orderMintsByVerification([], new Map())).toEqual([]);
    });
});
