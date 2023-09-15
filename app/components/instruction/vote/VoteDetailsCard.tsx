import { Address } from '@components/common/Address';
import { InstructionDetailsProps } from '@components/transaction/InstructionsSection';
import { useCluster } from '@providers/cluster';
import { PublicKey } from '@solana/web3.js';
import { displayTimestamp } from '@utils/date';
import { camelToTitleCase } from '@utils/index';
import { ParsedInfo } from '@validators/index';
import React from 'react';
import { create, Struct } from 'superstruct';

import { InstructionCard } from '../InstructionCard';
import { UnknownDetailsCard } from '../UnknownDetailsCard';
import {
    AuthorizeInfo,
    UpdateCommissionInfo,
    UpdateValidatorInfo,
    VoteInfo,
    VoteSwitchInfo,
    WithdrawInfo,
} from './types';

export function VoteDetailsCard(props: InstructionDetailsProps) {
    const { url } = useCluster();

    try {
        const parsed = create(props.ix.parsed, ParsedInfo);

        switch (parsed.type) {
            case 'vote':
                return renderDetails<VoteInfo>(props, parsed, VoteInfo);
            case 'authorize':
                return renderDetails<AuthorizeInfo>(props, parsed, AuthorizeInfo);
            case 'withdraw':
                return renderDetails<WithdrawInfo>(props, parsed, WithdrawInfo);
            case 'updateValidator':
                return renderDetails<UpdateValidatorInfo>(props, parsed, UpdateValidatorInfo);
            case 'updateCommission':
                return renderDetails<UpdateCommissionInfo>(props, parsed, UpdateCommissionInfo);
            case 'voteSwitch':
                return renderDetails<VoteSwitchInfo>(props, parsed, VoteSwitchInfo);
        }
    } catch (error) {
        console.error(error, {
            url,
        });
    }

    return <UnknownDetailsCard {...props} />;
}

function renderDetails<T extends object>(props: InstructionDetailsProps, parsed: ParsedInfo, struct: Struct<T>) {
    const info = create(parsed.info, struct);
    const attributes: JSX.Element[] = [];

    for (const entry of Object.entries<any>(info)) {
        const key = entry[0];
        let value = entry[1];
        if (value instanceof PublicKey) {
            value = <Address pubkey={value} alignRight link />;
        }

        if (key === 'vote') {
            attributes.push(
                <tr key="vote-hash">
                    <td>Vote Hash</td>
                    <td className="text-lg-end">
                        <pre className="d-inline-block text-start mb-0">{value.hash}</pre>
                    </td>
                </tr>
            );

            if (value.timestamp) {
                attributes.push(
                    <tr key="timestamp">
                        <td>Timestamp</td>
                        <td className="text-lg-end font-monospace">{displayTimestamp(value.timestamp * 1000)}</td>
                    </tr>
                );
            }

            attributes.push(
                <tr key="vote-slots">
                    <td>Slots</td>
                    <td className="text-lg-end font-monospace">
                        <pre className="d-inline-block text-start mb-0">{value.slots.join('\n')}</pre>
                    </td>
                </tr>
            );
        } else {
            attributes.push(
                <tr key={key}>
                    <td>{camelToTitleCase(key)} </td>
                    <td className="text-lg-end">{value}</td>
                </tr>
            );
        }
    }

    return (
        <InstructionCard {...props} title={`Vote: ${camelToTitleCase(parsed.type)}`}>
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
