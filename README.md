# vue-graphql-explorer

GraphiQL-style GraphQL explorer as a component library for Vue 2.7 and Vue 3.

Status: being extracted from the Intelli Apps admin panel. The work plan lives in
`intelli-app-operations/docs/MasterPlan.md`, section "GraphQL explorer package" (items EXP-01 to EXP-12).
Builds and runs on Vue 2.7 and Vue 3 (EXP-03). The public props are temporary (`url`, `wsUrl`) until EXP-04.

Published to npm as `vue-graphql-explorer`. License: MIT.

## Development

```bash
npm run setup       # installs the root (Vue 3) and toolchain/vue2 (Vue 2.7 compiler)
npm run lint
npm run typecheck
npm test
npm run build       # dist/vue3, dist/vue2, dist/types, then points dist/index.js at vue3
```

- One source in `src/`, two builds. `vite build --mode vue3` uses `@vitejs/plugin-vue`; `--mode vue2` uses
  `@vitejs/plugin-vue2` and Vue 2.7 from `toolchain/vue2/node_modules`. They live in their own folder because
  Vue 2 and Vue 3 cannot share one `node_modules` without peer conflicts.
- Entry points: `vue-graphql-explorer` (picked by the `postinstall` script from the host's `vue` version),
  `vue-graphql-explorer/vue3`, `vue-graphql-explorer/vue2`, and the matching `style.css`.
  Hosts can switch by hand with `npx vue-graphql-explorer-switch 2|3`.
- Playgrounds: `playground/vue3` and `playground/vue2` (`npm install && npm run dev` in each, after a root build).
- `vitest` is pinned to `~4.0`: `vitest@4.1` makes npm 10.9 crash while building the tree
  (`Cannot read properties of null (reading 'edgesOut')`).

## Rules for the shared source (Vue 2.7 + Vue 3)

ESLint enforces most of these (`eslint.config.mjs`); the Vue 2 build catches the rest.

- Import Composition API functions from `vue-demi`, never from `vue`. No Pinia: stores use
  `defineExplorerStore` (`src/stores/registry.ts`), one registry per `<GraphqlExplorer>`.
- One root element per template (`<div class="graphiql-contents">` adds no box).
- No `Teleport`, `Suspense`, `Fragment`, `defineModel`, `useTemplateRef`, `useId`, `capitalize`.
  Template refs: `const fooRef = ref<HTMLElement | null>(null)` with `ref="fooRef"`. Portals: `v-portal`.
- No TypeScript in templates (`as`, `!`): put casts in the script.
- `defineProps<Props>()` with `Props` declared in the same file (the Vue 2.7 compiler cannot read imported types).
- `<template v-for>`: put `:key` on the child elements.
- Render functions: `hWithProps` / `hWithHtml` (`src/lib/h.ts`), not `h()` with a Vue 3 data object.
- Large or class-based values (GraphQL schema and types, editor instances, Maps) go in `shallowRef` and are
  replaced, not mutated. Vue 2 cannot observe Maps or `shallowReactive` arrays.
- A store that returns an object holding refs it still uses itself wraps it in `markRaw()`: Vue 2's
  `reactive()` converts nested objects in place.
