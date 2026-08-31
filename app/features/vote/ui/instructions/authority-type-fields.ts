import { type InstructionFieldList, preformatted, text } from '@entities/instruction-card';

import type { VoteAuthorityType } from '../../lib/instruction-types';

export function authorityTypeFields(authorityType: VoteAuthorityType): InstructionFieldList {
    if (typeof authorityType !== 'object') {
        return [text('Authority Type', authorityType)];
    }

    const { bls_proof_of_possession, bls_pubkey } = authorityType.VoterWithBLS;
    return [
        text('Authority Type', 'Voter (BLS)'),
        preformatted('BLS Pubkey', Buffer.from(bls_pubkey).toString('base64')),
        preformatted('BLS Proof of Possession', Buffer.from(bls_proof_of_possession).toString('base64')),
    ];
}
