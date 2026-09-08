import type { EnabledClusterNames } from '@explorer/entity-inspector';

// Cluster names /mcp accepts, and the single source the landing page reads. Listed rather than aliased to
// SUPPORTED_CLUSTERS so a newly supported cluster is opt-in here instead of going live with the package bump.
// Type-only import keeps the MCP runtime out of any bundle that reads this; `satisfies` keeps the literals readable.
export const MCP_ENABLED_CLUSTER_NAMES = ['mainnet-beta', 'devnet', 'testnet'] as const satisfies EnabledClusterNames;
