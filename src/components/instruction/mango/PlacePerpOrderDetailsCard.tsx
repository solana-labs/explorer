import { SignatureResult, TransactionInstruction } from "@solana/web3.js";
import { Address } from "components/common/Address";
import { InstructionCard } from "../InstructionCard";
import {
  getPerpMarketFromInstruction,
  logAllKeys,
  PlacePerpOrder,
} from "./types";

export function PlacePerpOrderDetailsCard(props: {
  ix: TransactionInstruction;
  index: number;
  result: SignatureResult;
  info: PlacePerpOrder;
  innerCards?: JSX.Element[];
  childIndex?: number;
}) {
  const { ix, index, result, info, innerCards, childIndex } = props;

  logAllKeys(ix.keys);
  const mangoAccount = ix.keys[1];

  const mangoPerpMarket = getPerpMarketFromInstruction(ix, 4);

  // const baseToken = groupConfig.tokens.filter(
  //   (token) => token.symbol === mangoPerpMarket.baseSymbol
  // )[0];
  // const baseQty = info.quantity / Math.pow(10, baseToken.decimals);

  // todo
  // for me it's often really hard to know which of the accounts is the margin account or the market etc.

  return (
    <InstructionCard
      ix={ix}
      index={index}
      result={result}
      title="Mango: PlacePerpOrder"
      innerCards={innerCards}
      childIndex={childIndex}
    >
      <tr>
        <td>Mango Account</td>
        <td>
          {" "}
          <Address pubkey={mangoAccount.pubkey} alignRight link />
        </td>
      </tr>

      <tr>
        <td>Perp Market</td>
        <td className="text-lg-right">{mangoPerpMarket.name}</td>
      </tr>

      <tr>
        <td>Perp Market Address</td>
        <td>
          <Address pubkey={mangoPerpMarket.publicKey} alignRight link />
        </td>
      </tr>

      {info.clientOrderId !== "0" && (
        <tr>
          <td>Client Order Id</td>
          <td className="text-lg-right">{info.clientOrderId}</td>
        </tr>
      )}

      <tr>
        <td>Order Type</td>
        <td className="text-lg-right">{info.orderType}</td>
      </tr>
      <tr>
        <td>Side</td>
        <td className="text-lg-right">{info.side}</td>
      </tr>

      <tr>
        <td>Price</td>
        <td className="text-lg-right">{info.price}</td>
      </tr>

      <tr>
        <td>Quantity</td>
        <td className="text-lg-right">{info.quantity}</td>
      </tr>
    </InstructionCard>
  );
}
