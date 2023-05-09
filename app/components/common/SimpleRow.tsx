import { IdlType } from '@project-serum/anchor/dist/cjs/idl';
import React, { ReactNode } from 'react';
import { CornerDownRight } from 'react-feather';

import { camelToTitleCase } from '@/app/utils';
import { typeDisplayName } from '@/app/utils/anchor';

export function SimpleRow({
    rawKey,
    type,
    keySuffix,
    nestingLevel = 0,
    children,
}: {
    rawKey: string;
    type: IdlType | { enum: string };
    keySuffix?: any;
    nestingLevel: number;
    children?: ReactNode;
}) {
    let itemKey = rawKey;
    if (/^-?\d+$/.test(keySuffix)) {
        itemKey = `#${keySuffix}`;
    }
    itemKey = camelToTitleCase(itemKey);
    return (
        <tr
            style={{
                ...(nestingLevel === 0 ? {} : { backgroundColor: '#141816' }),
            }}
        >
            <td className="d-flex flex-row">
                {nestingLevel > 0 && (
                    <span style={{ paddingLeft: `${15 * nestingLevel}px` }}>
                        <CornerDownRight className="me-2" size={15} />
                    </span>
                )}
                <div>{itemKey}</div>
            </td>
            <td>{typeDisplayName(type)}</td>
            <td className="text-lg-end">{children}</td>
        </tr>
    );
}
