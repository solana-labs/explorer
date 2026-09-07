import type { Metadata } from 'next/types';

import McpStartPageClient from './page-client';

export const metadata: Metadata = {
    description: 'Connect your MCP client to the Solana Explorer for decoded on-chain account and transaction data.',
    title: 'Explorer MCP Server | Solana',
};

export default function McpStartPage() {
    return <McpStartPageClient />;
}
