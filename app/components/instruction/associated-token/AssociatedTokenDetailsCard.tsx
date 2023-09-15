import { ParsedInstruction, ParsedTransaction, SignatureResult } from '@solana/web3.js';
import { ParsedInfo } from '@validators/index';
import React from 'react';
import { create } from 'superstruct';

import { UnknownDetailsCard } from '../UnknownDetailsCard';
import { CreateDetailsCard } from './CreateDetailsCard';
import { CreateIdempotentDetailsCard } from './CreateIdempotentDetailsCard';
import { RecoverNestedDetailsCard } from './RecoverNestedDetailsCard';
import { CreateIdempotentInfo, RecoverNestedInfo } from './types';

type DetailsProps = {
    tx: ParsedTransaction;
    ix: ParsedInstruction;
    result: SignatureResult;
    index: number;
    innerCards?: JSX.Element[];
    childIndex?: number;
};

export function AssociatedTokenDetailsCard(props: DetailsProps) {
    try {
        const parsed = create(props.ix.parsed, ParsedInfo);
        switch (parsed.type) {
            case 'create': {
                return <CreateDetailsCard {...props} />;
            }
            case 'createIdempotent': {
                const info = create(parsed.info, CreateIdempotentInfo);
                return <CreateIdempotentDetailsCard info={info} {...props} />;
            }
            case 'recoverNested': {
                const info = create(parsed.info, RecoverNestedInfo);
                return <RecoverNestedDetailsCard info={info} {...props} />;
            }
            default:
                return <UnknownDetailsCard {...props} />;
        }
    } catch (error) {
        console.error(error, {
            signature: props.tx.signatures[0],
        });
        return <UnknownDetailsCard {...props} />;
    }
}
