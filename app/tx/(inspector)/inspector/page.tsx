import { TransactionInspectorPage } from '@components/inspector/InspectorPage';

type Props = Readonly<{
    params: Readonly<{
        signature: string;
    }>;
}>;

export default function Page({ params: { signature } }: Props) {
    return <TransactionInspectorPage signature={signature} showTokenBalanceChanges={true} />;
}
