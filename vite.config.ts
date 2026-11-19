// One source, two library builds:
//   vite build --mode vue3  ->  dist/vue3  (@vitejs/plugin-vue, Vue 3 compiler)
//   vite build --mode vue2  ->  dist/vue2  (@vitejs/plugin-vue2 + Vue 2.7 from toolchain/vue2, see `npm run setup`)
// `vue`, `vue-demi` and every dependency stay external; the host app provides them.
import { createRequire } from 'node:module';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig, type PluginOption } from 'vite';
import vue3 from '@vitejs/plugin-vue';
import pkg from './package.json' with { type: 'json' };
import trimEdgeWhitespace from './toolchain/vue2/trim-edge-whitespace.mjs';

// Vue 2.7 and its SFC plugin live in toolchain/vue2/node_modules, so the root can keep Vue 3.
const requireVue2 = createRequire(fileURLToPath(new URL('./toolchain/vue2/package.json', import.meta.url)));

const external = [...Object.keys(pkg.peerDependencies), ...Object.keys(pkg.dependencies)].map(
  name => new RegExp(`^${name}(/.*)?$`),
);

export default defineConfig(({ mode }) => {
  const target = mode === 'vue2' ? 'vue2' : 'vue3';
  const plugin: PluginOption =
    target === 'vue2'
      ? requireVue2('@vitejs/plugin-vue2').default({
          compiler: requireVue2('vue/compiler-sfc'),
          // Match Vue 3: condense whitespace, and drop it around {{ }} at element edges (see the module).
          template: { compilerOptions: { whitespace: 'condense', modules: [trimEdgeWhitespace] } },
        })
      : vue3();

  return {
    plugins: [plugin],
    build: {
      // Vue 2.7 hosts often still build with webpack 4 (Nuxt 2, Vue CLI 4), whose parser rejects `?.`, `??`
      // and `||=`. ES2019 output lowers them; the Vue 3 build keeps Vite's modern default.
      ...(target === 'vue2' ? { target: 'es2019' } : {}),
      outDir: `dist/${target}`,
      emptyOutDir: true,
      sourcemap: false,
      cssCodeSplit: false,
      lib: {
        entry: fileURLToPath(new URL('./src/index.ts', import.meta.url)),
        formats: ['es'],
        fileName: () => 'index.js',
        cssFileName: 'style',
      },
      rollupOptions: { external },
    },
  };
});
