import { SignatureResult, TransactionInstruction } from "@solana/web3.js";
import { useCluster } from "providers/cluster";
import { reportError } from "utils/sentry";
import { InstructionCard } from "./InstructionCard";
import { CancelPerpOrderDetailsCard } from "./mango/CancelPerpOrderDetailsCard";
import { CancelSpotOrderDetailsCard } from "./mango/CancelSpotOrderDetailsCard";
import { GenericPerpMngoDetailsCard } from "./mango/GenericPerpMngoDetailsCard";
import { GenericSpotMngoDetailsCard } from "./mango/GenericSpotMngoDetailsCard";
import { PlacePerpOrderDetailsCard } from "./mango/PlacePerpOrderDetailsCard";
import { PlaceSpotOrderDetailsCard } from "./mango/PlaceSpotOrderDetailsCard";
import {
  decodeCancelPerpOrder,
  decodeCancelSpotOrder,
  decodePlacePerpOrder,
  decodePlaceSpotOrder,
  parseMangoInstructionTitle,
} from "./mango/types";

export function MangoDetailsCard(props: {
  ix: TransactionInstruction;
  index: number;
  result: SignatureResult;
  signature: string;
  innerCards?: JSX.Element[];
  childIndex?: number;
}) {
  const { ix, index, result, signature, innerCards, childIndex } = props;

  const { url } = useCluster();

  let title;
  try {
    title = parseMangoInstructionTitle(ix);

    //todo
    // fix price and qty scaling
    // make address links for spot and perp market addresses

    switch (title) {
      case "PlaceSpotOrder":
        return (
          <PlaceSpotOrderDetailsCard
            info={decodePlaceSpotOrder(ix)}
            {...props}
          />
        );
      case "CancelSpotOrder":
        return (
          <CancelSpotOrderDetailsCard
            info={decodeCancelSpotOrder(ix)}
            {...props}
          />
        );
      case "PlacePerpOrder":
        return (
          <PlacePerpOrderDetailsCard
            info={decodePlacePerpOrder(ix)}
            {...props}
          />
        );
      case "CancelPerpOrder":
        return (
          <CancelPerpOrderDetailsCard
            info={decodeCancelPerpOrder(ix)}
            {...props}
          />
        );
      case "SettleFunds":
        return (
          <GenericSpotMngoDetailsCard
            accountKeyLocation={2}
            spotMarketkeyLocation={5}
            title={"SettleFunds"}
            {...props}
          />
        );
      case "RedeemMngo":
        return (
          <GenericPerpMngoDetailsCard
            mangoAccountKeyLocation={3}
            perpMarketKeyLocation={4}
            title={"RedeemMngo"}
            {...props}
          />
        );
    }
  } catch (error) {
    reportError(error, {
      url: url,
      signature: signature,
    });
  }

  console.log(`Mango: ${title}`);

  return (
    <InstructionCard
      ix={ix}
      index={index}
      result={result}
      title={`Mango: ${title || "Unknown"}`}
      innerCards={innerCards}
      childIndex={childIndex}
      defaultRaw
    />
  );
}
