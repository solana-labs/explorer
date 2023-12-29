import { ErrorCard } from '@components/common/ErrorCard';
import { BorshAccountsCoder, Idl } from '@project-serum/anchor';
import { Account } from '@providers/accounts';
import { useAnchorProgram } from '@providers/anchor';
import { useCluster } from '@providers/cluster';
import { getAnchorProgramName, mapAccountToRows } from '@utils/anchor';
import React, { useMemo } from 'react';

function WritableBadge() {
    return <span className={`badge bg-info-soft me-1`}>Writable</span>;
}
function SignerBadge() {
    return <span className={`badge bg-warning-soft me-1`}>Signer</span>;
}

export function ProgramInterfaceCard({ programId }: { programId: string }) {
    // const { lamports } = account;
    const { url } = useCluster();
    const anchorProgram = useAnchorProgram(programId.toString(), url);
    // const rawData = account.data.raw;
    const programName = getAnchorProgramName(anchorProgram) || 'Unknown Program';

    const interfaceIxs: Pick<Idl, 'instructions'>['instructions'] = useMemo(() => {
        const interfaceIxs: Pick<Idl, 'instructions'>['instructions'] = [];
        const ixs = anchorProgram?.idl.instructions ?? [];
        for (const ix of ixs) {
            const searchName = ix.name;
            const found = ixs.filter(_ix => _ix.name === searchName);
            if (found.length > 0) {
                interfaceIxs.push(found[0]);
            }
        }
        return interfaceIxs;
    }, [anchorProgram]);

    // const { decodedAccountData, accountDef } = useMemo(() => {
    //     let decodedAccountData: any | null = null;
    //     let accountDef: IdlTypeDef | undefined = undefined;
    //     if (anchorProgram && rawData) {
    //         const coder = new BorshAccountsCoder(anchorProgram.idl);
    //         const accountDefTmp = anchorProgram.idl.accounts?.find((accountType: any) =>
    //             (rawData as Buffer).slice(0, 8).equals(BorshAccountsCoder.accountDiscriminator(accountType.name))
    //         );
    //         if (accountDefTmp) {
    //             accountDef = accountDefTmp;
    //             try {
    //                 decodedAccountData = coder.decode(accountDef.name, rawData);
    //             } catch (err) {
    //                 console.log(err);
    //             }
    //         }
    //     }

    //     return {
    //         accountDef,
    //         decodedAccountData,
    //     };
    // }, [anchorProgram, rawData]);

    // if (lamports === undefined) return null;
    if (!anchorProgram) return <ErrorCard text="No Anchor IDL found" />;
    // if (!decodedAccountData || !accountDef) {
    //     return <ErrorCard text="Failed to decode account data according to the public Anchor interface" />;
    // }

    return (
        <div>
            {interfaceIxs.map((ix, idx) => {
                console.log('ix accounts:', ix.accounts);
                return (
                    <div className="card" key={idx}>
                        <div className="card-header">
                            <div className="row align-items-center">
                                <div className="col">
                                    <h3 className="card-header-title">{ix.name}</h3>
                                </div>
                            </div>
                        </div>

                        <div className="table-responsive mb-0">
                            <table className="table table-sm table-nowrap card-table">
                                <thead>
                                    <tr>
                                        <th className="w-1">Account Name</th>
                                        <th className="w-1">Value</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {ix.accounts.map((account, key) => {
                                        return (
                                            <tr key={key}>
                                                <td>
                                                    {account.name} {(account as any).isSigner ? <SignerBadge /> : null}
                                                    {(account as any).isMut ? <WritableBadge /> : null}
                                                </td>
                                                <td>Input Value</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        <div className="table-responsive mb-0">
                            <table className="table table-sm table-nowrap card-table">
                                <thead>
                                    <tr>
                                        <th className="w-1">Field</th>
                                        <th className="w-1">Type</th>
                                        <th className="w-1">Value</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {ix.args.map((arg, key) => {
                                        return (
                                            <tr key={key}>
                                                <td>{arg.name}</td>
                                                <td>{arg.type.toString()}</td>
                                                <td>Input Value</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
