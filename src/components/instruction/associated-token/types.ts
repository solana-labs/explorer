/* eslint-disable @typescript-eslint/no-redeclare */

import { enums, type, Infer } from "superstruct";
import { PublicKeyFromString } from "validators/pubkey";

export type RecoverNestedInfo = Infer<typeof RecoverNestedInfo>;
export const RecoverNestedInfo = type({
  destination: PublicKeyFromString,
  nestedMint: PublicKeyFromString,
  nestedOwner: PublicKeyFromString,
  nestedSource: PublicKeyFromString,
  ownerMint: PublicKeyFromString,
  tokenProgram: PublicKeyFromString,
  wallet: PublicKeyFromString,
});

export type SystemInstructionType = Infer<typeof SystemInstructionType>;
export const SystemInstructionType = enums([
  "create",
  "createIdempotent",
  "recoverNested",
]);
