import { SignatureResult, TransactionInstruction } from "@solana/web3.js";
import BN from "bn.js";
import { Address } from "components/common/Address";
import { useCluster } from "providers/cluster";
import { useEffect, useState } from "react";
import { InstructionCard } from "../InstructionCard";
import {
  getSpotMarketFromInstruction,
  getSpotMarketFromSpotMarketConfig,
  OrderLotDetails,
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
  const mangoAccount = ix.keys[1];
  const mangoSpotMarketConfig = getSpotMarketFromInstruction(ix, 5);

  const cluster = useCluster();
  const [orderLotDetails, setOrderLotDetails] =
    useState<OrderLotDetails | null>(null);
  useEffect(() => {
    async function getOrderLotDetails() {
      const mangoSpotMarket = await getSpotMarketFromSpotMarketConfig(
        cluster.url,
        mangoSpotMarketConfig
      );
      const maxBaseQuantity = mangoSpotMarket.baseSizeLotsToNumber(
        new BN(info.maxBaseQuantity.toString())
      );
      const limitPrice = mangoSpotMarket.priceLotsToNumber(
        new BN(info.limitPrice.toString())
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
        <td className="text-lg-right">{mangoSpotMarketConfig.name}</td>
      </tr>
      <tr>
        <td>Spot Market Address</td>
        <td>
          <Address pubkey={mangoSpotMarketConfig.publicKey} alignRight link />
        </td>
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
        <td className="text-lg-right">{orderLotDetails?.price} USDC</td>
      </tr>
      <tr>
        <td>Size</td>
        <td className="text-lg-right">{orderLotDetails?.size}</td>
      </tr>
    </InstructionCard>
  );
}
