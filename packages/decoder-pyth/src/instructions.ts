export const PYTH_INSTRUCTION_TYPES = [
    'AddMapping',
    'AddPrice',
    'AddProduct',
    'AddPublisher',
    'AggregatePrice',
    'DeletePublisher',
    'InitMapping',
    'InitPrice',
    'InitTest',
    'SetMinPublishers',
    'UpdatePrice',
    'UpdatePriceNoFailOnError',
    'UpdateProduct',
    'UpdateTest',
] as const;

export type PythInstructionType = (typeof PYTH_INSTRUCTION_TYPES)[number];

/** One table, so no two places can word the same instruction differently. Names are unprefixed. */
export const PYTH_INSTRUCTIONS = {
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
} as const satisfies Record<PythInstructionType, { index: number; name: string }>;

/** The only header version the oracle has ever shipped; anything else is not a Pyth instruction. */
export const PYTH_INSTRUCTION_VERSION = 2;

export const PYTH_HEADER_SIZE = 8;

const BY_INDEX = new Map<number, PythInstructionType>(
    PYTH_INSTRUCTION_TYPES.map((type): [number, PythInstructionType] => [PYTH_INSTRUCTIONS[type].index, type]),
);

export function pythInstructionTypeAt(index: number): PythInstructionType | undefined {
    return BY_INDEX.get(index);
}
