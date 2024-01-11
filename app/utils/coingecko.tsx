import React from 'react';
import useTabVisibility from 'use-tab-visibility';

import { useCluster } from '../providers/cluster';
import { Cluster } from './cluster';

const PRICE_REFRESH = 10000;

export enum CoingeckoStatus {
    Success,
    FetchFailed,
    Loading,
}

export interface CoinInfo {
    price: number;
    volume_24: number;
    market_cap: number;
    price_change_percentage_24h: number;
    market_cap_rank: number;
    last_updated: Date;
}

export interface CoinInfoResult {
    last_updated: string;
    market_cap_rank: number;
    market_data: {
        current_price: {
            usd: number;
        };
        market_cap: {
            usd: number;
        };
        price_change_percentage_24h_in_currency: {
            usd: number;
        };
        total_volume: {
            usd: number;
        };
    };
}

export type CoinGeckoResult = {
    coinInfo?: CoinInfo;
    status: CoingeckoStatus;
};

export function useCoinGecko(coinId?: string): CoinGeckoResult | undefined {
    const { cluster } = useCluster()
    const [coinInfo, setCoinInfo] = React.useState<CoinGeckoResult>();
    const { visible: isTabVisible } = useTabVisibility();
    React.useEffect(() => {
        if (coinId === 'solana') {
            return;
        }
        if (!isTabVisible) {
            return;
        }
        if (cluster !== Cluster.MainnetBeta) {
            return;
        }
        let interval: NodeJS.Timeout | undefined;
        let stale = false;
        if (coinId) {
            const getCoinInfo = async (refresh = false) => {
                if (!refresh) {
                    setCoinInfo({
                        status: CoingeckoStatus.Loading,
                    });
                }
                try {
                    const response = await fetch(
                        `https://api.coingecko.com/api/v3/coins/${coinId}?` +
                        [
                            'community_data=false',
                            'developer_data=false',
                            'localization=false',
                            'market_data=true',
                            'sparkline=false',
                            'tickers=false',
                        ].join('&')
                    );
                    if (stale) {
                        return;
                    }
                    const info: CoinInfoResult = await response.json();
                    setCoinInfo({
                        coinInfo: {
                            last_updated: new Date(info.last_updated),
                            market_cap: info.market_data.market_cap.usd,
                            market_cap_rank: info.market_cap_rank,
                            price: info.market_data.current_price.usd,
                            price_change_percentage_24h: info.market_data.price_change_percentage_24h_in_currency.usd,
                            volume_24: info.market_data.total_volume.usd,
                        },
                        status: CoingeckoStatus.Success,
                    });
                } catch {
                    setCoinInfo({
                        status: CoingeckoStatus.FetchFailed,
                    });
                }
            };

            getCoinInfo();
            interval = setInterval(() => {
                getCoinInfo(true);
            }, PRICE_REFRESH);
        }
        return () => {
            if (interval) {
                clearInterval(interval);
            }
            stale = true;
        };
    }, [coinId, isTabVisible, cluster]);

    return coinInfo;
}
