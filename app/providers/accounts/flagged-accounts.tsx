import Link from 'next/link';
import React from 'react';

type FlaggedMap = Record<string, IncidentDescription>;

type IncidentId = 'ftx-hack-november-2022' | 'known-scam';
type IncidentDescription = React.ReactElement;

const FLAGGED_ACCOUNTS: Record<string, IncidentId> = {
    // Serum Swap
    '22Y43yTVxuUkoRKdm9thyRhQ3SdgQS7c7kB6UNCiaczD': 'ftx-hack-november-2022',

    '9tAViia54YAaL9gv92hBu8K4QGRBKbytCQ9TYsJ6F6or': 'known-scam',

    // Serum Dex V3
    '9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin': 'ftx-hack-november-2022',

    // Serum Dex V1
    BJ3jrUzddfuSrZHXSCxMUUQsjKEyLmuuyZebkcaFp2fg: 'ftx-hack-november-2022',

    // Serum Dex V2
    EUqojwWA2rd19FZrzeBncJsm38Jm1hEhE3zsmX3bRc2o: 'ftx-hack-november-2022',

    GACpXND1SSfTSQMmqGuFvGwXB3jGEYBDRGNzmLfTYwSP: 'known-scam',
};

const INCIDENTS: Record<IncidentId, IncidentDescription> = {
    'ftx-hack-november-2022': (
        <>
            <div className="alert alert-danger alert-scam" role="alert">
                Warning! This program&apos;s upgrade key may have been compromised by the FTX hack. Please migrate to
                the community fork:{' '}
                <Link
                    className="text-white"
                    href="https://github.com/openbook-dex/program"
                    style={{ textDecoration: 'underline' }}
                >
                    https://github.com/openbook-dex/program
                </Link>
            </div>
        </>
    ),
    'known-scam': (
        <>
            <div className="alert alert-danger alert-scam" role="alert">
                Warning! This account has been flagged by the community as a scam account. Please be cautious sending
                SOL to this account.
            </div>
        </>
    ),
} as const;

const FLAGGED_ACCOUNTS_WARNING: FlaggedMap = {};
for (const [account, incidentId] of Object.entries(FLAGGED_ACCOUNTS)) {
    FLAGGED_ACCOUNTS_WARNING[account] = INCIDENTS[incidentId];
}
export default FLAGGED_ACCOUNTS_WARNING;
