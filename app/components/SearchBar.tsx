'use client';

import { useCluster } from '@providers/cluster';
import { Cluster } from '@utils/cluster';
import bs58 from 'bs58';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { useId } from 'react';
import { Search } from 'react-feather';
import Select, { ActionMeta, InputActionMeta, ValueType } from 'react-select';

import { FetchedDomainInfo } from '../api/domain-info/[domain]/route';
import { LOADER_IDS, LoaderName, PROGRAM_INFO_BY_ID, SPECIAL_IDS, SYSVAR_IDS } from '../utils/programs';
import { searchTokens } from '../utils/token-search';

interface SearchOptions {
    label: string;
    options: {
        label: string;
        value: string[];
        pathname: string;
    }[];
}

const hasDomainSyntax = (value: string) => {
    return value.length > 4 && value.substring(value.length - 4) === '.sol';
};

export function SearchBar() {
    const [search, setSearch] = React.useState('');
    const searchRef = React.useRef('');
    const [searchOptions, setSearchOptions] = React.useState<SearchOptions[]>([]);
    const [loadingSearch, setLoadingSearch] = React.useState<boolean>(false);
    const [loadingSearchMessage, setLoadingSearchMessage] = React.useState<string>('loading...');
    const selectRef = React.useRef<Select<any> | null>(null);
    const router = useRouter();
    const { cluster, clusterInfo } = useCluster();
    const searchParams = useSearchParams();
    const onChange = ({ pathname }: ValueType<any, false>, meta: ActionMeta<any>) => {
        if (meta.action === 'select-option') {
            const nextQueryString = searchParams?.toString();
            router.push(`${pathname}${nextQueryString ? `?${nextQueryString}` : ''}`);
            setSearch('');
        }
    };

    const onInputChange = (value: string, { action }: InputActionMeta) => {
        if (action === 'input-change') {
            setSearch(value);
        }
    };

    React.useEffect(() => {
        searchRef.current = search;
        setLoadingSearchMessage('Loading...');
        setLoadingSearch(true);

        // builds and sets local search output
        const options = buildOptions(search, cluster, clusterInfo?.epochInfo.epoch);
        setSearchOptions(options);

        if (search.length > 0) {
            buildTokenOptions(search, cluster).then(tokenOptions => {
                if (tokenOptions) {
                    setSearchOptions(options => [...options, tokenOptions])
                }
            })
        }

        // checking for non local search output
        if (hasDomainSyntax(search) && cluster === Cluster.MainnetBeta) {
            // if search input is a potential domain we continue the loading state
            domainSearch(options);
        } else {
            // if search input is not a potential domain we can conclude the search has finished
            setLoadingSearch(false);
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    // appends domain lookup results to the local search state
    const domainSearch = async (options: SearchOptions[]) => {
        setLoadingSearchMessage('Looking up domain...');
        const searchTerm = search;
        const updatedOptions = await buildDomainOptions(search, options);
        if (searchRef.current === searchTerm) {
            setSearchOptions(updatedOptions);
            // after attempting to fetch the domain name we can conclude the loading state
            setLoadingSearch(false);
            setLoadingSearchMessage('Loading...');
        }
    };

    const resetValue = '' as any;
    return (
        <div className="container my-4">
            <div className="row align-items-center">
                <div className="col">
                    <Select
                        autoFocus
                        inputId={useId()}
                        ref={ref => (selectRef.current = ref)}
                        options={searchOptions}
                        noOptionsMessage={() => 'No Results'}
                        loadingMessage={() => loadingSearchMessage}
                        placeholder="Search for blocks, accounts, transactions, programs, and tokens"
                        value={resetValue}
                        inputValue={search}
                        blurInputOnSelect
                        onMenuClose={() => selectRef.current?.blur()}
                        onChange={onChange}
                        styles={{
                            input: style => ({ ...style, width: '100%' }),
                            /* work around for https://github.com/JedWatson/react-select/issues/3857 */
                            placeholder: style => ({ ...style, pointerEvents: 'none' }),
                        }}
                        onInputChange={onInputChange}
                        components={{ DropdownIndicator }}
                        classNamePrefix="search-bar"
                        isLoading={loadingSearch}
                    />
                </div>
            </div>
        </div>
    );
}

function buildProgramOptions(search: string, cluster: Cluster) {
    const matchedPrograms = Object.entries(PROGRAM_INFO_BY_ID).filter(([address, { name, deployments }]) => {
        if (!deployments.includes(cluster)) return false;
        return name.toLowerCase().includes(search.toLowerCase()) || address.includes(search);
    });

    if (matchedPrograms.length > 0) {
        return {
            label: 'Programs',
            options: matchedPrograms.map(([address, { name }]) => ({
                label: name,
                pathname: '/address/' + address,
                value: [name, address],
            })),
        };
    }
}

const SEARCHABLE_LOADERS: LoaderName[] = ['BPF Loader', 'BPF Loader 2', 'BPF Upgradeable Loader'];

function buildLoaderOptions(search: string) {
    const matchedLoaders = Object.entries(LOADER_IDS).filter(([address, name]) => {
        return (
            SEARCHABLE_LOADERS.includes(name) &&
            (name.toLowerCase().includes(search.toLowerCase()) || address.includes(search))
        );
    });

    if (matchedLoaders.length > 0) {
        return {
            label: 'Program Loaders',
            options: matchedLoaders.map(([id, name]) => ({
                label: name,
                pathname: '/address/' + id,
                value: [name, id],
            })),
        };
    }
}

function buildSysvarOptions(search: string) {
    const matchedSysvars = Object.entries(SYSVAR_IDS).filter(([address, name]) => {
        return name.toLowerCase().includes(search.toLowerCase()) || address.includes(search);
    });

    if (matchedSysvars.length > 0) {
        return {
            label: 'Sysvars',
            options: matchedSysvars.map(([id, name]) => ({
                label: name,
                pathname: '/address/' + id,
                value: [name, id],
            })),
        };
    }
}

function buildSpecialOptions(search: string) {
    const matchedSpecialIds = Object.entries(SPECIAL_IDS).filter(([address, name]) => {
        return name.toLowerCase().includes(search.toLowerCase()) || address.includes(search);
    });

    if (matchedSpecialIds.length > 0) {
        return {
            label: 'Accounts',
            options: matchedSpecialIds.map(([id, name]) => ({
                label: name,
                pathname: '/address/' + id,
                value: [name, id],
            })),
        };
    }
}

async function buildTokenOptions(search: string, cluster: Cluster): Promise<SearchOptions | undefined> {
    const matchedTokens = await searchTokens(search, cluster);

    if (matchedTokens.length > 0) {
        return {
            label: 'Tokens',
            options: matchedTokens
        };
    }
}

async function buildDomainOptions(search: string, options: SearchOptions[]) {
    const domainInfoResponse = await fetch(`/api/domain-info/${search}`);
    const domainInfo = await domainInfoResponse.json() as FetchedDomainInfo;
    const updatedOptions: SearchOptions[] = [...options];
    if (domainInfo && domainInfo.owner && domainInfo.address) {
        updatedOptions.push({
            label: 'Domain Owner',
            options: [
                {
                    label: domainInfo.owner,
                    pathname: '/address/' + domainInfo.owner,
                    value: [search],
                },
            ],
        });
        updatedOptions.push({
            label: 'Name Service Account',
            options: [
                {
                    label: search,
                    pathname: '/address/' + domainInfo.address,
                    value: [search],
                },
            ],
        });
    }
    return updatedOptions;
}

// builds local search options
function buildOptions(rawSearch: string, cluster: Cluster, currentEpoch?: bigint) {
    const search = rawSearch.trim();
    if (search.length === 0) return [];

    const options = [];

    const programOptions = buildProgramOptions(search, cluster);
    if (programOptions) {
        options.push(programOptions);
    }

    const loaderOptions = buildLoaderOptions(search);
    if (loaderOptions) {
        options.push(loaderOptions);
    }

    const sysvarOptions = buildSysvarOptions(search);
    if (sysvarOptions) {
        options.push(sysvarOptions);
    }

    const specialOptions = buildSpecialOptions(search);
    if (specialOptions) {
        options.push(specialOptions);
    }

    if (!isNaN(Number(search))) {
        options.push({
            label: 'Block',
            options: [
                {
                    label: `Slot #${search}`,
                    pathname: `/block/${search}`,
                    value: [search],
                },
            ],
        });

        // Parse as BigInt but not if it starts eg 0x or 0b
        if (currentEpoch !== undefined && !(/^0\w/.test(search)) && BigInt(search) <= currentEpoch + 1n) {
            options.push({
                label: 'Epoch',
                options: [
                    {
                        label: `Epoch #${search}`,
                        pathname: `/epoch/${search}`,
                        value: [search],
                    },
                ],
            });
        }
    }

    // Prefer nice suggestions over raw suggestions
    if (options.length > 0) return options;

    try {
        const decoded = bs58.decode(search);
        if (decoded.length === 32) {
            options.push({
                label: 'Account',
                options: [
                    {
                        label: search,
                        pathname: '/address/' + search,
                        value: [search],
                    },
                ],
            });
        } else if (decoded.length === 64) {
            options.push({
                label: 'Transaction',
                options: [
                    {
                        label: search,
                        pathname: '/tx/' + search,
                        value: [search],
                    },
                ],
            });
        }
    } catch (err) {
        /* empty */
    }

    return options;
}

function DropdownIndicator() {
    return (
        <div className="search-indicator">
            <Search className="me-2" size={15} />
        </div>
    );
}
