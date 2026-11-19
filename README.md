# vue-graphql-explorer

GraphiQL-style GraphQL explorer as a component library for Vue 2.7 and Vue 3: query editor with schema-aware
completion and linting, variables and headers, response view, documentation explorer, history, and a
point-and-click query builder.

Status: pre-release (0.x). It builds and runs on Vue 2.7 and Vue 3.
Plan and status: [`docs/PLAN.md`](docs/PLAN.md).

## Install

```bash
npm install vue-graphql-explorer graphql
```

`vue` (`^2.7` or `^3.3`) and `graphql` (`^16`) are peer dependencies. On install, the package picks the build
that matches your `vue`; to switch by hand run `npx vue-graphql-explorer-switch 2` or `3`.

## Usage

```vue
<template>
  <GraphqlExplorer url="/graphql" :headers="headers" storage-key="my-app-explorer" />
</template>

<script setup lang="ts">
import { GraphqlExplorer } from 'vue-graphql-explorer';
import 'vue-graphql-explorer/style.css';

// Called before every request, so a refreshed token is picked up.
const headers = () => ({ Authorization: `Bearer ${getAccessToken()}` });
</script>
```

Explicit builds: `vue-graphql-explorer/vue3` and `vue-graphql-explorer/vue2` (with `vue3/style.css` and
`vue2/style.css`). Render it client-side only (`<ClientOnly>` in Nuxt 3/4, `<client-only>` in Nuxt 2).

| Prop | Type | Default | |
|---|---|---|---|
| `url` | `string` | required | GraphQL HTTP endpoint, absolute or relative to the page. |
| `wsUrl` | `string` | `url` with ws:// or wss:// | Websocket endpoint for subscriptions. |
| `wsProtocol` | `'graphql-ws' \| 'subscriptions-transport-ws'` | `'graphql-ws'` | Subscription protocol. The websocket opens on the first subscription only. |
| `headers` | object, or function returning one (may be async) | none | Sent with every request (introspection included) and as websocket connection params. Headers typed in the header editor override them. |
| `fetcher` | `Fetcher` | built-in | Replaces the HTTP / websocket fetcher. Receives the merged headers in `opts.headers`. |
| `storageKey` | `string` | `'graphiql'` | Prefix for `localStorage` keys (tabs, history). Give each explorer on one origin its own. |
| `defaultQuery` | `string` | welcome text | Query for new tabs. |

Changing `url`, `headers` or `fetcher` refetches the schema. Types: `GraphqlExplorerProps`, `Fetcher`,
`HeadersOption`, `WsProtocol` are exported.

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md).

## License

MIT
