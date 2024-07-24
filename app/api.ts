export interface ValidatorEntity {
  id: number;
  network: 'devnet' | 'testnet' | 'mainnet';
  gossip: string;
  rpc: string;
  version: string;
  activatedStake: number;
  lastVote: number;
  commission: number;
  nodePubkey: string;
  votePubkey: string;
  delinquent: boolean;
  epochVoteAccount: boolean;
  region: string;
  country: string;
  city: string;
  latitude: number;
  longitude: number;
  createdAt: Date;
  updatedAt: Date;
}

export async function fetchXolanaValidators(
  limit = 500,
  offset = 0,
): Promise<ValidatorEntity[]> {
  const data = await fetch(`${process.env.NEXT_PUBLIC_API_ENDPOINT}/xolana/validators?limit=${limit}&offset=${offset}`);

  if (!data.ok) {
    throw new Error("Error fetching validators");
  }

  return await data.json();
}
