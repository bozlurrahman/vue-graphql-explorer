// EXP-07 check for the Vue 2.7 build: import dist/vue2 and server-render it in plain Node, with no DOM.
// The Vue 3 source gets the same check in test/ssr.test.ts. Run after `npm run build`: `npm run test:ssr:vue2`.
//
// The root node_modules holds Vue 3, so a resolve hook points `vue` at toolchain/vue2 (Vue 2.7.16) and
// `vue-demi` at its Vue 2.7 entry. Everything else (graphql, graphql-ws, ...) resolves from the root as usual.
import { register } from 'node:module';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const vue2Dir = join(root, 'toolchain/vue2/node_modules');
const map = {
  vue: pathToFileURL(join(vue2Dir, 'vue/dist/vue.runtime.mjs')).href,
  'vue-demi': pathToFileURL(join(root, 'node_modules/vue-demi/lib/v2.7/index.mjs')).href,
};

const hook = `
const map = ${JSON.stringify(map)};
export async function resolve(specifier, context, next) {
  if (specifier in map) return { url: map[specifier], shortCircuit: true };
  return next(specifier, context);
}`;
register(`data:text/javascript,${encodeURIComponent(hook)}`);

if (typeof window !== 'undefined' || typeof document !== 'undefined') {
  throw new Error('ssr-check-vue2 must run without browser globals');
}

const { default: Vue } = await import('vue');
const { GraphqlExplorer } = await import(pathToFileURL(join(root, 'dist/vue2/index.js')).href);
const { createRenderer } = createRequire(join(vue2Dir, 'noop.js'))('vue-server-renderer');

const vm = new Vue({
  render: h =>
    h(GraphqlExplorer, {
      props: {
        url: '/graphql',
        wsUrl: '/graphql',
        headers: () => ({ Authorization: 'Bearer test' }),
        storageKey: 'ssr-test',
        defaultQuery: '{ __typename }',
      },
    }),
});
const html = await createRenderer().renderToString(vm);

if (!html.includes('graphiql-container')) throw new Error('Vue 2.7 SSR output has no .graphiql-container');
if (html.includes('Bearer test')) throw new Error('Vue 2.7 SSR output contains the Authorization header');
console.log(`Vue ${Vue.version} SSR ok (${html.length} chars)`);
