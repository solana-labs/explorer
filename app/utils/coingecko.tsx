// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import * as CoinGecko from 'coingecko-api';
import React from 'react';
import useTabVisibility from 'use-tab-visibility';

const PRICE_REFRESH = 10000;

const CoinGeckoClient = new CoinGecko.default();

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
    data: {
        market_data: {
            current_price: {
                usd: number;
            };
            total_volume: {
                usd: number;
            };
            market_cap: {
                usd: number;
            };
            price_change_percentage_24h: number;
            market_cap_rank: number;
        };
        last_updated: string;
    };
}

export type CoinGeckoResult = {
    coinInfo?: CoinInfo;
    status: CoingeckoStatus;
};

export function useCoinGecko(coinId?: string): CoinGeckoResult | undefined {
    const [coinInfo, setCoinInfo] = React.useState<CoinGeckoResult>();
    const { visible: isTabVisible } = useTabVisibility();
    React.useEffect(() => {
        if (!isTabVisible) {
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
                    const info: CoinInfoResult = await CoinGeckoClient.coins.fetch(coinId);
                    if (stale) {
                        return;
                    }
                    setCoinInfo({
                        coinInfo: {
                            last_updated: new Date(info.data.last_updated),
                            market_cap: info.data.market_data.market_cap.usd,
                            market_cap_rank: info.data.market_data.market_cap_rank,
                            price: info.data.market_data.current_price.usd,
                            price_change_percentage_24h: info.data.market_data.price_change_percentage_24h,
                            volume_24: info.data.market_data.total_volume.usd,
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
    }, [coinId, isTabVisible]);

    return coinInfo;
}
