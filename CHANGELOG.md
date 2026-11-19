# Changelog

All notable changes to this package. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and the package uses [Semantic Versioning](https://semver.org/). While the version is 0.x, a minor version may
contain breaking changes; they are listed under **Breaking**.

## [Unreleased]

## [0.1.0] - 2026-11-19

First public release.

### Added

- `<GraphqlExplorer>` for Vue 3 (`^3.3`) and Vue 2.7 from one source. On install the package picks the build that
  matches the host's `vue`; `vue-graphql-explorer/vue3` and `vue-graphql-explorer/vue2` select one explicitly, and
  `npx vue-graphql-explorer-switch 2|3` switches by hand.
- Query editor with schema-aware completion and linting, variables and headers editors, response view, tabs,
  history, documentation explorer and a point-and-click query builder.
- Props: `url`, `wsUrl`, `wsProtocol`, `headers` (object or function, may be async, read on every request),
  `fetcher`, `storageKey`, `defaultQuery`. Exported types: `GraphqlExplorerProps`, `Fetcher`, `FetcherParams`,
  `FetcherOpts`, `FetcherResult`, `HeadersOption`, `WsProtocol`. Also exports `createGraphiQLFetcher`.
- Subscriptions over `graphql-ws` (default) or `subscriptions-transport-ws`. The websocket opens on the first
  subscription; `headers` are sent as connection params.
- Incremental delivery (`@defer`, `@stream`) over `multipart/mixed`.
- The Vue 2 build is emitted as ES2019, so webpack 4 hosts (Nuxt 2, Vue CLI 4) can parse it without
  transpiling it. The README lists the Nuxt 2 setup for `graphql` and `vue-demi`.

### Security

- Credential headers (`Authorization`, `Cookie`, and any header whose name contains token, secret, password,
  api-key, session, auth, jwt, bearer or credential) are sent but never written to `localStorage`, in tabs or in
  history. History saved before this rule is cleaned when it loads.
- No console logging of requests, headers or responses.

### Fixed (compared with the explorer this package was extracted from)

- `@defer` payloads are merged into the existing result instead of replacing the object at their path.
- Subscription errors (socket closed, connection rejected) show in the response pane instead of only in the
  console, and no longer cause an unhandled promise rejection.
- Works where `CloseEvent` or `window.fetch` do not exist (SSR, Node, workers).
- Importing the package and server-side rendering do not touch `window`, `document` or `localStorage`. When the
  browser blocks storage, the explorer keeps its state in memory.

[Unreleased]: https://github.com/bozlurrahman/vue-graphql-explorer/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/bozlurrahman/vue-graphql-explorer/releases/tag/v0.1.0
