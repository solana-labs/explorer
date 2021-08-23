import { SignatureResult, TransactionInstruction } from "@solana/web3.js";
import { InstructionCard } from "../InstructionCard";
import { ChangePerpMarketParams } from "./types";

export function ChangePerpMarketParamsDetailsCard(props: {
  ix: TransactionInstruction;
  index: number;
  result: SignatureResult;
  info: ChangePerpMarketParams;
  innerCards?: JSX.Element[];
  childIndex?: number;
}) {
  const { ix, index, result, info, innerCards, childIndex } = props;

  return (
    <InstructionCard
      ix={ix}
      index={index}
      result={result}
      title="Mango: ChangePerpMarketParams"
      innerCards={innerCards}
      childIndex={childIndex}
    >
      {info.initLeverageOption && (
        <tr>
          <td>initLeverage</td>
          <td className="text-lg-right">{info.initLeverage}</td>
        </tr>
      )}
      {info.liquidationFeeOption && (
        <tr>
          <td>liquidationFee</td>
          <td className="text-lg-right">{info.liquidationFee}</td>
        </tr>
      )}
      {info.maintLeverageOption && (
        <tr>
          <td>maintLeverage</td>
          <td className="text-lg-right">{info.maintLeverage}</td>
        </tr>
      )}
      {info.makerFeeOption && (
        <tr>
          <td>makerFee</td>
          <td className="text-lg-right">{info.makerFee}</td>
        </tr>
      )}
      {info.mngoPerPeriodOption && (
        <tr>
          <td>mngoPerPeriodOption</td>
          <td className="text-lg-right">{info.mngoPerPeriod}</td>
        </tr>
      )}
      {info.maxDepthBpsOption && (
        <tr>
          <td>maxDepthBps</td>
          <td className="text-lg-right">{info.maxDepthBps}</td>
        </tr>
      )}
      {info.rateOption && (
        <tr>
          <td>rate</td>
          <td className="text-lg-right">{info.rate}</td>
        </tr>
      )}
      {info.takerFeeOption && (
        <tr>
          <td>takerFee</td>
          <td className="text-lg-right">{info.takerFee}</td>
        </tr>
      )}
      {info.targetPeriodLengthOption && (
        <tr>
          <td>targetPeriodLength</td>
          <td className="text-lg-right">{info.targetPeriodLength}</td>
        </tr>
      )}
    </InstructionCard>
  );
}
