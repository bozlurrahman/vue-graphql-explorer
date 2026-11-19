# vue-graphql-explorer

GraphiQL-style GraphQL explorer as a component library for Vue 2.7 and Vue 3: query editor with schema-aware
completion and linting, variables and headers, response view, documentation explorer, history, and a
point-and-click query builder.

Status: 0.x. Minor versions may break the API; see [`CHANGELOG.md`](CHANGELOG.md).
Plan and status: [`docs/PLAN.md`](docs/PLAN.md).

## Install

```bash
npm install vue-graphql-explorer graphql
```

`vue` (`^2.7` or `^3.3`) and `graphql` (`^16`) are peer dependencies. On install, the package picks the build
that matches your `vue`; to switch by hand run `npx vue-graphql-explorer-switch 2` or `3`. With
`--ignore-scripts` (or a package manager that skips install scripts) the root entry stays on Vue 3: import
`vue-graphql-explorer/vue2` and `vue-graphql-explorer/vue2/style.css` on Vue 2.7.

The explorer fills its parent, so give the parent a height.

## Vue 3

```vue
<template>
  <div style="height: 100vh">
    <GraphqlExplorer url="/graphql" :headers="headers" storage-key="my-app-explorer" />
  </div>
</template>

<script setup lang="ts">
import { GraphqlExplorer } from 'vue-graphql-explorer';
import 'vue-graphql-explorer/style.css';

// Called before every request, so a refreshed token is picked up.
const headers = () => ({ Authorization: `Bearer ${getAccessToken()}` });
</script>
```

## Vue 2.7

The same component and props. Import the Vue 2 build explicitly if install scripts did not run:

```vue
<template>
  <div style="height: 100vh">
    <GraphqlExplorer url="/graphql" :headers="headers" />
  </div>
</template>

<script setup>
import { GraphqlExplorer } from 'vue-graphql-explorer/vue2';
import 'vue-graphql-explorer/vue2/style.css';

const headers = () => ({ Authorization: `Bearer ${getAccessToken()}` });
</script>
```

## Nuxt 3 / Nuxt 4

The package imports without touching `window`, but the explorer is interactive only in the browser: wrap it in
`<ClientOnly>`.

```vue
<template>
  <div style="height: 100vh">
    <ClientOnly>
      <GraphqlExplorer url="/graphql" :headers="headers" storage-key="admin-explorer" />
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import { GraphqlExplorer } from 'vue-graphql-explorer';
import 'vue-graphql-explorer/style.css';

const token = useCookie('access_token');
const headers = () => (token.value ? { Authorization: `Bearer ${token.value}` } : {});
</script>
```

## Nuxt 2 (2.16+, Vue 2.7)

Nuxt 2 builds with webpack 4, which ignores `exports`, cannot parse newer syntax in `graphql` and its helpers,
and loads `.mjs` files strictly. Tested with Nuxt 2.18.1:

```js
// nuxt.config.js
export default {
  build: {
    transpile: ['graphql', 'graphql-ws', 'graphql-language-service', 'meros'],
    extend(config) {
      // graphql and vue-demi ship .mjs files that import CommonJS.
      config.module.rules.push({ test: /\.mjs$/, include: /node_modules/, type: 'javascript/auto' });
      // One Vue instance: without this, vue-demi's .mjs loads the CommonJS build next to the app's ESM build.
      config.resolve.alias.vue$ = 'vue/dist/vue.runtime.esm.js';
    },
  },
};
```

```vue
<template>
  <div style="height: 100vh">
    <client-only>
      <GraphqlExplorer url="/graphql" :headers="headers" />
    </client-only>
  </div>
</template>

<script>
import { GraphqlExplorer } from 'vue-graphql-explorer';
// webpack 4 ignores `exports`, so use the file path for the stylesheet.
import 'vue-graphql-explorer/dist/style.css';

export default {
  components: { GraphqlExplorer },
  methods: {
    // Called before every request, so a refreshed token is picked up.
    headers() {
      return { Authorization: `Bearer ${getAccessToken()}` };
    },
  },
};
</script>
```

With npm 7 or newer, a fresh Nuxt 2 install may hoist webpack 5 and fail with
`Cannot find module 'webpack/lib/LoaderTargetPlugin'`; add `webpack@4` to your dependencies. This is a Nuxt 2
install issue, not specific to this package.

## Props

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
