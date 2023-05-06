import { SWRResponse } from 'swr';
import useSWRImmutable from 'swr/immutable';

type CachedImage = Readonly<{ __type: 'fallbackUrl'; url: string }> | Readonly<{ __type: 'objectUrl'; url: string }>;

async function fetchImage(_: string, uri: string): Promise<CachedImage | undefined> {
    try {
        let response: Response;
        try {
            response = await fetch(uri, { cache: 'force-cache' });
        } catch {
            response = await fetch(uri, { cache: 'reload' });
        }
        const blob = await response.blob();
        return { __type: 'objectUrl', url: URL.createObjectURL(blob) };
    } catch {
        return { __type: 'fallbackUrl', url: uri };
    }
}

export function useCachedImage(uri: string): SWRResponse<CachedImage | undefined> {
    return useSWRImmutable(['cachedImage', uri], fetchImage);
}
