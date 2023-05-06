import { useSearchParams } from 'next/navigation';
import { useMemo } from 'react';

type Config = Readonly<{
    additionalParams?: { get(key: string): string | null; toString(): string };
    pathname: string;
}>;

export function useClusterPath({ additionalParams, pathname }: Config) {
    const currentSearchParams = useSearchParams();
    const [pathnameWithoutHash, hash] = pathname.split('#');
    return useMemo(
        () =>
            pickClusterParams(pathnameWithoutHash, currentSearchParams ?? undefined, additionalParams) +
            (hash ? `#${hash}` : ''),
        [additionalParams, currentSearchParams, hash, pathnameWithoutHash]
    );
}

export function pickClusterParams(
    pathname: string,
    currentSearchParams?: { toString(): string; get(key: string): string | null },
    additionalParams?: { get(key: string): string | null }
): string {
    let nextSearchParams = additionalParams ? new URLSearchParams(additionalParams.toString()) : undefined;
    if (currentSearchParams && !!currentSearchParams.toString()) {
        // Pick the params we care about
        ['cluster', 'customUrl'].forEach(paramName => {
            const existingValue = currentSearchParams.get(paramName);
            if (existingValue) {
                nextSearchParams ||= new URLSearchParams();
                nextSearchParams.set(paramName, existingValue);
            }
        });
    }
    const queryString = nextSearchParams?.toString();
    return `${pathname}${queryString ? `?${queryString}` : ''}`;
}
