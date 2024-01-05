import 'react-toastify/dist/ReactToastify.css';

import { ErrorCard } from '@components/common/ErrorCard';
import { BN, Program } from '@project-serum/anchor';
import { IdlInstruction } from '@project-serum/anchor/dist/cjs/idl';
import { decode } from '@project-serum/anchor/dist/cjs/utils/bytes/bs58';
import { useAnchorProgram } from '@providers/anchor';
import { useCluster } from '@providers/cluster';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Keypair, MessageV0, PublicKey, VersionedTransaction } from '@solana/web3.js';
import React, { useMemo } from 'react';
import { ArrowRight, Check, ChevronDown, ChevronUp, Key, X as Xmark } from 'react-feather';
import { toast, ToastContainer } from 'react-toastify';

import { PRE_INSTRUCTIONS } from '@/app/api/program-interface/sendTransaction';
import { useScrollAnchor } from '@/app/providers/scroll-anchor';
import { getAnchorProgramName } from '@/app/utils/anchor';

import { Signature } from '../common/Signature';
require('@solana/wallet-adapter-react-ui/styles.css');

function WritableBadge() {
    return <span className={`badge bg-info-soft me-1`}>Writable</span>;
}

function SignerBadge() {
    return <span className={`badge bg-warning-soft me-1`}>Signer</span>;
}

