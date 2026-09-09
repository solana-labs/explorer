import { describe, expect, it } from 'vitest';

import { PYTH_HEADER_SIZE, PYTH_INSTRUCTION_VERSION, PYTH_INSTRUCTIONS, pythInstructionTypeAt } from '../instructions';

// Every other test reads its expectation from this table, so a self-consistent edit to it would pass
// them all. These literals are the only copy checked against pyth-client's oracle.h.
describe('PYTH_INSTRUCTIONS', () => {
    it('should key each instruction to its wire index and display name', () => {
        expect(PYTH_INSTRUCTIONS).toEqual({
            AddMapping: { index: 1, name: 'Add Mapping Account' },
            AddPrice: { index: 4, name: 'Add Price Account' },
            AddProduct: { index: 2, name: 'Add Product' },
            AddPublisher: { index: 5, name: 'Add Publisher' },
            AggregatePrice: { index: 8, name: 'Aggregate Price' },
            DeletePublisher: { index: 6, name: 'Delete Publisher' },
            InitMapping: { index: 0, name: 'Init Mapping Account' },
            InitPrice: { index: 9, name: 'Init Price Account' },
            InitTest: { index: 10, name: 'Init Test' },
            SetMinPublishers: { index: 12, name: 'Set Minimum Number Of Publishers' },
            UpdatePrice: { index: 7, name: 'Update Price' },
            UpdatePriceNoFailOnError: { index: 13, name: 'Update Price (No Fail On Error)' },
            UpdateProduct: { index: 3, name: 'Update Product' },
            UpdateTest: { index: 11, name: 'Update Test' },
        });
    });

    // A collision makes the index map resolve one instruction under the other's name.
    it('should key every instruction by a distinct index', () => {
        const indexes = Object.values(PYTH_INSTRUCTIONS).map(({ index }) => index);
        expect(new Set(indexes).size).toBe(indexes.length);
    });

    it('should resolve an index back to its instruction', () => {
        expect(pythInstructionTypeAt(7)).toBe('UpdatePrice');
        expect(pythInstructionTypeAt(14)).toBeUndefined();
    });

    it('should pin the wire header', () => {
        expect(PYTH_INSTRUCTION_VERSION).toBe(2);
        expect(PYTH_HEADER_SIZE).toBe(8);
    });
});
