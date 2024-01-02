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
import { ArrowRight, ChevronDown, ChevronUp, Key } from 'react-feather';

import { PRE_INSTRUCTIONS } from '@/app/api/program-interface/sendTransaction';
import { useScrollAnchor } from '@/app/providers/scroll-anchor';
import { getAnchorProgramName } from '@/app/utils/anchor';

require('@solana/wallet-adapter-react-ui/styles.css');

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
    const { url } = useCluster();
    const { connection } = useConnection();
    const { publicKey, sendTransaction } = useWallet();
    const [inputAccountValues, setInputAccountValues] = React.useState<Record<string, string>>({});
    const [generatedSigners, setGeneratedSigners] = React.useState<Record<string, Keypair>>({});
    const [inputArgumentValues, setInputArgumentValues] = React.useState<Record<string, string>>({});
    const [isExpanded, setExpanded] = React.useState<boolean>();

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

            const parsedResp: {
                ix: {
                    programId: string;
                    data: number[];
                    keys: { pubkey: string; isSigner: boolean; isWritable: boolean }[];
                };
            } = JSON.parse(data);

            const {
                context: { slot: minContextSlot },
                value: { blockhash },
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
                const txId = await sendTransaction(tx, connection, { minContextSlot });
                console.log({ txId });
            } catch (e) {
                console.log(e);
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
    ]);

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

    const toggleExpansion = useMemo(() => {
        return () => {
            setExpanded(!isExpanded);
        };
    }, [isExpanded, setExpanded]);

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
                                                {account.name}{' '}
                                                {(ix.accounts[key] as any).isSigner ? <SignerBadge /> : null}
                                                {(ix.accounts[key] as any).isMut ? <WritableBadge /> : null}
                                            </td>
                                            <td></td>
                                            <td>
                                                <div style={{ position: 'relative', width: '100%' }}>
                                                    <input
                                                        type="input"
                                                        className=""
                                                        style={{
                                                            paddingRight: inputAccountValues[key] ? '0px' : '20px',
                                                            width: '100%',
                                                        }}
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
                                                                borderColor: '#33a382',
                                                                borderRadius: '7px',
                                                                borderWidth: '2px',
                                                                position: 'absolute',
                                                                right: '5px',
                                                                top: '50%',
                                                                transform: 'translateY(-50%)',
                                                            }}
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
                    ) : null}
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
        </div>
    );
}
