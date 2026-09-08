import type { InstructionNode } from '@entities/instruction-card';
import { InstructionDetailsProps } from '@features/transaction';
import { useCluster } from '@providers/cluster';
import { ParsedInfo } from '@validators/index';
import { create } from 'superstruct';

import { CloseLookupTableDetailsCard } from '@/app/components/instruction/address-lookup-table/CloseLookupTableDetails';
import { CreateLookupTableDetailsCard } from '@/app/components/instruction/address-lookup-table/CreateLookupTableDetails';
import { DeactivateLookupTableDetailsCard } from '@/app/components/instruction/address-lookup-table/DeactivateLookupTableDetails';
import { ExtendLookupTableDetailsCard } from '@/app/components/instruction/address-lookup-table/ExtendLookupTableDetails';
import { FreezeLookupTableDetailsCard } from '@/app/components/instruction/address-lookup-table/FreezeLookupTableDetails';
import {
    CloseLookupTableInfo,
    CreateLookupTableInfo,
    DeactivateLookupTableInfo,
    ExtendLookupTableInfo,
    FreezeLookupTableInfo,
} from '@/app/components/instruction/address-lookup-table/types';
import { UnknownDetailsCard } from '@/app/components/instruction/UnknownDetailsCard';
import { Logger } from '@/app/shared/lib/logger';

export function AddressLookupTableDetailsCard(props: InstructionDetailsProps) {
    const { ix } = props;
    const { url } = useCluster();

    const node: InstructionNode = {
        childIndex: props.childIndex,
        index: props.index,
        innerCards: props.innerCards,
        ix,
        programId: ix.programId,
    };

    try {
        const parsed = create(ix.parsed, ParsedInfo);
        switch (parsed.type) {
            case 'createLookupTable': {
                const info = create(parsed.info, CreateLookupTableInfo);
                return <CreateLookupTableDetailsCard info={info} node={node} />;
            }
            case 'extendLookupTable': {
                const info = create(parsed.info, ExtendLookupTableInfo);
                return <ExtendLookupTableDetailsCard info={info} node={node} />;
            }
            case 'freezeLookupTable': {
                const info = create(parsed.info, FreezeLookupTableInfo);
                return <FreezeLookupTableDetailsCard info={info} node={node} />;
            }
            case 'deactivateLookupTable': {
                const info = create(parsed.info, DeactivateLookupTableInfo);
                return <DeactivateLookupTableDetailsCard info={info} node={node} />;
            }
            case 'closeLookupTable': {
                const info = create(parsed.info, CloseLookupTableInfo);
                return <CloseLookupTableDetailsCard info={info} node={node} />;
            }
            default:
                return <UnknownDetailsCard {...props} />;
        }
    } catch (error) {
        Logger.error(error, {
            signature: props.tx.signatures[0],
            url,
        });
        return <UnknownDetailsCard {...props} />;
    }
}
