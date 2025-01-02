import { PublicKey, SignatureResult, TransactionInstruction } from '@solana/web3.js';
import {
    EquatableOperator,
    identifyLighthouseInstruction,
    IntegerOperator,
    LighthouseInstruction,
    parseAssertAccountDataInstruction,
    parseAssertAccountDataMultiInstruction,
    parseAssertAccountDeltaInstruction,
    parseAssertAccountInfoInstruction,
    parseAssertAccountInfoMultiInstruction,
    parseAssertBubblegumTreeConfigAccountInstruction,
    parseAssertMerkleTreeAccountInstruction,
    parseAssertMintAccountInstruction,
    parseAssertMintAccountMultiInstruction,
    parseAssertStakeAccountInstruction,
    parseAssertStakeAccountMultiInstruction,
    parseAssertSysvarClockInstruction,
    parseAssertTokenAccountInstruction,
    parseAssertTokenAccountMultiInstruction,
    parseAssertUpgradeableLoaderAccountInstruction,
    parseAssertUpgradeableLoaderAccountMultiInstruction,
    parseMemoryCloseInstruction,
    parseMemoryWriteInstruction,
} from 'lighthouse-sdk';
import React from 'react';
import { CornerDownRight } from 'react-feather';
import { AccountRole, Address as TAddress, address, IAccountMeta, IInstruction } from 'web3js-experimental';

import { camelToTitleCase } from '@/app/utils';
import { ExpandableRow } from '@/app/utils/anchor';

import { Address } from '../../common/Address';
import { InstructionCard } from '../InstructionCard';
import { LIGHTHOUSE_ADDRESS } from './types';

function upcastTransactionInstruction(ix: TransactionInstruction) {
    return {
        accounts: ix.keys.map(key => ({
            address: address(key.pubkey.toBase58()),
            role: key.isSigner
                ? key.isWritable
                    ? AccountRole.WRITABLE_SIGNER
                    : AccountRole.READONLY_SIGNER
                : key.isWritable
                ? AccountRole.WRITABLE
                : AccountRole.READONLY,
        })),
        data: ix.data,
        programAddress: address(ix.programId.toBase58()),
    };
}

type ParsedCodamaInstruction = {
    programAddress: TAddress;
    accounts?: Record<string, IAccountMeta>;
    data: any;
};

export function LighthouseDetailsCard({
    ix,
    index,
    result,
    innerCards,
    childIndex,
}: {
    ix: TransactionInstruction;
    index: number;
    result: SignatureResult;
    innerCards?: JSX.Element[];
    childIndex?: number;
}) {
    const _ix = upcastTransactionInstruction(ix);
    const { title, info } = parseLighthouseInstruction(_ix);

    return (
        <InstructionCard title={`Lighthouse: ${title}`} {...{ childIndex, index, innerCards, ix, result }}>
            <CodamaCard ix={_ix} parsedIx={info} />
        </InstructionCard>
    );
}

