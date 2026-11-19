// Vue 2.7 run of the shared component tests (test/component). Root: `npm run test:vue2`.
// `vue` is Vue 2.7 from this folder, `vue-demi` its 2.7 entry, `@vue/test-utils` v1, and `#mount` the v1 adapter.
// Everything else (graphql, ...) resolves from the root node_modules, as in the published package.
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '../..');
const require = createRequire(join(here, 'package.json'));
const vue2 = require('@vitejs/plugin-vue2').default;
const trimEdgeWhitespace = (await import('./trim-edge-whitespace.mjs')).default;

export default defineConfig({
  root,
  plugins: [
    vue2({
      compiler: require('vue/compiler-sfc'),
      template: { compilerOptions: { whitespace: 'condense', modules: [trimEdgeWhitespace] } },
    }),
  ],
  resolve: {
    alias: [
      { find: /^vue$/, replacement: join(here, 'node_modules/vue/dist/vue.runtime.mjs') },
      { find: /^vue-demi$/, replacement: join(root, 'node_modules/vue-demi/lib/v2.7/index.mjs') },
      { find: /^@vue\/test-utils$/, replacement: join(here, 'node_modules/@vue/test-utils/dist/vue-test-utils.js') },
      { find: /^#mount$/, replacement: join(root, 'test/component/mount-vue2.ts') },
    ],
  },
  test: {
    include: ['test/component/**/*.test.ts'],
    server: { deps: { inline: ['vue-demi'] } },
  },
});
