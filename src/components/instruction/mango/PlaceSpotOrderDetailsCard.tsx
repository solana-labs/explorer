import { SignatureResult, TransactionInstruction } from "@solana/web3.js";
import { Address } from "components/common/Address";
import { InstructionCard } from "../InstructionCard";
import {
  getSpotMarketFromInstruction,
  logAllKeys,
  PlaceSpotOrder,
} from "./types";

export function PlaceSpotOrderDetailsCard(props: {
  ix: TransactionInstruction;
  index: number;
  result: SignatureResult;
  info: PlaceSpotOrder;
  innerCards?: JSX.Element[];
  childIndex?: number;
}) {
  const { ix, index, result, info, innerCards, childIndex } = props;

  logAllKeys(ix.keys);
  const mangoAccount = ix.keys[1];

  const mangoSpotMarket = getSpotMarketFromInstruction(ix, 5);

  // const baseToken = groupConfig.tokens.filter(
  //   (token) => token.symbol === mangoSpotMarket.baseSymbol
  // )[0];
  // const baseQty = info.maxBaseQuantity / Math.pow(10, baseToken.decimals);

  // const quoteToken = groupConfig.tokens.filter(
  //   (token) => token.symbol === "USDC"
  // )[0];
  // const quoteQty = info.maxQuoteQuantity / Math.pow(10, quoteToken.decimals);

  return (
    <InstructionCard
      ix={ix}
      index={index}
      result={result}
      title="Mango: PlaceSpotOrder"
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
        <td>Spot Market</td>
        <td className="text-lg-right">{mangoSpotMarket.name}</td>
      </tr>
      <tr>
        <td>Order Type</td>
        <td className="text-lg-right">{info.orderType}</td>
      </tr>
      {info.clientId !== "0" && (
        <tr>
          <td>Client Id</td>
          <td className="text-lg-right">{info.clientId}</td>
        </tr>
      )}
      <tr>
        <td>Side</td>
        <td className="text-lg-right">{info.side}</td>
      </tr>
      <tr>
        <td>Limit Price</td>
        {/* todo fix price */}
        <td className="text-lg-right">{info.limitPrice}</td>
      </tr>
      <tr>
        <td>Max Base Quantity</td>
        <td className="text-lg-right">{info.maxBaseQuantity}</td>
      </tr>
      <tr>
        <td>Max Quote Quantity</td>
        <td className="text-lg-right">{info.maxQuoteQuantity}</td>
      </tr>
    </InstructionCard>
  );
}
