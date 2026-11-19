# CLAUDE.md

`vue-graphql-explorer`: GraphiQL-style GraphQL explorer as one component library for Vue 2.7 and Vue 3, published
to npm by the account `bozlur`. GitHub `bozlurrahman/vue-graphql-explorer` (remote via SSH alias `github-intelli`).

- Work plan and status: `docs/PLAN.md` (items EXP-01 to EXP-12). Update its status table with every step.
- Code rules for the shared source, setup and checks: `CONTRIBUTING.md`. Read it before changing `src/`.
- First user: the Intelli Apps admin panel in `/var/www/html/bysl/intelli-app-operations/nuxt` (EXP-09). That repo's
  server (`server/`, port 30011) is the test backend for the playgrounds. EXP-09 and EXP-11 change that repo;
  everything else happens here.

## Commands

```bash
npm run setup                     # root (Vue 3) + toolchain/vue2 (Vue 2.7 compiler)
npm run lint && npm run typecheck && npm test && npm run build
cd playground/vue3 && npm install && npm run dev    # same for playground/vue2
```

## Layout

- `src/index.ts`: public entry. `src/components/GraphqlExplorer.vue`: public component; owns the store registry.
- `src/stores/registry.ts`: `defineExplorerStore` (Pinia replacement, one registry per explorer).
- `src/lib/explorer.ts`: query builder, fetcher, shared types. `src/lib/h.ts`: Vue 2/3 render helpers.
- `src/directives/portal.ts`: `v-portal` (replaces `Teleport`).
- `vite.config.ts`: `--mode vue3` / `--mode vue2` builds. `toolchain/vue2/`: Vue 2.7 compiler, own `node_modules`.
- `scripts/switch.mjs`, `scripts/postinstall.mjs`: point `dist/index.js` at the build matching the host's `vue`.

## Rules

- No Nuxt imports, no project URLs, no secrets. Everything the host knows comes in through props.
- Never log or persist credential headers (EXP-06).
- Check changes in both playgrounds; Vue 2 runtime bugs do not show in the Vue 3 build.
