import { describe, expect, it } from 'vitest';

import { PYTH_ORACLE_PROGRAM_IDS, PYTH_ORACLE_PROGRAM_LABEL, PYTH_PROGRAM_IDS } from '../program-ids';

describe('pyth program ids', () => {
    // Detection and the app's program registry both key off these, so a dropped cluster silently
    // unnames every Pyth instruction on it.
    it('should pin the oracle deployment on each cluster', () => {
        expect(PYTH_ORACLE_PROGRAM_IDS).toEqual({
            devnet: 'gSbePebfvPy7tRqimPoVecS2UsBvYv46ynrzWocc92s',
            mainnet: 'FsJ3A3u2vn5cTVofAjvy6y5kwABJAqYWpe4975bi2epH',
            testnet: '8tfDNiaEyrV6Q1U4DEXrEigs9DoDtkugzFbybENEbCDz',
        });
    });

    it('should list every deployment for detection', () => {
        expect(PYTH_PROGRAM_IDS).toEqual(Object.values(PYTH_ORACLE_PROGRAM_IDS));
        expect(PYTH_PROGRAM_IDS).toHaveLength(3);
    });

    it('should pin the display label', () => {
        expect(PYTH_ORACLE_PROGRAM_LABEL).toBe('Pyth Oracle Program');
    });
});
