import { RichListProvider } from '@providers/richList';
import { SupplyProvider } from '@providers/supply';
import { PropsWithChildren } from 'react';

export default function SupplyLayout({ children }: PropsWithChildren<Record<string, never>>) {
    return (
        <SupplyProvider>
            <RichListProvider>{children}</RichListProvider>
        </SupplyProvider>
    );
}
