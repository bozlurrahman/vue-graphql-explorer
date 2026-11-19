// Builds the explorer's fetcher from the <GraphqlExplorer> props. Props are read per request, so changes to
// `url`, `headers`, `fetcher` or `wsProtocol` apply to the next request without remounting.
//
// Headers: host `headers` first, then the header editor's headers on top. The merged headers go to the HTTP
// request, or to the websocket connection params for subscriptions.
import { SubscriptionClient } from 'subscriptions-transport-ws';
import { onScopeDispose } from 'vue-demi';
import { createGraphiQLFetcher, type Fetcher } from '../lib/explorer';
import { useExplorerOptions } from '../stores/registry';
import type { GraphqlExplorerProps } from '../types/public';

export async function resolveHeaders(headers: GraphqlExplorerProps['headers']): Promise<Record<string, string>> {
  if (!headers) return {};
  return typeof headers === 'function' ? ((await headers()) ?? {}) : headers;
}

/** Websocket URL for subscriptions: `wsUrl`, or `url` with ws:// / wss:// (browser only). */
export function resolveWsUrl(options: Pick<GraphqlExplorerProps, 'url' | 'wsUrl'>): string {
  if (options.wsUrl) return options.wsUrl;
  if (typeof window === 'undefined') return '';
  const url = new URL(options.url, window.location.href);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  return url.toString();
}

export function useExplorerFetcher(): Fetcher {
  const options = useExplorerOptions();

  // subscriptions-transport-ws keeps one client per URL. `lazy`: it connects on the first subscription only.
  let legacyClient: SubscriptionClient | null = null;
  let legacyClientUrl = '';
  function getLegacyClient(): SubscriptionClient {
    const url = resolveWsUrl(options);
    if (!legacyClient || legacyClientUrl !== url) {
      legacyClient?.close();
      legacyClient = new SubscriptionClient(url, {
        lazy: true,
        reconnect: true,
        reconnectionAttempts: 10,
        connectionParams: () => resolveHeaders(options.headers),
      });
      legacyClientUrl = url;
    }
    return legacyClient;
  }
  onScopeDispose(() => legacyClient?.close());

  return async (params, opts) => {
    const headers = { ...(await resolveHeaders(options.headers)), ...(opts?.headers ?? {}) };
    const merged = { ...opts, headers };

    if (options.fetcher) return options.fetcher(params, merged);

    const legacy = options.wsProtocol === 'subscriptions-transport-ws';
    const builtIn = createGraphiQLFetcher({
      url: options.url,
      // Called lazily by the fetcher, for subscriptions only.
      ...(legacy ? { legacyClient: { request: (p: any) => getLegacyClient().request(p) } } : {}),
      ...(!legacy ? { subscriptionUrl: resolveWsUrl(options) } : {}),
    });
    return builtIn(params, merged);
  };
}
