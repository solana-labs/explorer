import React, { Fragment, useState } from 'react';
import { ChevronDown, ChevronUp, CornerDownRight } from 'react-feather';

export function ExpandableRow({
    fieldName,
    fieldType,
    nestingLevel,
    children,
}: {
    fieldName: string;
    fieldType: string;
    nestingLevel: number;
    children: React.ReactNode;
}) {
    const [expanded, setExpanded] = useState(false);
    return (
        <>
            <tr
                style={{
                    ...(nestingLevel === 0 ? {} : { backgroundColor: '#141816' }),
                }}
            >
                <td className="d-flex flex-row">
                    {nestingLevel > 0 && (
                        <div style={{ paddingLeft: `${15 * nestingLevel}px` }}>
                            <CornerDownRight className="me-2" size={15} />
                        </div>
                    )}
                    <div>{fieldName}</div>
                </td>
                <td>{fieldType}</td>
                <td className="text-lg-end" onClick={() => setExpanded(current => !current)}>
                    <div className="c-pointer">
                        {expanded ? (
                            <Fragment>
                                <span className="text-info me-2">Collapse</span>
                                <ChevronUp size={15} />
                            </Fragment>
                        ) : (
                            <>
                                <span className="text-info me-2">Expand</span>
                                <ChevronDown size={15} />
                            </>
                        )}
                    </div>
                </td>
            </tr>
            {expanded && <>{children}</>}
        </>
    );
}
