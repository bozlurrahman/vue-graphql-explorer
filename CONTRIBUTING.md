# Contributing

## Setup and checks

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
- Playgrounds: `playground/vue3` and `playground/vue2` (`npm install && npm run dev` in each, after a root build).
  They proxy `/graphql` to `http://localhost:30011` (the intelli-app-operations server); set `VITE_PROXY_TARGET`
  to use another server. `?ws=legacy` in the page URL switches subscriptions to `subscriptions-transport-ws`.
- Check every change in both playgrounds. The Vue 2 build catches compile problems, but some bugs only show at
  runtime (see the `reactive()` and `h()` rules below).
- `vitest` is pinned to `~4.0`: `vitest@4.1` makes npm 10.9 crash while building the tree
  (`Cannot read properties of null (reading 'edgesOut')`).
- Work plan and status: `docs/PLAN.md`.

## Rules for the shared source (Vue 2.7 + Vue 3)

ESLint enforces most of these (`eslint.config.mjs`); the Vue 2 build and the playgrounds catch the rest.

- Import Composition API functions from `vue-demi`, never from `vue`. No Pinia: stores use
  `defineExplorerStore` (`src/stores/registry.ts`), one registry per `<GraphqlExplorer>`. A store that uses
  another store looks it up at the top of its setup, not inside an action.
- One root element per template (`<div class="graphiql-contents">` adds no box).
- No `Teleport`, `Suspense`, `Fragment`, `defineModel`, `useTemplateRef`, `useId`, `capitalize`.
  Template refs: `const fooRef = ref<HTMLElement | null>(null)` with `ref="fooRef"`. Portals: `v-portal`
  (`src/directives/portal.ts`) on an always-rendered element that is the first child of its parent.
- `v-model` on components: an explicit prop and event pair, because Vue 2 uses `value` / `input` and Vue 3 uses
  `modelValue` / `update:modelValue`. No `$listeners`, `.sync` or `.native`; declare events with `defineEmits`.
- No TypeScript in templates (`as`, `!`): put casts in the script.
- `defineProps<Props>()` with `Props` declared in the same file (the Vue 2.7 compiler cannot read imported types).
- `<template v-for>`: put `:key` on the child elements.
- Render functions: `hWithProps` / `hWithHtml` (`src/lib/h.ts`), not `h()` with a Vue 3 data object. A plugin's
  `content` is a component, never a bare render function (Vue 2 treats that as an async component).
- Large or class-based values (GraphQL schema and types, editor instances, Maps) go in `shallowRef` and are
  replaced, not mutated. Vue 2 cannot observe Maps or `shallowReactive` arrays.
- A store that returns an object holding refs it still uses itself wraps it in `markRaw()`: Vue 2's
  `reactive()` converts nested objects in place.
- CSS: `:deep()` only (no `>>>` or `/deep/`).

## Releases

Semantic versioning. Releases are published from CI on a `v*` tag with npm provenance (EXP-10 in `docs/PLAN.md`);
nobody publishes from a laptop.
