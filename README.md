# vue-graphql-explorer

GraphiQL-style GraphQL explorer as a component library for Vue 2.7 and Vue 3: query editor with schema-aware
completion and linting, variables and headers, response view, documentation explorer, history, and a
point-and-click query builder.

Status: pre-release (0.x). It builds and runs on Vue 2.7 and Vue 3; the public props are not final yet.
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
  <GraphqlExplorer url="/graphql" />
</template>

<script setup lang="ts">
import { GraphqlExplorer } from 'vue-graphql-explorer';
import 'vue-graphql-explorer/style.css';
</script>
```

Explicit builds: `vue-graphql-explorer/vue3` and `vue-graphql-explorer/vue2` (with `vue3/style.css` and
`vue2/style.css`). Render it client-side only (`<ClientOnly>` in Nuxt 3/4, `<client-only>` in Nuxt 2).

Props (temporary until 1.0): `url` (required, HTTP endpoint) and `wsUrl` (subscriptions; derived from `url` when
omitted).

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md).

## License

MIT
