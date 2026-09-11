import { SolBalance } from '@components/common/SolBalance';
import { toBigNumber } from '@entities/account';
import { BigNumber } from 'bignumber.js';
import BN from 'bn.js';
import React from 'react';

import { Badge } from '@/app/components/shared/ui/badge';

type DeltaValue = BigNumber | BN;

export function BalanceDelta({ delta, isSol = false }: { delta: DeltaValue; isSol?: boolean }) {
    const deltaValue = toBigNumber(delta);
    let sols;

    if (isSol) {
        const absValue = deltaValue.abs();
        sols = <SolBalance lamports={BigInt(absValue.toString())} />;
    }

    if (deltaValue.gt(0)) {
        return (
            <Badge ui="dashkit" variant="success" className="font-mono">
                +{isSol ? sols : deltaValue.toString()}
            </Badge>
        );
    } else if (deltaValue.lt(0)) {
        return (
            <Badge ui="dashkit" variant="warning" className="font-mono">
                -{isSol ? sols : deltaValue.abs().toString()}
            </Badge>
        );
    }

    return (
        <Badge ui="dashkit" variant="default" className="bg-outer-space-800 font-mono text-outer-space-300">
            +0
        </Badge>
    );
}
