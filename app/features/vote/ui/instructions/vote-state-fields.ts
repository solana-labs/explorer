import { type InstructionFieldList, preformatted, timestamp } from '@entities/instruction-card';

import type { Lockout } from '../../lib/instruction-types';

type VoteState = {
    blockId?: string;
    hash: string;
    lockouts: Lockout[];
    root?: number | null;
    timestamp?: number | null;
};

// Shared rows for the tower payload of updatevotestate*/towersync* instructions.
export function voteStateFields(voteState: VoteState): InstructionFieldList {
    return [
        preformatted('Vote Hash', voteState.hash),
        voteState.blockId !== undefined && preformatted('Block Id', voteState.blockId),
        typeof voteState.root === 'number' && preformatted('Root Slot', [voteState.root]),
        voteState.timestamp ? timestamp('Timestamp', voteState.timestamp) : undefined,
        preformatted(
            'Slots (Confirmation Count)',
            voteState.lockouts.map(lockout => `${lockout.slot} (${lockout.confirmation_count})`),
        ),
    ];
}