function GenerateKp({ disabled, onClick }: { disabled: boolean; onClick: () => void }) {
    return (
        <button
            disabled={disabled}
            className={`btn d-flex align-items-center ${disabled ? 'btn-black' : 'btn-white active'}`}
            onClick={onClick}
        >
            <Key className="me-2" size={13} /> Generate
        </button>
    );
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
    const { url } = useCluster();
    const { connection } = useConnection();
    const { publicKey, sendTransaction } = useWallet();
    const [inputAccountValues, setInputAccountValues] = React.useState<Record<string, string>>({});
    const [generatedSigners, setGeneratedSigners] = React.useState<Record<string, Keypair>>({});
    const [inputArgumentValues, setInputArgumentValues] = React.useState<Record<string, string>>({});
    const [isExpanded, setExpanded] = React.useState<boolean>();
    const [txSigs, setTxSigs] = React.useState<{ sig: string; status: 'failed' | 'success' }[]>([]);

    const scrollAnchorRef = useScrollAnchor(ix.name);

    const canSend = useMemo(
        () =>
            Object.entries(inputAccountValues).filter(([_, val]) => val !== undefined).length >=
                preflightIx.accounts.length &&
            Object.entries(inputArgumentValues).filter(([_, val]) => val !== undefined).length >= ix.args.length,
        [inputAccountValues, inputArgumentValues, ix, preflightIx]
    );

    const onClick = useMemo(() => {
        return async () => {
            const accounts: Record<string, PublicKey> = {};
            preflightIx.accounts.forEach((account, key) => {
                accounts[account.name] = new PublicKey(inputAccountValues[key]);
            });

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

            const txIx = await program.methods[preflightIx.name](...Object.values(args))
                .accounts(accounts)
                .instruction();
            txIx.keys = txIx.keys.map((meta, i) => ({
                ...meta,
                isSigner: (ix.accounts[i] as any).isSigner,
                isWritable: (ix.accounts[i] as any).isMut,
            }));

            const response = await fetch(`/api/program-interface`, {
                body: JSON.stringify({
                    accounts,
                    arguments: args,
                    endpointUrl: url,
                    instructionName: ix.name,
                    payer: publicKey!.toBase58(),
                    programId: program.programId.toBase58(),
                    publicKey,
                    txIx,
                }),
                headers: {
                    'Content-Type': 'application/json',
                },
                method: 'POST',
            });
            const data = await response.text();
            console.log({ data });

            let parsedResp: {
                ix: {
                    programId: string;
                    data: number[];
                    keys: { pubkey: string; isSigner: boolean; isWritable: boolean }[];
                };
            };
            try {
                parsedResp = JSON.parse(data);
            } catch (e) {
                toast.warn(`Failed to compose transaction: ${data}`, { closeOnClick: true });
                return;
            }

            const {
                context: { slot: minContextSlot },
                value: { blockhash, lastValidBlockHeight },
            } = await connection.getLatestBlockhashAndContext();

            const message = MessageV0.compile({
                addressLookupTableAccounts: undefined,
                instructions: PRE_INSTRUCTIONS.concat([
                    {
                        data: Buffer.from(parsedResp.ix.data),
                        keys: parsedResp.ix.keys.map(meta => ({ ...meta, pubkey: new PublicKey(meta.pubkey) })),
                        programId: new PublicKey(parsedResp.ix.programId),
                    },
                ]),
                payerKey: publicKey!,
                recentBlockhash: blockhash,
            });

            const tx = new VersionedTransaction(message);
            console.log({ inputAccountValues });
            console.log({ generatedSigners });
            if (Object.values(generatedSigners).length > 0) {
                Object.values(inputAccountValues).map((acc, idx) => {
                    if (generatedSigners[acc] && txIx.keys[idx].isSigner) {
                        console.log({ signer: acc });
                        tx.sign([generatedSigners[acc]]);
                    }
                });
            }

            try {
                const res = await connection.simulateTransaction(tx);
                console.log({ simulation: res });
                if (res.value.err) {
                    toast.warn(`Failed to simulate: ${res.value.logs}`, { closeOnClick: true });
                    return;
                }

                const txId = await sendTransaction(tx, connection, { minContextSlot });
                const toastId = toast(<Signature signature={txId} link truncateChars={20} />, {
                    autoClose: false,
                    bodyStyle: {
                        display: 'flex',
                        flexDirection: 'row',
                    },
                });
                const txResponse = await connection.confirmTransaction(
                    { blockhash, lastValidBlockHeight, signature: txId },
                    'confirmed'
                );
                if (txResponse.value.err) {
                    setTxSigs([...txSigs, { sig: txId, status: 'failed' }]);
                    toast.update(toastId, {
                        autoClose: 5000,
                        render: (
                            <div>
                                <Xmark /> Transaction failed: <Signature signature={txId} link truncateChars={20} />
                            </div>
                        ),
                        type: toast.TYPE.ERROR,
                    });
                } else {
                    setTxSigs([...txSigs, { sig: txId, status: 'success' }]);
                    toast.update(toastId, {
                        autoClose: 5000,
                        render: (
                            <div>
                                <Check />
                                Transaction success: <Signature signature={txId} link truncateChars={20} />
                            </div>
                        ),
                        type: toast.TYPE.SUCCESS,
                    });
                }
            } catch (e) {
                toast.warn(`Failed to send: Transaction error`, { closeOnClick: true });
                console.error(e);
            }
        };
    }, [
        inputAccountValues,
        inputArgumentValues,
        publicKey,
        program,
        url,
        connection,
        ix,
        preflightIx,
        sendTransaction,
        generatedSigners,
        txSigs,
    ]);

    const sendButton = useMemo(
        () => (
            <button
                disabled={!canSend}
                className={`btn d-flex align-items-center ${canSend ? 'btn-white active' : ''}`}
                onClick={() => {
                    onClick();
                }}
            >
                <ArrowRight className="me-2" size={13} /> Send
            </button>
        ),
        [canSend, onClick]
    );

    const toggleExpansion = useMemo(() => {
        return () => {
            setExpanded(!isExpanded);
        };
    }, [isExpanded, setExpanded]);

    const ixTransactionHistory = useMemo(() => {
        return txSigs.length > 0 ? (
            <>
                <table className="table table-sm table-nowrap card-table">
                    <thead>
                        <tr>
                            <th className="text-muted w-1">Transaction Signature</th>
                            <th className="text-muted w-1">Status</th>
                        </tr>
                    </thead>
                    <tbody className="list">
                        {txSigs.map(({ sig, status }) => {
                            const statusClass = status === 'failed' ? 'warning' : 'success';
                            return (
                                <tr key={sig}>
                                    <td>
                                        <Signature signature={sig} link truncateChars={60} />
                                    </td>
                                    <td>
                                        <span className={`badge bg-${statusClass}-soft`}>
                                            {status.charAt(0).toUpperCase() + status.slice(1)}
                                        </span>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                <div className="card-footer">
                    <div className="text-muted text-center">All Transactions</div>
                </div>
            </>
        ) : null;
    }, [txSigs]);

    return (
        <div className="card" ref={scrollAnchorRef}>
            <div className="card-header">
                <div className="row align-items-center">
                    <div className="col" style={{ display: 'flex', flexDirection: 'row' }}>
                        <div
                            style={{
                                flexDirection: 'column',
                                marginRight: '5px',
                                marginTop: '-3px',
                            }}
                            onClick={toggleExpansion}
                        >
                            {isExpanded ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
                        </div>
                        <h3 className="card-header-title">{ix.name}</h3>
                    </div>
                </div>
                <div>{sendButton}</div>
            </div>
            {isExpanded ? (
                <>
                    {(ix as any).docs ? (
                        <div style={{ padding: '15px' }}>{((ix as any).docs as string[]).join(' ')}</div>
                    ) : null}

                    <div className="card-header">
                        <div className="row align-items-center">
                            <div className="col" style={{ display: 'flex', flexDirection: 'row' }}>
                                <h3 className="card-header-title">Accounts</h3>
                            </div>
                        </div>
                    </div>
                    <div className="table-responsive mb-0">
                        <table className="table table-sm table-nowrap card-table">
                            <thead>
                                <tr>
                                    <th className="w-2">Account Name</th>
                                    <th className="w-1"></th>
                                    <th className="w-2">Value</th>
                                </tr>
                            </thead>
                            <tbody>
                                {preflightIx.accounts.map((account, key) => {
                                    return (
                                        <tr key={key}>
                                            {/* We have to get signer/mutable info from the ACTUAL ix */}
                                            <td>
                                                <div style={{ width: '100%' }}>
                                                    {account.name}{' '}
                                                    {(ix.accounts[key] as any).isSigner ? <SignerBadge /> : null}
                                                    {(ix.accounts[key] as any).isMut ? <WritableBadge /> : null}
                                                </div>
                                            </td>
                                            <td style={{ padding: '0px' }}>
                                                <div
                                                    style={{
                                                        alignContent: 'center',
                                                        display: 'flex',
                                                        flexDirection: 'row',
                                                        justifyContent: 'center',
                                                    }}
                                                >
                                                    {(ix.accounts[key] as any).isSigner ? (
                                                        <GenerateKp
                                                            disabled={!!inputAccountValues[key]}
                                                            onClick={() => {
                                                                const generatedKeypair = Keypair.generate();
                                                                const generatedAddress =
                                                                    generatedKeypair.publicKey.toBase58();

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
                                                </div>
                                            </td>
                                            <td>
                                                <div
                                                    style={{
                                                        alignItems: 'center',
                                                        display: 'flex',
                                                        flexDirection: 'row',
                                                        width: '100%',
                                                    }}
                                                >
                                                    <input
                                                        type="input"
                                                        className="form-control"
                                                        id={`card-input-${ix.name}-${account.name}-${key}`}
                                                        value={inputAccountValues[key] || ''}
                                                        onChange={e => {
                                                            setInputAccountValues({
                                                                ...inputAccountValues,
                                                                [key]: e.target.value,
                                                            });
                                                        }}
                                                    />
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

                    {ix.args.length > 0 ? (
                        <>
                            <div className="card-header">
                                <div className="row align-items-center">
                                    <div className="col" style={{ display: 'flex', flexDirection: 'row' }}>
                                        <h3 className="card-header-title">Arguments</h3>
                                    </div>
                                </div>
                            </div>
                            <div className="table-responsive mb-0">
                                <table className="table table-sm table-nowrap card-table">
                                    <thead>
                                        <tr>
                                            <th className="w-2">Field</th>
                                            <th className="w-1">Type</th>
                                            <th className="w-2">Value</th>
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
                                                            className="form-control"
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
                        </>
                    ) : null}
                    {ixTransactionHistory}
                </>
            ) : null}
        </div>
    );
}

export function ProgramInterfaceCard({ programId }: { programId: string }) {
    const { url } = useCluster();
    const anchorProgram = useAnchorProgram(programId.toString(), url);
    const programName = getAnchorProgramName(anchorProgram);

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
                interfaceIxs.push({ ix, preflightIx: found[0] });
            }
        }
        return interfaceIxs;
    }, [anchorProgram]);

    if (!anchorProgram) return <ErrorCard text="No Anchor IDL found" />;

    return (
        <div>
            <div className="card">
                <div className="card-header">
                    <div className="row">
                        <h3 className="col card-header-title">{programName}</h3>
                    </div>
                </div>
                <div style={{ padding: '15px' }}>
                    {(anchorProgram.idl as any).docs ? (anchorProgram.idl as any).docs.join(' ') : 'No docs'}
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', margin: '0 15px 15px 15px' }}>
                    <WalletMultiButton />
                </div>
            </div>
            {interfaceIxs.map(({ preflightIx, ix }, idx) => (
                <MsaInstructionCard preflightIx={preflightIx} ix={ix} program={anchorProgram} key={idx} />
            ))}
            <ToastContainer position="bottom-left" />
        </div>
    );
}
