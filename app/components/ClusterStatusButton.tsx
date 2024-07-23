'use client';

import { useCluster, useClusterModal } from '@providers/cluster';
import { ClusterStatus } from '@utils/cluster';
import React from 'react';
import { AlertCircle, CheckCircle } from 'react-feather';

export function ClusterStatusBanner() {
    const [, setShow] = useClusterModal();

    return (
        <div className="container d-md-none my-4">
            <div onClick={() => setShow(true)}>
                <Button />
            </div>
        </div>
    );
}

export function ClusterStatusButton() {
    const [, setShow] = useClusterModal();

    return (
        <div onClick={() => setShow(true)}>
            <Button />
        </div>
    );
}

function Button() {
    const { status, name } = useCluster();

    const btnClasses = (variant: string) => {
        return `btn d-block btn-${variant}`;
    };

    const spinnerClasses = 'align-text-top spinner-grow spinner-grow-sm me-2';

    switch (status) {
        case ClusterStatus.Connected:
            return (
                <span className={btnClasses('primary')}>
                    <CheckCircle className="fe me-2" size={15} />
                    {name}
                </span>
            );

        case ClusterStatus.Connecting:
            return (
                <span className={btnClasses('warning')}>
                    <span className={spinnerClasses} role="status" aria-hidden="true"></span>
                    {name}
                </span>
            );

        case ClusterStatus.Failure:
            return (
                <span className={btnClasses('danger')}>
                    <AlertCircle className="me-2" size={15} />
                    {name}
                </span>
            );
    }
}
