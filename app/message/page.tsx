import MessageSignerPage from '@components/message/MessageSignerPage';
import { Metadata } from 'next/types';

export async function generateMetadata(): Promise<Metadata> {
    return {
        description: "Sign and verify text messages using your wallet",
        title: "Message Singer",
    };
}

export default function MessageSigningPage() {
    return <MessageSignerPage />;
}