// Public entry. The CSS is bundled into style.css; import 'vue-graphql-explorer/style.css' in the host.
import './styles/explorer.css';
import './styles/simple-editor.css';

export { default as GraphqlExplorer } from './components/GraphqlExplorer.vue';
export { createGraphiQLFetcher } from './lib/explorer';
export type {
  Fetcher,
  FetcherOpts,
  FetcherParams,
  FetcherResult,
  GraphqlExplorerProps,
  HeadersOption,
  WsProtocol,
} from './types/public';
