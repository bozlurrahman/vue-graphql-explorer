// Public types. `GraphqlExplorerProps` is repeated as a local interface in GraphqlExplorer.vue, because the
// Vue 2.7 compiler only reads prop types declared in the same file. Keep both in step.
import type { Fetcher } from '../lib/explorer';

export type { Fetcher, FetcherOpts, FetcherParams, FetcherResult } from '../lib/explorer';

/** Websocket protocol for subscriptions. */
export type WsProtocol = 'graphql-ws' | 'subscriptions-transport-ws';

/** Headers sent with every request, or a function that returns them (called per request, may be async). */
export type HeadersOption = Record<string, string> | (() => Record<string, string> | Promise<Record<string, string>>);

export interface GraphqlExplorerProps {
  /** GraphQL HTTP endpoint, absolute or relative to the page. */
  url: string;
  /** Websocket endpoint for subscriptions. Default: `url` with ws:// or wss://. */
  wsUrl?: string;
  /** Default: `graphql-ws`. */
  wsProtocol?: WsProtocol;
  /**
   * Host headers (for example `Authorization`). Sent with every request and as websocket connection params.
   * Headers typed into the explorer's header editor override them.
   */
  headers?: HeadersOption;
  /** Replaces the built-in HTTP / websocket fetcher. It receives the merged headers in `opts.headers`. */
  fetcher?: Fetcher;
  /** Prefix for `localStorage` keys. Default: `graphiql`. Give each explorer on one origin its own key. */
  storageKey?: string;
  /** Query for a new tab when nothing is stored yet. */
  defaultQuery?: string;
}
