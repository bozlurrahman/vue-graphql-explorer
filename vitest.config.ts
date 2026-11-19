import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';

// Vue 3. Unit and SSR tests run in `node`; component tests opt into happy-dom per file.
// The Vue 2.7 run of the component tests uses toolchain/vue2/vitest.config.ts.
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: { '#mount': fileURLToPath(new URL('./test/component/mount-vue3.ts', import.meta.url)) },
  },
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
  },
});
