# Plan: vue-graphql-explorer 1.0 (EXP-01 to EXP-12)

This plan moved here from `intelli-app-operations/docs/MasterPlan.md` on 2026-11-19. Only the consumer-side
items (EXP-09 nuxt integration, EXP-11 server introspection) are also listed there, because they change that repo.

## Background

The GraphiQL-style explorer lived in the Intelli Apps admin panel (`intelli-app-operations/nuxt`, about 7,600 lines in
`components/gql/`, 8 Pinia stores, 7 composables, `lib/explorer.ts`, 2 CSS files). There it was a public page at
`/explorer` that renders only outside production. It becomes a standalone npm package that works in Vue 2.7 and
Vue 3. The nuxt admin panel (Vue 3) is its first user and installs it from npm like any other dependency.

## Decisions

- 2026-11-18: extract the explorer into an npm package for Vue 2.7 and Vue 3, named `vue-graphql-explorer`
  (unscoped; free on the registry on 2026-11-18), published by the npm account `bozlur`.
- 2026-11-19: the package has its own git repository at `/var/www/html/bysl/vue-graphql-explorer`, a sibling of
  `intelli-app-operations`. GitHub: `bozlurrahman/vue-graphql-explorer` (personal account), remote
  `git@github-intelli:bozlurrahman/vue-graphql-explorer.git` (SSH host alias `github-intelli`). This repo owns its
  CI, release tags, `CHANGELOG.md` and coding rules. This plan tracks the work until 1.0.0; after that, GitHub issues.

## Package shape

- Supported Vue versions: **2.7** and **3.x**. Vue 2.0 to 2.6 are not supported (no built-in Composition API, no
  `<script setup>`). Vue 2 reached end of life on 2023-12-31, so Vue 2 support gets fixes only after 1.x.
- `vue` (`^2.7.0 || ^3.3.0`) and `graphql` (`^16`) are `peerDependencies`. `vue-demi`, `graphql-language-service`,
  `graphql-ws`, `subscriptions-transport-ws`, `meros` and `copy-to-clipboard` are `dependencies`.
- No Pinia (Pinia 3 is Vue 3 only). Stores use `defineExplorerStore` (`src/stores/registry.ts`), one registry per
  `<GraphqlExplorer>`: two explorers on one page never share state, and the host's Pinia is never touched.
- Exports: the `GraphqlExplorer` component, `createGraphiQLFetcher`, the prop and plugin types, and `style.css`.
- No Nuxt imports, no `~/` aliases, no auto-imports, no project URLs. Everything the host knows comes in through props.

How one source serves Vue 2 and Vue 3:
- Single-file components with `<script setup lang="ts">`; Vue 2.7 compiles these too.
- Composition API imports go through `vue-demi`.
- Two builds from the same `src/`: `dist/vue3/` with `@vitejs/plugin-vue`, `dist/vue2/` with `@vitejs/plugin-vue2`
  and Vue 2.7 from `toolchain/vue2/` (own `node_modules`, because Vue 2 and Vue 3 cannot share one install).
