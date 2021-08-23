import { SignatureResult, TransactionInstruction } from "@solana/web3.js";
import { InstructionCard } from "../InstructionCard";
import { AddSpotMarket, logAllKeys, spotMarketFromIndex } from "./types";

export function AddSpotMarketDetailsCard(props: {
  ix: TransactionInstruction;
  index: number;
  result: SignatureResult;
  info: AddSpotMarket;
  innerCards?: JSX.Element[];
  childIndex?: number;
}) {
  const { ix, index, result, info, innerCards, childIndex } = props;

  return (
    <InstructionCard
      ix={ix}
      index={index}
      result={result}
      title="Mango: AddSpotMarket"
      innerCards={innerCards}
      childIndex={childIndex}
    >
      {spotMarketFromIndex(ix, info.marketIndex) !== "UNKNOWN" && (
        <tr>
          <td>market</td>
          <td className="text-lg-right">
            {spotMarketFromIndex(ix, info.marketIndex)}
          </td>
        </tr>
      )}
      <tr>
        <td>marketIndex</td>
        <td className="text-lg-right">{info.marketIndex}</td>
      </tr>
      <tr>
        <td>maintLeverage</td>
        <td className="text-lg-right">{info.maintLeverage}</td>
      </tr>
      <tr>
        <td>initLeverage</td>
        <td className="text-lg-right">{info.initLeverage}</td>
      </tr>
      <tr>
        <td>liquidationFee</td>
        <td className="text-lg-right">{info.liquidationFee}</td>
      </tr>
      <tr>
        <td>optimalUtil</td>
        <td className="text-lg-right">{info.optimalUtil}</td>
      </tr>
      <tr>
        <td>optimalRate</td>
        <td className="text-lg-right">{info.optimalRate}</td>
      </tr>
      <tr>
        <td>maxRate</td>
        <td className="text-lg-right">{info.maxRate}</td>
      </tr>
    </InstructionCard>
  );
}
