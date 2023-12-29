import { Cluster } from '@/app/utils/cluster';
import { ErrorCard } from '@components/common/ErrorCard';
import { BN, BorshAccountsCoder, BorshCoder, BorshInstructionCoder, Idl, Program } from '@project-serum/anchor';
import { IdlInstruction } from '@project-serum/anchor/dist/cjs/idl';
import { decode } from '@project-serum/anchor/dist/cjs/utils/bytes/bs58';
import { useAnchorProgram } from '@providers/anchor';
import { useCluster } from '@providers/cluster';
import { getAnchorProgramName } from '@utils/anchor';
import React, { useMemo } from 'react';
import { ArrowRight, Key } from 'react-feather';
import { clusterSlug } from '@/app/utils/cluster';
import { Keypair, PublicKey } from '@solana/web3.js';

function WritableBadge() {
    return <span className={`badge bg-info-soft me-1`}>Writable</span>;
}

function SignerBadge() {
    return <span className={`badge bg-warning-soft me-1`}>Signer</span>;
}

/**
 * The given IdlInstruction is actually
 * a preflight instruction
 */
function MsaInstructionCard({
    preflightIx,
    ix,
    program,
}: {
    preflightIx: IdlInstruction;
    ix: IdlInstruction;
    program: Program;
}) {
    const { cluster } = useCluster();
    const [inputAccountValues, setInputAccountValues] = React.useState<Record<string, string>>({});
    const [generatedSigners, setGeneratedSigners] = React.useState<Record<string, Keypair>>({});
    const [inputArgumentValues, setInputArgumentValues] = React.useState<Record<string, string>>({});

    const canSend = useMemo(
        () =>
            Object.entries(inputAccountValues).filter(([_, val]) => val !== undefined).length >= ix.accounts.length &&
            Object.entries(inputArgumentValues).filter(([_, val]) => val !== undefined).length >= ix.args.length,
        [inputAccountValues, inputArgumentValues]
    );

    const onClick = useMemo(() => {
        return async () => {
            // console.log(inputAccountValues);
            const accounts: Record<string, PublicKey> = {};
            ix.accounts.forEach((account, key) => {
                accounts[account.name] = new PublicKey(inputAccountValues[key]);
            });

            // console.log(inputArgumentValues);
            const args: Record<string, any> = {};
            ix.args.forEach((arg, key) => {
                switch (arg.type) {
                    case 'bool':
                        args[arg.name] = inputArgumentValues[key] === 'true';
                        break;
                    case 'u32':
                    case 'i32':
                    case 'u64':
                    case 'i64':
                    case 'u128':
                    case 'i128':
                        args[arg.name] = new BN(inputArgumentValues[key], 10);
                        break;
                    case 'publicKey':
                        args[arg.name] = new PublicKey(inputArgumentValues[key]);
                        break;
                    case 'u8':
                    case 'i8':
                    case 'u16':
                    case 'i16':
                        args[arg.name] = parseInt(inputArgumentValues[key], 10);
                        break;
                    case 'bytes':
                        args[arg.name] = decode(inputArgumentValues[key]);
                        break;
                    case 'string':
                        args[arg.name] = Buffer.from(inputArgumentValues[key], 'utf-8');
                        break;
                    case 'f32':
                    case 'f64':
                        throw new Error('Not implemented');
                }
            });

            console.log(
                'Your method instruction:',
                await program.methods[ix.name](...Object.values(args))
                    .accounts(accounts)
                    .instruction()
            );
            console.log({
                programId: program.programId.toBase58(),
                cluster: clusterSlug(cluster),
                instructionName: ix.name.slice(9),
                accounts,
                arguments: args,
            });
        };
    }, [inputAccountValues, inputArgumentValues]);

    const sendButton = useMemo(
        () => (
            <button
                disabled={!canSend}
                className={`btn btn-sm d-flex align-items-center ${canSend ? 'btn-black active' : 'btn-white'}`}
                onClick={() => {
                    onClick();
                }}
            >
                <ArrowRight className="me-2" size={13} /> Send
            </button>
        ),
        [canSend, onClick]
    );

    return (
        <div className="card">
            <div className="card-header">
                <div className="row align-items-center">
                    <div className="col">
                        <h3 className="card-header-title">{ix.name.slice(9)}</h3>
                    </div>
                </div>
                <div>{sendButton}</div>
            </div>

            <div className="table-responsive mb-0">
                <table className="table table-sm table-nowrap card-table">
                    <thead>
                        <tr>
                            <th className="w-1">Account Name</th>
                            <th className="w-1"></th>
                            <th className="w-1">Value</th>
                        </tr>
                    </thead>
                    <tbody>
                        {preflightIx.accounts.map((account, key) => {
                            return (
                                <tr key={key}>
                                    {/* We have to get signer/mutable info from the ACTUAL ix */}
                                    <td>
                                        {account.name} {(ix.accounts[key] as any).isSigner ? <SignerBadge /> : null}
                                        {(ix.accounts[key] as any).isMut ? <WritableBadge /> : null}
                                    </td>
                                    <td></td>
                                    <td>
                                        <div style={{ position: 'relative', width: '100%' }}>
                                            <input
                                                type="input"
                                                className=""
                                                style={{ width: '100%', paddingRight: '20px' }}
                                                id={`card-input-${ix.name}-${account.name}-${key}`}
                                                value={inputAccountValues[key] || ''}
                                                onChange={e => {
                                                    setInputAccountValues({
                                                        ...inputAccountValues,
                                                        [key]: e.target.value,
                                                    });
                                                }}
                                            />
                                            {!inputAccountValues[key] && (ix.accounts[key] as any).isSigner ? (
                                                <Key
                                                    className=""
                                                    size={16}
                                                    color={'#33a382'}
                                                    style={{
                                                        position: 'absolute',
                                                        right: '5px',
                                                        top: '50%',
                                                        borderWidth: '2px',
                                                        borderColor: '#33a382',
                                                        borderRadius: '7px',
                                                        transform: 'translateY(-50%)',
                                                    }}
                                                    onClick={() => {
                                                        const generatedKeypair = Keypair.generate();
                                                        const generatedAddress = generatedKeypair.publicKey.toBase58();

                                                        setGeneratedSigners({
                                                            ...generatedSigners,
                                                            [generatedAddress]: generatedKeypair,
                                                        });

                                                        setInputAccountValues({
                                                            ...inputAccountValues,
                                                            [key]: generatedAddress,
                                                        });
                                                    }}
                                                />
                                            ) : null}
                                            <label
                                                className="form-check-label"
                                                htmlFor={`card-input-${ix.name}-${account.name}-${key}`}
                                            ></label>
                                        </div>
                                    </td>
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
                                    <td>
                                        <input
                                            type="input"
                                            className=""
                                            style={{ width: '100%' }}
                                            id={`card-input-${ix.name}-${arg.name}-${key}`}
                                            value={inputArgumentValues[key] || ''}
                                            onChange={e => {
                                                setInputArgumentValues({
                                                    ...inputAccountValues,
                                                    [key]: e.target.value,
                                                });
                                            }}
                                        />
                                        <label
                                            className="form-check-label"
                                            htmlFor={`card-input-${ix.name}-${arg.name}-${key}`}
                                        ></label>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export function ProgramInterfaceCard({ programId }: { programId: string }) {
    // const { lamports } = account;
    const { url } = useCluster();
    const anchorProgram = useAnchorProgram(programId.toString(), url);
    // const rawData = account.data.raw;
    const programName = getAnchorProgramName(anchorProgram) || 'Unknown Program';

    const interfaceIxs: {
        preflightIx: IdlInstruction;
        ix: IdlInstruction;
    }[] = useMemo(() => {
        const interfaceIxs = [];
        const ixs = anchorProgram?.idl.instructions ?? [];
        for (const ix of ixs) {
            const searchName = `preflight${ix.name.charAt(0).toUpperCase() + ix.name.slice(1)}`;
            const found = ixs.filter(_ix => _ix.name === searchName);

            // Get the preflight instruction
            if (found.length > 0) {
                interfaceIxs.push({ preflightIx: found[0], ix });
            }
        }
        return interfaceIxs;
    }, [anchorProgram]);

    if (!anchorProgram) return <ErrorCard text="No Anchor IDL found" />;

    return (
        <div>
            {interfaceIxs.map(({ preflightIx, ix }, idx) => (
                <MsaInstructionCard preflightIx={preflightIx} ix={ix} program={anchorProgram} key={idx} />
            ))}
        </div>
    );
}
