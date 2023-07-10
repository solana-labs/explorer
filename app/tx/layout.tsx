import { TransactionsProvider } from '@providers/transactions';
import { PropsWithChildren } from 'react';

export default function TxLayout({ children }: PropsWithChildren<Record<string, never>>) {
  return (
    <TransactionsProvider>
      {children}
    </TransactionsProvider>
  );
}
