'use client';

import { useCluster, useClusterModal } from '@providers/cluster';
import { clusters, ClusterStatus } from '@utils/cluster';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import React from 'react';

import { Overlay } from './common/Overlay';

export function ClusterModal() {
    const [show, setShow] = useClusterModal();
    const onClose = () => setShow(false);

    return (
        <>
            <div className={`offcanvas offcanvas-end${show ? ' show' : ''}`}>
                <div className="modal-body" onClick={e => e.stopPropagation()}>
                    <span className="c-pointer" onClick={onClose}>
                        &times;
                    </span>

                    <h2 className="text-center mb-4 mt-4">Choose a Cluster</h2>
                    <ClusterToggle />
                </div>
            </div>

            <div onClick={onClose}>
                <Overlay show={show} />
            </div>
        </>
    );
}

function assertUnreachable(_x: never): never {
    throw new Error('Unreachable!');
}

function ClusterToggle() {
    const { status, cluster } = useCluster();

    let activeSuffix = '';
    switch (status) {
        case ClusterStatus.Connected:
            activeSuffix = 'primary';
            break;
        case ClusterStatus.Connecting:
            activeSuffix = 'warning';
            break;
        case ClusterStatus.Failure:
            activeSuffix = 'danger';
            break;
        default:
            assertUnreachable(status);
    }

    const pathname = usePathname();
    const searchParams = useSearchParams();
    return (
        <div className="btn-group-toggle d-flex flex-wrap mb-4">
            {clusters.getAll().map((net, index) => {
                const active = net === cluster;

                const btnClass = active ? `border-${activeSuffix} text-${activeSuffix}` : 'btn-white';

                const nextSearchParams = new URLSearchParams(searchParams?.toString());
                const slug = net.cluster;

                if (slug === clusters.default.cluster) {
                    nextSearchParams.delete('cluster');
                } else {
                    nextSearchParams.set('cluster', slug);
                }

                const nextQueryString = nextSearchParams.toString();
                const clusterUrl = `${pathname}${nextQueryString ? `?${nextQueryString}` : ''}`;
                return (
                    <Link key={index} className={`btn col-12 mb-3 ${btnClass}`} href={clusterUrl}>
                        {net.name}
                    </Link>
                );
            })}
        </div>
    );
}
