import { ParsedInstruction, ParsedTransaction, SignatureResult } from '@solana/web3.js';
import { ParsedInfo } from '@validators/index';
import React from 'react';
import { create } from 'superstruct';

import { UnknownDetailsCard } from '../UnknownDetailsCard';
import { AllocateDetailsCard } from './AllocateDetailsCard';
import { AllocateWithSeedDetailsCard } from './AllocateWithSeedDetailsCard';
import { AssignDetailsCard } from './AssignDetailsCard';
import { AssignWithSeedDetailsCard } from './AssignWithSeedDetailsCard';
import { CreateDetailsCard } from './CreateDetailsCard';
import { CreateWithSeedDetailsCard } from './CreateWithSeedDetailsCard';
import { NonceAdvanceDetailsCard } from './NonceAdvanceDetailsCard';
import { NonceAuthorizeDetailsCard } from './NonceAuthorizeDetailsCard';
import { NonceInitializeDetailsCard } from './NonceInitializeDetailsCard';
import { NonceWithdrawDetailsCard } from './NonceWithdrawDetailsCard';
import { TransferDetailsCard } from './TransferDetailsCard';
import { TransferWithSeedDetailsCard } from './TransferWithSeedDetailsCard';
import {
    AdvanceNonceInfo,
    AllocateInfo,
    AllocateWithSeedInfo,
    AssignInfo,
    AssignWithSeedInfo,
    AuthorizeNonceInfo,
    CreateAccountInfo,
    CreateAccountWithSeedInfo,
    InitializeNonceInfo,
    TransferInfo,
    TransferWithSeedInfo,
    UpgradeNonceInfo,
    WithdrawNonceInfo,
} from './types';
import { UpgradeNonceDetailsCard } from './UpgradeNonceDetailsCard';

type DetailsProps = {
    tx: ParsedTransaction;
    ix: ParsedInstruction;
    result: SignatureResult;
    index: number;
    innerCards?: JSX.Element[];
    childIndex?: number;
};

export function SystemDetailsCard(props: DetailsProps) {
    try {
        const parsed = create(props.ix.parsed, ParsedInfo);
        switch (parsed.type) {
            case 'createAccount': {
                const info = create(parsed.info, CreateAccountInfo);
                return <CreateDetailsCard info={info} {...props} />;
            }
            case 'createAccountWithSeed': {
                const info = create(parsed.info, CreateAccountWithSeedInfo);
                return <CreateWithSeedDetailsCard info={info} {...props} />;
            }
            case 'allocate': {
                const info = create(parsed.info, AllocateInfo);
                return <AllocateDetailsCard info={info} {...props} />;
            }
            case 'allocateWithSeed': {
                const info = create(parsed.info, AllocateWithSeedInfo);
                return <AllocateWithSeedDetailsCard info={info} {...props} />;
            }
            case 'assign': {
                const info = create(parsed.info, AssignInfo);
                return <AssignDetailsCard info={info} {...props} />;
            }
            case 'assignWithSeed': {
                const info = create(parsed.info, AssignWithSeedInfo);
                return <AssignWithSeedDetailsCard info={info} {...props} />;
            }
            case 'transfer': {
                const info = create(parsed.info, TransferInfo);
                return <TransferDetailsCard info={info} {...props} />;
            }
            case 'advanceNonce': {
                const info = create(parsed.info, AdvanceNonceInfo);
                return <NonceAdvanceDetailsCard info={info} {...props} />;
            }
            case 'withdrawNonce': {
                const info = create(parsed.info, WithdrawNonceInfo);
                return <NonceWithdrawDetailsCard info={info} {...props} />;
            }
            case 'authorizeNonce': {
                const info = create(parsed.info, AuthorizeNonceInfo);
                return <NonceAuthorizeDetailsCard info={info} {...props} />;
            }
            case 'initializeNonce': {
                const info = create(parsed.info, InitializeNonceInfo);
                return <NonceInitializeDetailsCard info={info} {...props} />;
            }
            case 'transferWithSeed': {
                const info = create(parsed.info, TransferWithSeedInfo);
                return <TransferWithSeedDetailsCard info={info} {...props} />;
            }
            case 'upgradeNonce': {
                const info = create(parsed.info, UpgradeNonceInfo);
                return <UpgradeNonceDetailsCard info={info} {...props} />;
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
