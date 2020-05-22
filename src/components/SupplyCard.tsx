import React from "react";
import { Link } from "react-router-dom";
import { AccountBalancePair } from "@solana/web3.js";
import Copyable from "./Copyable";
import { useSupply, useFetchSupply } from "providers/supply";
import LoadingCard from "./common/LoadingCard";
import ErrorCard from "./common/ErrorCard";
import { lamportsToSolString } from "utils";
import TableCardBody from "./common/TableCardBody";

export default function SupplyCard() {
  const supply = useSupply();
  const fetchSupply = useFetchSupply();

  if (typeof supply === "boolean") return <LoadingCard />;
  if (typeof supply === "string")
    return <ErrorCard text={supply} retry={fetchSupply} />;

  return (
    <div className="card">
      {renderHeader()}

      <TableCardBody>
        <tr>
          <td>Total Supply (SOL)</td>
          <td className="text-right text-uppercase">
            {lamportsToSolString(supply.total)}
          </td>
        </tr>

        <tr>
          <td>Circulating Supply (SOL)</td>
          <td className="text-right text-uppercase">
            {lamportsToSolString(supply.circulating)}
          </td>
        </tr>
      </TableCardBody>
    </div>
  );
}

const renderHeader = () => {
  return (
    <div className="card-header">
      <div className="row align-items-center">
        <div className="col">
          <h4 className="card-header-title">Supply Stats</h4>
        </div>
      </div>
    </div>
  );
};