- `exports`: `.` (picked by `postinstall` from the host's `vue`), `./vue3`, `./vue2`, and the matching `style.css`.
  Hosts can switch by hand with `npx vue-graphql-explorer-switch 2|3`.
- The code rules for the shared source are in `CONTRIBUTING.md`.

## Steps

- [x] **EXP-01 Scaffold.** Done 2026-11-19 (`4f8a679`). `package.json` exports, the two Vite library builds,
  `vue-tsc` type output, ESLint flat config, Prettier settings copied from nuxt, Vitest config, `playground/vue3` and
  `playground/vue2`, `scripts/switch.mjs` + `postinstall`. `vitest` pinned to `~4.0`: 4.1 crashes npm 10.9
  (`Cannot read properties of null (reading 'edgesOut')`).
- [x] **EXP-02 Move the code.** Done 2026-11-19 (`7a10dd8` unchanged copy from intelli-app-operations `59d01d14e`,
  `99b44a1` import paths). Layout `src/{components,stores,composables,lib,styles,types}`. `git mv` cannot cross
  repositories, so the import commit names the source commit. The files stay in nuxt until EXP-09 deletes them.
- [x] **EXP-03 Vue 2 and Vue 3 compatible source.** Done 2026-11-19 (`92f7bdf`).
  - Pinia replaced by `defineExplorerStore` (Pinia's setup-store API; stores run in the registry's effect scope).
  - `vue-demi` imports; the Nuxt auto-imports made explicit.
  - `useTemplateRef` to `ref(null)`; `Teleport` to the `v-portal` directive; `Fragment` to `<template>`;
    `capitalize` to `src/lib/strings.ts`; multi-root templates wrapped in `.graphiql-contents` (`display: contents`);
    keys moved off `<template v-for>`; TypeScript casts moved out of templates; prop types declared in the same file.
  - Render functions through `src/lib/h.ts` (Vue 2 nests `props` / `domProps`).
  - `shallowRef` for the schema, GraphQL types, editor instances and Maps; `markRaw` where Vue 2's in-place
    `reactive()` broke a store.
  - Vue 2 build: `whitespace: 'condense'` plus `toolchain/vue2/trim-edge-whitespace.mjs`, so text matches Vue 3.
  - ESLint guards against `vue` / `pinia` imports and Vue 3-only APIs.
  - Checked: lint and `vue-tsc` 0 errors, both builds, both playgrounds in headless Chrome against the local
    intelli-app-operations server (query, docs navigation, history, explorer plugin, dialog portal), no console warnings.
- [x] **EXP-04 Remove the Nuxt coupling.** Done 2026-11-19.
  - Props on `GraphqlExplorer`: `url` (required), `wsUrl`, `wsProtocol` (`graphql-ws` default |
    `subscriptions-transport-ws`), `headers` (object or function, called per request), `fetcher`, `storageKey`
    (default `graphiql`), `defaultQuery`. Types in `src/types/public.ts`, exported from the entry.
  - The props live on the store registry (`useExplorerOptions()`); `src/composables/useExplorerFetcher.ts` reads them
    per request. Host headers first, header-editor headers on top; the result goes to HTTP and to the websocket
    connection params. Introspection uses the same fetcher, so admin-only introspection (EXP-11) can work.
  - The websocket opens on the first subscription only (no client at mount). The schema reloads when `url`,
    `headers` or `fetcher` change; the reload button forces a refetch (before, it did nothing once a schema was loaded).
  - Storage: `storageKey` prefix; keys set with Vue `set` / `del` (Vue 2 tracking); the `storage` listener is
    removed on unmount.
  - Console: the websocket lifecycle logs, the schema success log and two "ignoring" warnings removed. The remaining
    `console.error` / `console.warn` report real errors and never print headers.
  - Checked in headless Chrome, Vue 3 and Vue 2.7, both websocket protocols, against the local server: host header on
    introspection, queries and `connection_init`; `playground:` storage keys; `defaultQuery` on a fresh tab;
    subscription reaches the server (auth error, as expected without a token); no websocket at load; no console
    warnings. Not checked in the browser: prop changes after mount.
- [ ] **EXP-05 Transport.** Keep both websocket protocols, because the intelli server runs both. When its UPG-02 drops
  `subscriptions-transport-ws`, remove the legacy client from the package in a major version.
- [ ] **EXP-06 Auth and secrets.**
  - The host passes the token through `headers`. The package never reads cookies on its own.
  - Do not persist headers that look like credentials (`Authorization`, `Cookie`, `*token*`) to `localStorage`.
    Persist the query, variables and other headers only.
  - Never log headers or responses that hold tokens.
- [ ] **EXP-07 SSR safety.** No `window`, `document` or `localStorage` access at import or setup time, so the package
  can be imported in Nuxt 2 and Nuxt 3/4 SSR. The host still renders it client-side only (`<ClientOnly>` / `<client-only>`).
- [ ] **EXP-08 Tests and CI.**
  - Vitest unit tests for the query builder in `lib/explorer.ts`, the fetcher and the header filter from EXP-06.
  - Component tests with `@vue/test-utils` v2 (Vue 3) and v1 (Vue 2.7): mount, run a query against a mock fetcher,
    toggle the doc explorer.
  - GitHub Actions matrix Vue 2.7 and the latest Vue 3: lint, typecheck, tests, build. Bundle-size report.
  - Commit `package-lock.json` (`git add -f`: the global gitignore excludes it) so CI can run `npm ci`.
- [ ] **EXP-09 Nuxt admin integration** (work in intelli-app-operations).
  - Develop against this repo (`npm link`, or `"file:../../vue-graphql-explorer"` in `nuxt/package.json`). Never
    commit the `file:` path; switch to the npm version range before merging.
  - New admin page `/admin/explorer` behind `AuthMiddleware` with a new permission `admin_explorer_list`. It passes
    `graphqlHttpUrl()`, `graphqlWsUrl()` and the admin Bearer token.
  - Sidebar entry in `data/navigation-data.ts`.
  - Delete `pages/explorer/` and the moved files from nuxt. Keep a redirect from `/explorer` to `/admin/explorer`.
- [ ] **EXP-10 Publish.**
  - npm user `bozlur` with 2FA. Publish from this repo's CI on a `v*` tag, with a granular publish-only `NPM_TOKEN`
    limited to `vue-graphql-explorer`, and `--provenance`. Nobody publishes from a laptop.
  - Semantic versioning, `CHANGELOG.md`, README usage for Vue 3, Vue 2.7, Nuxt 3/4 and Nuxt 2.
  - Before the first publish, check the tarball (`npm run pack:check`): no `.env`, no internal URLs, no source maps
    that expose local paths.
- [ ] **EXP-11 Server introspection in production** (work in intelli-app-operations `server/`). Apollo turns
  introspection off when `NODE_ENV=production`, so the admin explorer has no schema there. Decide:
  - (a) the explorer stays dev and staging only, or
  - (b) introspection only for authenticated admin requests (Apollo plugin), off for everyone else.
  - Recommended: (b). Introspection must not become public, because many content operations are public.
- [x] **EXP-12 Docs.** Done 2026-11-19: `docs/PLAN.md`, `CONTRIBUTING.md`, `CLAUDE.md`, README with props. In
  intelli-app-operations: `CLAUDE.md` (related repositories), EXP-09 / EXP-11 only in its plan, and the consumer rule
  in `docs/CODING-STANDARDS.md` (npm version range; `npm link` / `file:` never committed). Keep these in step.

## Exit (1.0.0)

- `npm pack` gives a package that installs into a new Vite + Vue 3 app and a new Vite + Vue 2.7 app. In both, it runs
  a query and a subscription against the local intelli-app-operations server.
- The nuxt admin panel uses the npm version at `/admin/explorer`; a staff user without `admin_explorer_list` gets the
  unauthorized page.
- Credential headers are not in `localStorage` after a reload.
- intelli-app-operations `nuxt/` has no `components/gql/` folder and no `pages/explorer/` page.

## Verification

```bash
npm run lint && npm run typecheck && npm test && npm run build   # build runs the Vue 3 and Vue 2.7 builds
```

Then update the status table below.

## Status

| ID | Item | Status |
|---|---|---|
| EXP-01 | Scaffold: dual build, exports, switch, lint, types, playgrounds | done 2026-11-19 (`4f8a679`) |
| EXP-02 | Move the explorer source out of nuxt | done 2026-11-19 (`7a10dd8`, `99b44a1`); nuxt copies removed in EXP-09 |
| EXP-03 | Vue 2.7 + Vue 3 source | done 2026-11-19 (`92f7bdf`) |
| EXP-04 | Props API, no Nuxt coupling, no console logs | done 2026-11-19 |
| EXP-05 | Both websocket protocols | todo |
| EXP-06 | Token through `headers`; credential headers never persisted or logged | todo |
| EXP-07 | SSR-safe import | todo |
| EXP-08 | Unit and component tests; CI matrix Vue 2.7 / Vue 3; lockfile | todo |
| EXP-09 | Nuxt admin uses the npm package at `/admin/explorer` | todo (intelli-app-operations) |
| EXP-10 | Publish from CI with provenance | todo |
| EXP-11 | Admin-only introspection in production | todo, decision needed (intelli-app-operations) |
| EXP-12 | Docs | done 2026-11-19 |