function parseLighthouseInstruction(ix: ReturnType<typeof upcastTransactionInstruction>) {
    let title = 'Unknown';
    let info: ParsedCodamaInstruction;
    const subEnum = (pix: ParsedCodamaInstruction, key: string, array = false) => {
        if (array) {
            const assertions = pix.data[key].map((assertion: Parameters<typeof renderEnumsAsStrings>[0]) =>
                renderEnumsAsStrings(assertion)
            );
            pix.data[key] = assertions;
        } else {
            pix.data[key] = renderEnumsAsStrings(pix.data[key]);
        }
        return pix;
    };

    switch (identifyLighthouseInstruction(ix)) {
        case LighthouseInstruction.MemoryClose:
            title = 'Memory Close';
            info = parseMemoryCloseInstruction(ix);
            return { info, title };
        case LighthouseInstruction.MemoryWrite:
            title = 'Memory Write';
            info = parseMemoryWriteInstruction(ix);
            return { info, title };
        case LighthouseInstruction.AssertMerkleTreeAccount:
            title = 'Assert Merkle Tree Account';
            info = subEnum(parseAssertMerkleTreeAccountInstruction(ix), 'assertion');
            return { info, title };
        case LighthouseInstruction.AssertMintAccount:
            title = 'Assert Mint Account';
            info = subEnum(parseAssertMintAccountInstruction(ix), 'assertion');
            return { info, title };
        case LighthouseInstruction.AssertAccountData:
            title = 'Assert Account Data';
            info = subEnum(parseAssertAccountDataInstruction(ix), 'assertion');
            return { info, title };
        case LighthouseInstruction.AssertAccountDataMulti:
            title = 'Assert Account Data Multi';
            info = subEnum(parseAssertAccountDataMultiInstruction(ix), 'assertion');
            return { info, title };
        case LighthouseInstruction.AssertTokenAccount:
            title = 'Assert Token Account';
            info = subEnum(parseAssertTokenAccountInstruction(ix), 'assertion');
            return { info, title };
        case LighthouseInstruction.AssertAccountDelta:
            title = 'Assert Account Delta';
            info = subEnum(parseAssertAccountDeltaInstruction(ix), 'assertion');
            return { info, title };
        case LighthouseInstruction.AssertAccountInfo:
            title = 'Assert Account Info';
            info = subEnum(parseAssertAccountInfoInstruction(ix), 'assertion');
            return { info, title };
        case LighthouseInstruction.AssertAccountInfoMulti:
            title = 'Assert Account Info Multi';
            info = subEnum(parseAssertAccountInfoMultiInstruction(ix), 'assertions', true);
            return { info, title };
        case LighthouseInstruction.AssertMintAccountMulti:
            title = 'Assert Mint Account Multi';
            info = subEnum(parseAssertMintAccountMultiInstruction(ix), 'assertions', true);
            return { info, title };
        case LighthouseInstruction.AssertTokenAccountMulti:
            title = 'Assert Token Account Multi';
            info = subEnum(parseAssertTokenAccountMultiInstruction(ix), 'assertions', true);
            return { info, title };
        case LighthouseInstruction.AssertStakeAccount:
            title = 'Assert Stake Account';
            info = subEnum(parseAssertStakeAccountInstruction(ix), 'assertion');
            return { info, title };
        case LighthouseInstruction.AssertStakeAccountMulti:
            title = 'Assert Stake Account Multi';
            info = subEnum(parseAssertStakeAccountMultiInstruction(ix), 'assertions', true);
            return { info, title };
        case LighthouseInstruction.AssertUpgradeableLoaderAccount:
            title = 'Assert Upgradeable Loader Account';
            info = subEnum(parseAssertUpgradeableLoaderAccountInstruction(ix), 'assertion');
            return { info, title };
        case LighthouseInstruction.AssertUpgradeableLoaderAccountMulti:
            title = 'Assert Upgradeable Loader Account Multi';
            info = subEnum(parseAssertUpgradeableLoaderAccountMultiInstruction(ix), 'assertions', true);
            return { info, title };
        case LighthouseInstruction.AssertSysvarClock:
            title = 'Assert Sysvar Clock';
            info = subEnum(parseAssertSysvarClockInstruction(ix), 'assertion');
            return { info, title };
        case LighthouseInstruction.AssertBubblegumTreeConfigAccount:
            title = 'Assert Bubblegum Tree Config Account';
            info = subEnum(parseAssertBubblegumTreeConfigAccountInstruction(ix), 'assertion');
            return { info, title };
    }
}

// First define the field types
type IntegerAssertion = {
    __kind: (typeof INTEGER_ASSERTION_KINDS)[number];
    operator: IntegerOperator;
};

type EquatableAssertion = {
    __kind: (typeof EQUATABLE_ASSERTION_KINDS)[number];
    operator: EquatableOperator;
};

type NoOperatorAssertion = {
    __kind: 'VerifyDatahash' | 'VerifyLeaf' | 'TokenAccountOwnerIsDerived';
};

type OffsetAssertion = {
    offset: number;
    assertion: Assertion;
};

type Assertion = IntegerAssertion | EquatableAssertion | ComplexAssertion | NoOperatorAssertion;

type ComplexAssertion = {
    __kind: 'MetaAssertion' | 'StakeAssertion' | 'Buffer' | 'Program' | 'ProgramData';
    fields: Assertion[];
};

