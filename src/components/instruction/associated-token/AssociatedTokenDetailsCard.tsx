import React from "react";
import {
  SignatureResult,
  ParsedInstruction,
  ParsedTransaction,
} from "@solana/web3.js";

import { UnknownDetailsCard } from "../UnknownDetailsCard";
import { CreateDetailsCard } from "./CreateDetailsCard";
import { RecoverNestedDetailsCard } from "./RecoverNestedDetailsCard";
import { ParsedInfo } from "validators";
import { create } from "superstruct";
import { reportError } from "utils/sentry";
import {
  CreateIdempotentInfo,
  RecoverNestedInfo,

} from "./types";
import { CreateIdempotentDetailsCard } from "./CreateIdempotentDetailsCard";

type DetailsProps = {
  tx: ParsedTransaction;
  ix: ParsedInstruction;
  result: SignatureResult;
  index: number;
  innerCards?: JSX.Element[];
  childIndex?: number;
};

export function AssociatedTokenDetailsCard(props: DetailsProps) {
  try {
    const parsed = create(props.ix.parsed, ParsedInfo);
    switch (parsed.type) {
      case "create": {
        return <CreateDetailsCard {...props} />;
      }
      case "createIdempotent": {
        const info = create(parsed.info, CreateIdempotentInfo);
        return <CreateIdempotentDetailsCard info={info} {...props} />;
      }
      case "recoverNested": {
        const info = create(parsed.info, RecoverNestedInfo);
        return <RecoverNestedDetailsCard info={info} {...props} />;
      }
      default:
        return <UnknownDetailsCard {...props} />;
    }
  } catch (error) {
    reportError(error, {
      signature: props.tx.signatures[0],
    });
    return <UnknownDetailsCard {...props} />;
  }
}
