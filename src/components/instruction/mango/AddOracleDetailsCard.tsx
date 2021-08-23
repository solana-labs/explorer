import { SignatureResult, TransactionInstruction } from "@solana/web3.js";
import BN from "bn.js";
import { Address } from "components/common/Address";
import { useCluster } from "providers/cluster";
import { useEffect, useState } from "react";
import { InstructionCard } from "../InstructionCard";
import {
  getPerpMarketFromInstruction,
  getPerpMarketFromPerpMarketConfig,
  logAllKeys,
  OrderLotDetails,
  PlacePerpOrder,
} from "./types";

export function AddOracleDetailsCard(props: {
  ix: TransactionInstruction;
  index: number;
  result: SignatureResult;
  innerCards?: JSX.Element[];
  childIndex?: number;
}) {
  const { ix, index, result, innerCards, childIndex } = props;

  return (
    <InstructionCard
      ix={ix}
      index={index}
      result={result}
      title="Mango: AddOracle"
      innerCards={innerCards}
      childIndex={childIndex}
    >
      {/* <tr>
        <td>Mango Account</td>
        <td>
          {" "}
          <Address pubkey={mangoAccount.pubkey} alignRight link />
        </td>
      </tr>

      <tr>
        <td>Perp Market</td>
        <td className="text-lg-right">{mangoPerpMarketConfig.name}</td>
      </tr> */}
    </InstructionCard>
  );
}
