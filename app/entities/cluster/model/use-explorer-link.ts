import { EXPLORER_BASE_URL as baseUrl } from '@utils/env';

import { Cluster, type ClusterSelection, clusterSlug } from '../lib/cluster';
import { useCluster } from './use-cluster';

export function buildExplorerLink(selection: ClusterSelection, path: string): string {
    let url: string;
    if (!baseUrl.endsWith('/') && !path.startsWith('/')) {
        url = path === '' ? baseUrl : `${baseUrl}/${path}`;
    } else {
        url = `${baseUrl}${path}`;
    }

    const params = new URLSearchParams();
    switch (selection.cluster) {
        case Cluster.Testnet:
        case Cluster.Devnet:
            params.append('cluster', clusterSlug(selection.cluster));
            break;
        case Cluster.Custom:
            params.append('cluster', clusterSlug(selection.cluster));
            // Unconditional: a Custom selection always carries an endpoint.
            params.append('customUrl', selection.endpoint.href);
            break;
        case Cluster.MainnetBeta:
        default:
            // Mainnet doesn't need cluster parameter
            break;
    }

    const queryString = params.toString();
    if (queryString) {
        if (url.indexOf('?') === -1) {
            return `${url}?${queryString}`;
        }
        // change order for additional params as having ?message at the url and placing it first, breaks input at the Inspector
        const [urlPath, qs] = url.split('?');
        return `${urlPath}?${queryString}&${qs}`;
    }
    return url;
}

export function useExplorerLink(path: string) {
    const { selection } = useCluster();
    return { link: buildExplorerLink(selection, path) };
}
