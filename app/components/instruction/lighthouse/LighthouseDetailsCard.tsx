import { PublicKey, SignatureResult, TransactionInstruction } from '@solana/web3.js';
import {
    identifyLighthouseInstruction,
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
    IntegerOperator,
    EquatableOperator,
    AccountInfoAssertion,
    TokenAccountAssertion,
    MintAccountAssertion,
    StakeAccountAssertion,
    UpgradeableLoaderStateAssertion,
    MerkleTreeAssertion,
    BubblegumTreeConfigAssertion,
    DataValueAssertion,
} from 'lighthouse-sdk';
import { AccountRole, address, IAccountMeta, IInstruction, Address as TAddress } from 'web3js-experimental';

import { InstructionCard } from '../InstructionCard';
import { Address } from '../../common/Address';
import { LIGHTHOUSE_ADDRESS } from './types';
import { camelToTitleCase } from '@/app/utils';
import { ExpandableRow } from '@/app/utils/anchor';
import { AccountDataAssertion } from 'lighthouse-sdk/dist/types/hooked';
import { CornerDownRight } from 'react-feather';
import React from 'react';

function upcastTransactionInstruction(ix: TransactionInstruction): IInstruction {
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
    let _ix = upcastTransactionInstruction(ix);
    const { title, info } = parseLighthouseInstruction(_ix);

    return (
        <InstructionCard title={`Lighthouse: ${title}`} {...{ ix, index, childIndex, result, innerCards }}>
            <CodamaCard ix={_ix} parsedIx={info} />
        </InstructionCard>
    );
}
function parseLighthouseInstruction(ix: IInstruction) {
    let title = 'Unknown';
    let info: ParsedCodamaInstruction;
    const subEnum = (pix: ParsedCodamaInstruction, key: string, array: boolean = false) => {
        if (array) {
            pix.data[key].forEach((assertion: Parameters<typeof renderEnumsAsStrings>[0]) => {
                renderEnumsAsStrings(assertion);
            });
        } else {
            renderEnumsAsStrings(pix.data[key]);
        }
        return pix;
    };
    switch (identifyLighthouseInstruction(ix)) {
        case LighthouseInstruction.MemoryClose:
            title = 'Memory Close';
            info = parseMemoryCloseInstruction(ix);
            return { title, info };
        case LighthouseInstruction.MemoryWrite:
            title = 'Memory Write';
            info = parseMemoryWriteInstruction(ix);
            return { title, info };
        case LighthouseInstruction.AssertMerkleTreeAccount:
            title = 'Assert Merkle Tree Account';
            info = subEnum(parseAssertMerkleTreeAccountInstruction(ix), 'assertion');
            return { title, info };
        case LighthouseInstruction.AssertMintAccount:
            title = 'Assert Mint Account';
            info = subEnum(parseAssertMintAccountInstruction(ix), 'assertion');
            return { title, info };
        case LighthouseInstruction.AssertAccountData:
            title = 'Assert Account Data';
            info = subEnum(parseAssertAccountDataInstruction(ix), 'assertion');
            return { title, info };
        case LighthouseInstruction.AssertAccountDataMulti:
            title = 'Assert Account Data Multi';
            info = subEnum(parseAssertAccountDataMultiInstruction(ix), 'assertion');
            return { title, info };
        case LighthouseInstruction.AssertTokenAccount:
            title = 'Assert Token Account';
            info = subEnum(parseAssertTokenAccountInstruction(ix), 'assertion');
            return { title, info };
        case LighthouseInstruction.AssertAccountDelta:
            title = 'Assert Account Delta';
            info = subEnum(parseAssertAccountDeltaInstruction(ix), 'assertion');
            return { title, info };
        case LighthouseInstruction.AssertAccountInfo:
            title = 'Assert Account Info';
            info = subEnum(parseAssertAccountInfoInstruction(ix), 'assertion');
            return { title, info };
        case LighthouseInstruction.AssertAccountInfoMulti:
            title = 'Assert Account Info Multi';
            info = subEnum(parseAssertAccountInfoMultiInstruction(ix), 'assertions', true);
            return { title, info };
        case LighthouseInstruction.AssertMintAccountMulti:
            title = 'Assert Mint Account Multi';
            info = subEnum(parseAssertMintAccountMultiInstruction(ix), 'assertions', true);
            return { title, info };
        case LighthouseInstruction.AssertTokenAccountMulti:
            title = 'Assert Token Account Multi';
            info = subEnum(parseAssertTokenAccountMultiInstruction(ix), 'assertions', true);
            return { title, info };
        case LighthouseInstruction.AssertStakeAccount:
            title = 'Assert Stake Account';
            info = subEnum(parseAssertStakeAccountInstruction(ix), 'assertion');
            return { title, info };
        case LighthouseInstruction.AssertStakeAccountMulti:
            title = 'Assert Stake Account Multi';
            info = subEnum(parseAssertStakeAccountMultiInstruction(ix), 'assertions', true);
            return { title, info };
        case LighthouseInstruction.AssertUpgradeableLoaderAccount:
            title = 'Assert Upgradeable Loader Account';
            info = subEnum(parseAssertUpgradeableLoaderAccountInstruction(ix), 'assertion');
            return { title, info };
        case LighthouseInstruction.AssertUpgradeableLoaderAccountMulti:
            title = 'Assert Upgradeable Loader Account Multi';
            info = subEnum(parseAssertUpgradeableLoaderAccountMultiInstruction(ix), 'assertions', true);
            return { title, info };
        case LighthouseInstruction.AssertSysvarClock:
            title = 'Assert Sysvar Clock';
            info = subEnum(parseAssertSysvarClockInstruction(ix), 'assertion');
            return { title, info };
        case LighthouseInstruction.AssertBubblegumTreeConfigAccount:
            title = 'Assert Bubblegum Tree Config Account';
            info = subEnum(parseAssertBubblegumTreeConfigAccountInstruction(ix), 'assertion');
            return { title, info };
    }
}

