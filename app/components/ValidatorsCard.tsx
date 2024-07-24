import { Address } from '@components/common/Address';
import { SolBalance } from '@components/common/SolBalance';
import { PublicKey} from '@solana/web3.js';
import React, {useEffect} from 'react';
import { AlertTriangle } from 'react-feather';
import { Tooltip } from 'react-tooltip'

import {fetchXolanaValidators, ValidatorEntity} from "@/app/api";

export function ValidatorsCard() {
    const [validators, setValidators] = React.useState<ValidatorEntity[] | null>(null);

    useEffect(() => {
        const fetchValidators = async () => {
            const response = await fetchXolanaValidators();
            setValidators(response);
        };

        fetchValidators().then();
    }, []);

    return (
        <>
            <div className="card">
                <div className="card-header">
                    <div className="row align-items-center">
                        <div className="col">
                            <h4 className="card-header-title">Validators</h4>
                        </div>

                    </div>
                </div>

                {validators && (
                    <div className="table-responsive mb-0">
                        <table className="table table-sm table-nowrap card-table">
                            <thead>
                                <tr>
                                    <th className="text-muted">Voter Address</th>
                                    <th className="text-muted text-end">Active Stake (SOL)</th>
                                </tr>
                            </thead>
                            <tbody className="list">
                                {validators.map((validator, index) => renderValidatorRow(validator, index))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </>
    );
}

const renderValidatorRow = (validatorEntity: ValidatorEntity, index: number) => {
    return (
        <tr key={index}>
            <td>
              <div className="d-flex">
                <Address pubkey={new PublicKey(validatorEntity.votePubkey)} link truncate/>

                {validatorEntity.delinquent ?
                  <>
                    <Tooltip id="my-tooltip" />
                    <span data-tooltip-id="my-tooltip" data-tooltip-content="Delinquent Validator">
                           <AlertTriangle size="15"  className="mx-2 text-danger" data-toggle="popover" data-placement="left"
                                          data-content="Vivamus sagittis lacus vel augue laoreet rutrum faucibus."/>
                    </span>
                  </>
                   : null}
              </div>

            </td>
          <td className="text-end">
            <SolBalance lamports={validatorEntity.activatedStake} maximumFractionDigits={0}/>
          </td>
        </tr>
    );
};
