// import { ConcurrentMerkleTreeAccount } from '@solana/spl-account-compression';
// import { PublicKey } from '@solana/web3.js';

// import { Address } from '../common/Address';
// import { Slot } from '../common/Slot';
import { getHeader, getRevisionMapV1 } from '@metaplex-foundation/mpl-token-auth-rules';
import { decode } from '@msgpack/msgpack';
import { PublicKey } from '@solana/web3.js';

import { TableCardBody } from '../common/TableCardBody';
import { Address } from '../common/Address';
import { ExpandableRow } from '../common/ExpandableRow';
import { SimpleRow } from '../common/SimpleRow';

export type RuleSetV1 = {
    version: number;
    owner: PublicKey;
    name: string;
    ruleset: Record<string, string>;
};

export const getLatestRuleSetV1 = (data: Buffer): RuleSetV1 => {
    const header = getHeader(data);
    const revmap = getRevisionMapV1(data);
    const latestRevision = parseInt(revmap.ruleSetRevisions[revmap.ruleSetRevisions.length - 1] as any);
    const rulesetDecoded: any = decode(data.slice(latestRevision + 1, parseInt(header.revMapVersionLocation as any)));
    return {
        name: rulesetDecoded[2] as string,
        owner: new PublicKey(rulesetDecoded[1]),
        ruleset: rulesetDecoded[3] as Record<string, string>,
        version: rulesetDecoded[0] as number,
    };
};

export function TokenAuthRulesCard({ data }: { data: Buffer }) {
    const ruleset = getLatestRuleSetV1(data);
    const keys: string[] = Object.keys(ruleset.ruleset).sort();

    return (
        <>
            <div className="card">
                <div className="card-header">
                    <div className="row align-items-center">
                        <div className="col">
                            <h3 className="card-header-title">Token Auth Ruleset V1</h3>
                        </div>
                    </div>
                </div>

                <div className="card metadata-json-viewer m-4">
                    <TableCardBody>
                        <tr>
                            <td>Name</td>
                            <td></td>
                            <td className="text-lg-end">
                                <span className="text-monospace">{ruleset.name}</span>
                            </td>
                        </tr>
                        <tr>
                            <td>Authority</td>
                            <td></td>
                            <td className="text-lg-end">
                                <Address pubkey={ruleset.owner} alignRight raw />
                            </td>
                        </tr>
                        <tr>
                            <td>Version</td>
                            <td></td>
                            <td className="text-lg-end">
                                <span className="text-monospace">{ruleset.version}</span>
                            </td>
                        </tr>

                        <ExpandableRow fieldName={'Ruleset'} fieldType={''} nestingLevel={0}>
                            {keys.map((key, idx) => (
                                <SimpleRow rawKey={key} type={'string'} key={idx} nestingLevel={1}>
                                    <td className="text-lg-end">
                                        <span className="text-monospace">{ruleset.ruleset[key]}</span>
                                    </td>
                                </SimpleRow>
                            ))}
                        </ExpandableRow>
                    </TableCardBody>
                </div>
            </div>
        </>
    );
}

// <tr key={idx}>
//     <td>Rule: {key}</td>
//     <td className="text-lg-end">
//         <span className="text-monospace">{ruleset.ruleset[key]}</span>
//     </td>
// </tr>
