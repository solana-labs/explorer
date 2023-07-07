import { Address } from '@components/common/Address';
import { ErrorCard } from '@components/common/ErrorCard';
import { LoadingCard } from '@components/common/LoadingCard';
import { SolBalance } from '@components/common/SolBalance';
import { Status, useFetchRichList, useRichList } from '@providers/richList';
import { useSupply } from '@providers/supply';
import { AccountBalancePair } from '@solana/web3.js';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import React, { createRef, useMemo } from 'react';
import { ChevronDown } from 'react-feather';
import useAsyncEffect from 'use-async-effect';

import { percentage } from '../utils/math';

type Filter = 'circulating' | 'nonCirculating' | 'all' | null;

export function TopAccountsCard() {
    const supply = useSupply();
    const richList = useRichList();
    const fetchRichList = useFetchRichList();
    const filter = useQueryFilter();

    if (typeof supply !== 'object') return null;

    if (richList === Status.Disconnected) {
        return <ErrorCard text="Not connected to the cluster" />;
    }

    if (richList === Status.Connecting) {
        return <LoadingCard />;
    }

    if (typeof richList === 'string') {
        return <ErrorCard text={richList} retry={fetchRichList} />;
    }

    let supplyCount: bigint;
    let accounts, header;

    if (richList !== Status.Idle) {
        switch (filter) {
            case 'nonCirculating': {
                accounts = richList.nonCirculating;
                supplyCount = supply.nonCirculating;
                header = 'Non-Circulating';
                break;
            }
            case 'all': {
                accounts = richList.total;
                supplyCount = supply.total;
                header = 'Total';
                break;
            }
            case 'circulating':
            default: {
                accounts = richList.circulating;
                supplyCount = supply.circulating;
                header = 'Circulating';
                break;
            }
        }
    }

    return (
        <>
            <div className="card">
                <div className="card-header">
                    <div className="row align-items-center">
                        <div className="col">
                            <h4 className="card-header-title">Largest Accounts</h4>
                        </div>

                        <div className="col-auto">
                            <FilterDropdown filter={filter} />
                        </div>
                    </div>
                </div>

                {richList === Status.Idle && (
                    <div className="card-body">
                        <span className="btn btn-white ms-3 d-none d-md-inline" onClick={fetchRichList}>
                            Load Largest Accounts
                        </span>
                    </div>
                )}

                {accounts && (
                    <div className="table-responsive mb-0">
                        <table className="table table-sm table-nowrap card-table">
                            <thead>
                                <tr>
                                    <th className="text-muted">Rank</th>
                                    <th className="text-muted">Address</th>
                                    <th className="text-muted text-end">Balance (SOL)</th>
                                    <th className="text-muted text-end">% of {header} Supply</th>
                                </tr>
                            </thead>
                            <tbody className="list">
                                {accounts.map((account, index) => renderAccountRow(account, index, supplyCount))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </>
    );
}

const renderAccountRow = (account: AccountBalancePair, index: number, supply: bigint) => {
    return (
        <tr key={index}>
            <td>
                <span className="badge bg-gray-soft badge-pill">{index + 1}</span>
            </td>
            <td>
                <Address pubkey={account.address} link />
            </td>
            <td className="text-end">
                <SolBalance lamports={account.lamports} maximumFractionDigits={0} />
            </td>
            <td className="text-end">{percentage(BigInt(100 * account.lamports), supply, 4).toFixed(3) + '%'}</td>
        </tr>
    );
};

const useQueryFilter = (): Filter => {
    const currentSearchParams = useSearchParams();
    const filter = currentSearchParams?.get('filter');
    if (filter === 'circulating' || filter === 'nonCirculating' || filter === 'all') {
        return filter;
    } else {
        return null;
    }
};

const filterTitle = (filter: Filter): string => {
    switch (filter) {
        case 'nonCirculating': {
            return 'Non-Circulating';
        }
        case 'all': {
            return 'All';
        }
        case 'circulating':
        default: {
            return 'Circulating';
        }
    }
};

type DropdownProps = {
    filter: Filter;
};

const FilterDropdown = ({ filter }: DropdownProps) => {
    const FILTERS: Filter[] = ['all', null, 'nonCirculating'];
    const dropdownRef = createRef<HTMLButtonElement>();
    useAsyncEffect(
        async isMounted => {
            if (!dropdownRef.current) {
                return;
            }
            const Dropdown = (await import('bootstrap/js/dist/dropdown')).default;
            if (!isMounted || !dropdownRef.current) {
                return;
            }
            return new Dropdown(dropdownRef.current);
        },
        dropdown => {
            if (dropdown) {
                dropdown.dispose();
            }
        },
        [dropdownRef]
    );
    return (
        <div className="dropdown">
            <button className="btn btn-white btn-sm" type="button" data-bs-toggle="dropdown" ref={dropdownRef}>
                {filterTitle(filter)} <ChevronDown size={13} className="align-text-top" />
            </button>
            <div className="dropdown-menu-end dropdown-menu">
                {FILTERS.map(filterOption => (
                    <FilterLink currentFilter={filter} filterOption={filterOption} key={filterOption} />
                ))}
            </div>
        </div>
    );
};

function FilterLink({ currentFilter, filterOption }: { currentFilter: Filter; filterOption: Filter }) {
    const currentPathname = usePathname();
    const currentSearchParams = useSearchParams();
    const href = useMemo(() => {
        const params = new URLSearchParams(currentSearchParams?.toString());
        if (filterOption === null) {
            params.delete('filter');
        } else {
            params.set('filter', filterOption);
        }
        const queryString = params.toString();
        return `${currentPathname}${queryString ? `?${queryString}` : ''}`;
    }, [currentPathname, currentSearchParams, filterOption]);
    return (
        <Link
            key={filterOption || 'null'}
            href={href}
            className={`dropdown-item${filterOption === currentFilter ? ' active' : ''}`}
        >
            {filterTitle(filterOption)}
        </Link>
    );
}
