// Cross-entity public API (FSD `@x` notation): the slice of the `chain-id` entity that the
// `token-info` entity is allowed to consume. Every unified token list (UTL) lookup is scoped to a
// chain id, so resolving one from the active cluster is a precondition for all of them.
export { ChainId } from '../../lib/chain-id';
export { getChainId } from '../../lib/get-chain-id';