function renderEnumsAsStrings(assertion: Assertion | OffsetAssertion): any {
    // Handle offset assertion & AccountInfo assertion
    if ('offset' in assertion || 'assertion' in assertion) {
        return {
            ...assertion,
            assertion: renderEnumsAsStrings((assertion as { assertion: Assertion }).assertion),
        };
    }

    // Handle integer assertions
    if (isIntegerAssertion(assertion)) {
        return {
            ...assertion,
            operator: renderIntegerOperator(assertion.operator),
        };
    }

    // Handle equatable assertions
    if (isEquatableAssertion(assertion)) {
        return {
            ...assertion,
            operator: renderEquatableOperator(assertion.operator),
        };
    }

    // Handle complex assertions with fields
    if (isComplexAssertion(assertion)) {
        return {
            ...assertion,
            fields: assertion.fields.map(field => {
                let operator = '';
                if (isIntegerAssertion(field)) {
                    operator = renderIntegerOperator(field.operator);
                } else if (isEquatableAssertion(field)) {
                    operator = renderEquatableOperator(field.operator);
                }
                return { ...field, operator };
            }),
        };
    }

    return assertion;
}

const INTEGER_ASSERTION_KINDS = [
    'State',
    'U8',
    'I8',
    'U16',
    'I16',
    'U32',
    'I32',
    'U64',
    'I64',
    'I128',
    'U128',
    'Lamports',
    'DataLength',
    'RentEpoch',
    'TotalMintCapacity',
    'NumMinted',
    'Supply',
    'Decimals',
    'Amount',
    'DelegatedAmount',
    'RentExemptReserve',
    'LockupEpoch',
    'LockupUnixTimestamp',
    'DelegationStake',
    'DelegationActivationEpoch',
    'DelegationDeactivationEpoch',
    'CreditsObserved',
    'Slot',
    'RentExemptReserve',
    'LockupEpoch',
    'LockupUnixTimestamp',
];

const EQUATABLE_ASSERTION_KINDS = [
    'StakeFlags',
    'CloseAuthority',
    'Delegate',
    'IsNative',
    'Mint',
    'FreezeAuthority',
    'IsInitialized',
    'Pubkey',
    'MintAuthority',
    'TreeCreator',
    'TreeDelegate',
    'Bytes',
    'IsPublic',
    'IsDecompressible',
    'UpgradeAuthority',
    'AuthorizedWithdrawer',
    'LockupCustodian',
    'AuthorizedStaker',
    'DelegationVoterPubkey',
    'Authority',
    'ProgramDataAddress',
    'KnownOwner',
    'IsSigner',
    'IsWritable',
    'Executable',
    'Bool',
    'Owner',
];

function isIntegerAssertion(assertion: Assertion): assertion is IntegerAssertion {
    return INTEGER_ASSERTION_KINDS.includes(assertion.__kind);
}

function isEquatableAssertion(assertion: Assertion): assertion is EquatableAssertion {
    return EQUATABLE_ASSERTION_KINDS.includes(assertion.__kind);
}

function isComplexAssertion(assertion: Assertion): assertion is ComplexAssertion {
    return ['MetaAssertion', 'StakeAssertion', 'Buffer', 'Program', 'ProgramData'].includes(assertion.__kind);
}

function renderIntegerOperator(operator: IntegerOperator) {
    switch (operator) {
        case IntegerOperator.Equal:
            return '=';
        case IntegerOperator.NotEqual:
            return '!=';
        case IntegerOperator.GreaterThan:
            return '>';
        case IntegerOperator.LessThan:
            return '<';
        case IntegerOperator.GreaterThanOrEqual:
            return '>=';
        case IntegerOperator.LessThanOrEqual:
            return '<=';
        case IntegerOperator.Contains:
            return 'contains';
        case IntegerOperator.DoesNotContain:
            return 'does not contain';
    }
}

function renderEquatableOperator(operator: EquatableOperator) {
    switch (operator) {
        case EquatableOperator.Equal:
            return '=';
        case EquatableOperator.NotEqual:
            return '!=';
    }
}

