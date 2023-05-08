'use client';

import Logo from '@img/logos-solana/dark-explorer-logo.svg';
import { useClusterPath } from '@utils/url';
import Image from 'next/image';
import Link from 'next/link';
import { useSelectedLayoutSegment, useSelectedLayoutSegments } from 'next/navigation';
import React from 'react';

import { ClusterStatusButton } from './ClusterStatusButton';

export function Navbar() {
    // TODO: use `collapsing` to animate collapsible navbar
    const [collapse, setCollapse] = React.useState(false);
    const homePath = useClusterPath({ pathname: '/' });
    const supplyPath = useClusterPath({ pathname: '/supply' });
    const inspectorPath = useClusterPath({ pathname: '/tx/inspector' });
    const selectedLayoutSegment = useSelectedLayoutSegment();
    const selectedLayoutSegments = useSelectedLayoutSegments();
    return (
        <nav className="navbar navbar-expand-md navbar-light">
            <div className="container">
                <Link href={homePath}>
                    <Image alt="Solana Explorer" height={22} src={Logo} width={250} />
                </Link>

                <button className="navbar-toggler" type="button" onClick={() => setCollapse(value => !value)}>
                    <span className="navbar-toggler-icon"></span>
                </button>

                <div className={`collapse navbar-collapse ms-auto me-4 ${collapse ? 'show' : ''}`}>
                    <ul className="navbar-nav me-auto">
                        <li className="nav-item">
                            <Link
                                className={`nav-link${selectedLayoutSegment === null ? ' active' : ''}`}
                                href={homePath}
                            >
                                Cluster Stats
                            </Link>
                        </li>
                        <li className="nav-item">
                            <Link
                                className={`nav-link${selectedLayoutSegment === 'supply' ? ' active' : ''}`}
                                href={supplyPath}
                            >
                                Supply
                            </Link>
                        </li>
                        <li className="nav-item">
                            <Link
                                className={`nav-link${
                                    selectedLayoutSegments[0] === 'tx' && selectedLayoutSegments[1] === '(inspector)'
                                        ? ' active'
                                        : ''
                                }`}
                                href={inspectorPath}
                            >
                                Inspector
                            </Link>
                        </li>
                    </ul>
                </div>

                <div className="d-none d-md-block">
                    <ClusterStatusButton />
                </div>
            </div>
        </nav>
    );
}
