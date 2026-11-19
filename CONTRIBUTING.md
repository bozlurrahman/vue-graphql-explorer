# Contributing

## Setup and checks

```bash
npm run setup       # installs the root (Vue 3) and toolchain/vue2 (Vue 2.7 compiler)
npm run lint
npm run typecheck
npm test            # Vue 3: unit, SSR (test/ssr.test.ts) and component tests
npm run test:vue2   # Vue 2.7: the same component tests (toolchain/vue2/vitest.config.mjs)
npm run build       # dist/vue3, dist/vue2, dist/types, then points dist/index.js at vue3
npm run test:ssr:vue2  # after build: imports and server-renders dist/vue2 with Vue 2.7
npm run size        # after build: raw and gzip sizes
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
- Component tests live in `test/component/` and import `mountExplorer` from `#mount`, which points at
  `mount-vue3.ts` (VTU v2) or `mount-vue2.ts` (VTU v1). Use only wrapper methods both versions share (`types.ts`).
- CI (`.github/workflows/ci.yml`) runs a Vue 3 leg (lint, typecheck, `npm test`, build, pack check, size) and a
  Vue 2.7 leg (build, `test:vue2`, `test:ssr:vue2`). Both lockfiles are committed with `git add -f`, because the
  global gitignore excludes `package-lock.json`. After changing dependencies, commit the updated lockfile.
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
- SSR safety: no `window`, `document`, `navigator` or `localStorage` at module level or in `setup`. Put DOM work in
  `onMounted` or event handlers. Browser storage only through the storage store (`src/stores/storage.ts`).

## Releases

Semantic versioning; while the version is 0.x, a minor version may break the API (list it under **Breaking** in
`CHANGELOG.md`). Releases are published by `.github/workflows/release.yml` on a `v*` tag, with npm provenance.
Nobody publishes from a laptop: `prepublishOnly` (`scripts/prepublish-guard.mjs`) refuses outside that workflow.

1. Move the `[Unreleased]` entries in `CHANGELOG.md` to a new `## [x.y.z] - YYYY-MM-DD` section and update the
   compare links at the bottom.
2. `npm version x.y.z --no-git-tag-version` (updates `package.json` and `package-lock.json`).
3. `npm run build && npm run pack:check`: the tarball allowlist, no source maps or env files, no internal hosts
   or local paths.
4. Commit, then `git tag vx.y.z && git push origin main vx.y.z`.

The workflow runs the full CI, checks that the tag matches `package.json` and that `CHANGELOG.md` has the
section, publishes (`latest`, or `next` for a version with a hyphen) and creates the GitHub release from the
changelog section.

One-time setup: a granular npm access token for the account `bozlur` (2FA on), publish rights on
`vue-graphql-explorer` only, stored as the `NPM_TOKEN` secret of the GitHub environment `npm`. Add required
reviewers to that environment to approve each release by hand.

- First publish: npm only lets a granular token be limited to packages that already exist. For `0.1.0` use a
  short-lived token with publish rights on all packages, then replace it with one limited to
  `vue-graphql-explorer`.
- Alternative without a stored token: npm trusted publishing (OIDC) for this repository and `release.yml`.
  Configure it on the package's npm settings page after the first publish, then drop `NODE_AUTH_TOKEN` from the
  workflow.
