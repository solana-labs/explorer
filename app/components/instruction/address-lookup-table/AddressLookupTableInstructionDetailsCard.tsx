import { Address } from '@components/common/Address';
import { ParsedInstruction, ParsedTransaction, PublicKey, SignatureResult } from '@solana/web3.js';
import { camelToTitleCase } from '@utils/index';
import { ParsedInfo } from '@validators/index';
import React from 'react';
import { create, Struct } from 'superstruct';

import { InstructionCard } from '../InstructionCard';
import { UnknownDetailsCard } from '../UnknownDetailsCard';
import {
    CloseLookupTableInfo,
    CreateLookupTableInfo,
    DeactivateLookupTableInfo,
    ExtendLookupTableInfo,
    FreezeLookupTableInfo,
} from './types';

type DetailsProps = {
    tx: ParsedTransaction;
    ix: ParsedInstruction;
    result: SignatureResult;
    index: number;
    innerCards?: JSX.Element[];
    childIndex?: number;
};

export function AddressLookupTableInstructionDetailsCard(props: DetailsProps) {
    try {
        const parsed = create(props.ix.parsed, ParsedInfo);
        switch (parsed.type) {
            case 'createLookupTable': {
                return renderDetails<CreateLookupTableInfo>(props, parsed, CreateLookupTableInfo);
            }
            case 'extendLookupTable': {
                return renderDetails<ExtendLookupTableInfo>(props, parsed, ExtendLookupTableInfo);
            }
            case 'freezeLookupTable': {
                return renderDetails<FreezeLookupTableInfo>(props, parsed, FreezeLookupTableInfo);
            }
            case 'deactivateLookupTable': {
                return renderDetails<DeactivateLookupTableInfo>(props, parsed, DeactivateLookupTableInfo);
            }
            case 'closeLookupTable': {
                return renderDetails<CloseLookupTableInfo>(props, parsed, CloseLookupTableInfo);
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

function renderDetails<T extends object>(props: DetailsProps, parsed: ParsedInfo, struct: Struct<T>) {
    const info = create(parsed.info, struct);

    const attributes: JSX.Element[] = [];
    for (const entry of Object.entries<any>(info)) {
        const key = entry[0];
        let value = entry[1];
        if (value instanceof PublicKey) {
            value = <Address pubkey={value} alignRight link />;
        } else if (key === 'newAddresses') {
            value = value.map((pubkey: PublicKey, index: number) => (
                <Address key={index} pubkey={pubkey} alignRight link />
            ));
        }

        attributes.push(
            <tr key={key}>
                <td>{camelToTitleCase(key)}</td>
                <td className="text-lg-end">{value}</td>
            </tr>
        );
    }

    return (
        <InstructionCard {...props} title={`Address Lookup Table Program: ${camelToTitleCase(parsed.type)}`}>
            <tr>
                <td>Program</td>
                <td className="text-lg-end">
                    <Address pubkey={props.ix.programId} alignRight link />
                </td>
            </tr>
            {attributes}
        </InstructionCard>
    );
}
