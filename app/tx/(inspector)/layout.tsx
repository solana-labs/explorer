import { Metadata } from 'next/types';
import React from 'react';

type Props = Readonly<{
    children: React.ReactNode;
    params: Readonly<{
        signature: string;
    }>;
}>;

export async function generateMetadata({ params: { signature } }: Props): Promise<Metadata> {
    if (signature) {
        return {
            description: `Interactively inspect the Xolana transaction with signature ${signature}`,
            title: `Transaction Inspector | ${signature} | Xolana`,
        };
    } else {
        return {
            description: `Interactively inspect Xolana transactions`,
            title: `Transaction Inspector | Xolana`,
        };
    }
}

export default function TransactionInspectorLayout({ children }: Props) {
    return children;
}