function CodamaCard({ ix, parsedIx }: { ix: IInstruction; parsedIx: ParsedCodamaInstruction }) {
    const programName = 'Lighthouse';
    const programId = new PublicKey(LIGHTHOUSE_ADDRESS);

    const parsedAccountsLength = parsedIx.accounts ? Object.keys(parsedIx.accounts).length : 0;
    const accountMap = parsedIx.accounts
        ? new Map(Object.entries(parsedIx.accounts).map(([key, value]) => [value.address, key]))
        : new Map();
    return (
        <>
            <tr>
                <td>Program</td>
                <td className="text-lg-end" colSpan={2}>
                    <Address pubkey={programId} alignRight link raw overrideText={programName} />
                </td>
            </tr>
            <tr className="table-sep">
                <td>Account Name</td>
                <td className="text-lg-end" colSpan={2}>
                    Address
                </td>
            </tr>
            {ix.accounts?.map(({ address, role }, keyIndex) => {
                return (
                    <tr key={keyIndex} data-testid={`account-row-${keyIndex}`}>
                        <td>
                            <div className="me-2 d-md-inline">
                                {parsedIx.accounts
                                    ? keyIndex < parsedAccountsLength
                                        ? `${camelToTitleCase(accountMap.get(address) ?? 'Unknown')}`
                                        : `Remaining Account #${keyIndex + 1 - parsedAccountsLength}`
                                    : `Account #${keyIndex + 1}`}
                            </div>
                            {role == AccountRole.WRITABLE ||
                                (role == AccountRole.WRITABLE_SIGNER && (
                                    <span className="badge bg-danger-soft me-1">Writable</span>
                                ))}
                            {role == AccountRole.READONLY_SIGNER ||
                                (role == AccountRole.WRITABLE_SIGNER && (
                                    <span className="badge bg-info-soft me-1">Signer</span>
                                ))}
                        </td>
                        <td className="text-lg-end" colSpan={2}>
                            <Address pubkey={new PublicKey(address)} alignRight link />
                        </td>
                    </tr>
                );
            })}

            {parsedIx.data && (
                <>
                    <tr className="table-sep">
                        <td>Argument Name</td>
                        <td>Type</td>
                        <td className="text-lg-end">Value</td>
                    </tr>
                    {mapIxArgsToRows(parsedIx.data)}
                </>
            )}
        </>
    );
}

function mapIxArgsToRows(data: any, nestingLevel = 0) {
    return Object.entries(data).map(([key, value], index) => {
        if (key === '__kind' || key === 'discriminator' || key === '__option') {
            return null;
        }

        let type = 'unknown';

        const baseKey = `${nestingLevel}-${index}`;
        if (Array.isArray(value)) {
            type = `Array[${value.length}]`;
            return (
                <ExpandableRow
                    key={`${nestingLevel}-${index}`}
                    fieldName={key}
                    fieldType={type}
                    nestingLevel={nestingLevel}
                    data-testid={`ix-args-${baseKey}`}
                >
                    {value.map((item, i) => {
                        if (typeof item === 'object') {
                            return (
                                <React.Fragment key={`${baseKey}-${i}`}>
                                    {mapIxArgsToRows({ [`#${i}`]: item }, nestingLevel + 1)}
                                </React.Fragment>
                            );
                        }
                        return (
                            <tr key={`${baseKey}-${i}`} data-testid={`ix-args-${baseKey}-${i}`}>
                                <td>
                                    <div className="d-flex align-items-center">
                                        <div className="me-2">{`#${i}`}</div>
                                    </div>
                                </td>
                                <td>{typeof item}</td>
                                <td className="text-lg-end">{String(item)}</td>
                            </tr>
                        );
                    })}
                </ExpandableRow>
            );
        }

        type = inferType(value);

        if (typeof value === 'object' && value !== null) {
            return (
                <ExpandableRow
                    key={baseKey}
                    fieldName={key}
                    fieldType={type}
                    nestingLevel={nestingLevel}
                    data-testid={`ix-args-${baseKey}`}
                >
                    {mapIxArgsToRows(value, nestingLevel + 1)}
                </ExpandableRow>
            );
        }

        let displayValue;
        if (type === 'pubkey') {
            displayValue = <Address pubkey={new PublicKey(value as string)} alignRight link />;
        } else {
            displayValue = <>{String(value)}</>;
        }

        return (
            <tr key={baseKey} data-testid={`ix-args-${baseKey}`}>
                <td className="d-flex flex-row">
                    {nestingLevel > 0 && (
                        <span style={{ paddingLeft: `${15 * nestingLevel}px` }}>
                            <CornerDownRight className="me-2" size={15} />
                        </span>
                    )}
                    <div>{key}</div>
                </td>
                <td>{type}</td>
                <td className="text-lg-end">{displayValue}</td>
            </tr>
        );
    });
}

function inferType(value: any) {
    if (value.__kind) {
        return value.__kind;
    } else if (value.__option) {
        return `Option(${value.__option})`;
    } else if (typeof value === 'string') {
        try {
            new PublicKey(value);
            return 'pubkey';
        } catch {
            return 'string';
        }
    } else if (typeof value === 'number') {
        return 'number';
    } else if (typeof value === 'bigint') {
        return 'bignum';
    } else {
        return typeof value;
    }
}
