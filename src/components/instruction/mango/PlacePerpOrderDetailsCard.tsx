import { SignatureResult, TransactionInstruction } from "@solana/web3.js";
import BN from "bn.js";
import { Address } from "components/common/Address";
import { useCluster } from "providers/cluster";
import { useEffect, useState } from "react";
import { InstructionCard } from "../InstructionCard";
import {
  getPerpMarketFromInstruction,
  getPerpMarketFromPerpMarketConfig,
  OrderLotDetails,
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
  const mangoAccount = ix.keys[1];
  const mangoPerpMarketConfig = getPerpMarketFromInstruction(ix, 4);

  const cluster = useCluster();
  const [orderLotDetails, setOrderLotDetails] =
    useState<OrderLotDetails | null>(null);
  useEffect(() => {
    async function getOrderLotDetails() {
      const mangoPerpMarket = await getPerpMarketFromPerpMarketConfig(
        cluster.url,
        mangoPerpMarketConfig
      );
      const maxBaseQuantity = mangoPerpMarket.baseLotsToNumber(
        new BN(info.quantity.toString())
      );
      const limitPrice = mangoPerpMarket.priceLotsToNumber(
        new BN(info.price.toString())
      );
      setOrderLotDetails({
        price: limitPrice,
        size: maxBaseQuantity,
      } as OrderLotDetails);
    }
    getOrderLotDetails();
  }, []);

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
        <td className="text-lg-right">{mangoPerpMarketConfig.name}</td>
      </tr>

      <tr>
        <td>Perp Market Address</td>
        <td>
          <Address pubkey={mangoPerpMarketConfig.publicKey} alignRight link />
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
        <td className="text-lg-right">{orderLotDetails?.price} USDC</td>
      </tr>

      <tr>
        <td>Quantity</td>
        <td className="text-lg-right">{orderLotDetails?.size}</td>
      </tr>
    </InstructionCard>
  );
}