function renderEnumsAsStrings(
    assertion:
        | AccountInfoAssertion
        | AccountDataAssertion
        | DataValueAssertion
        | MintAccountAssertion
        | TokenAccountAssertion
        | StakeAccountAssertion
        | UpgradeableLoaderStateAssertion
        | MerkleTreeAssertion
        | BubblegumTreeConfigAssertion
) {
    if ('offset' in assertion) {
        renderEnumsAsStrings(assertion.assertion);
        return;
    }
    switch (assertion.__kind) {
        case 'State':
        case 'U8':
        case 'I8':
        case 'U16':
        case 'I16':
        case 'U32':
        case 'I32':
        case 'U64':
        case 'I64':
        case 'I128':
        case 'U128':
        case 'Lamports':
        case 'DataLength':
        case 'RentEpoch':
        case 'TotalMintCapacity':
        case 'NumMinted':
        case 'Supply':
        case 'Decimals':
        case 'Amount':
        case 'DelegatedAmount':
            // @ts-ignore
            assertion.operator = renderIntegerOperator(assertion.operator);
            break;

        case 'MetaAssertion':
        case 'StakeAssertion':
        case 'Buffer':
        case 'Program':
        case 'ProgramData':
            assertion.fields.forEach(field => {
                switch (field.__kind) {
                    case 'RentExemptReserve':
                    case 'LockupEpoch':
                    case 'LockupUnixTimestamp':
                    case 'DelegationStake':
                    case 'DelegationActivationEpoch':
                    case 'DelegationDeactivationEpoch':
                    case 'CreditsObserved':
                    case 'Slot':
                        // @ts-ignore
                        field.operator = renderIntegerOperator(field.operator);
                        break;
                    case 'AuthorizedWithdrawer':
                    case 'LockupCustodian':
                    case 'AuthorizedStaker':
                    case 'DelegationVoterPubkey':
                    case 'Authority':
                    case 'ProgramDataAddress':
                    case 'UpgradeAuthority':
                        // @ts-ignore
                        field.operator = renderEquatableOperator(field.operator);
                        break;
                }
            });
            break;

        case 'StakeFlags':
        case 'CloseAuthority':
        case 'Delegate':
        case 'IsNative':
        case 'Mint':
        case 'FreezeAuthority':
        case 'IsInitialized':
        case 'Pubkey':
        case 'MintAuthority':
        case 'TreeCreator':
        case 'TreeDelegate':
        case 'Bytes':
        case 'IsPublic':
        case 'IsDecompressible':
        case 'KnownOwner':
        case 'IsSigner':
        case 'IsWritable':
        case 'Executable':
        case 'Bool':
        case 'Owner':
            // @ts-ignore
            assertion.operator = renderEquatableOperator(assertion.operator);
            break;

        case 'VerifyDatahash':
        case 'VerifyLeaf':
        case 'TokenAccountOwnerIsDerived':
            break;
    }
}

function renderIntegerOperator(operator: IntegerOperator) {
    switch (operator) {
        case IntegerOperator.GreaterThan:
            return '>';
        case IntegerOperator.LessThan:
            return '<';
        case IntegerOperator.GreaterThanOrEqual:
            return '>=';
        case IntegerOperator.LessThanOrEqual:
            return '<=';
        case IntegerOperator.Equal:
            return '=';
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
                    <tr key={keyIndex}>
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

function mapIxArgsToRows(data: any, nestingLevel: number = 0) {
    return Object.entries(data).map(([key, value], index) => {
        if (key === '__kind' || key === 'discriminator') {
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
                            <tr key={`${baseKey}-${i}`}>
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

        if (typeof value === 'object' && value !== null) {
            type = (value as any).__kind || 'Object';
            return (
                <ExpandableRow key={baseKey} fieldName={key} fieldType={type} nestingLevel={nestingLevel}>
                    {mapIxArgsToRows(value, nestingLevel + 1)}
                </ExpandableRow>
            );
        }

        // Infer how to render values
        // TODO: Fix this for enum values
        type = inferType(value);
        let displayValue;
        if (type === 'pubkey') {
            displayValue = <Address pubkey={new PublicKey(value as string)} alignRight link />;
        } else {
            displayValue = <>{String(value)}</>;
        }

        return (
            <tr key={baseKey}>
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
    if (typeof value === 'string') {
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
