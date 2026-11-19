import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue2';

// The package is linked from ../.. and has Vue 3 in its own node_modules; dedupe so Vue 2.7 is used.
export default defineConfig({
  plugins: [vue()],
  resolve: { dedupe: ['vue', 'vue-demi', 'graphql'] },
  // Same-origin proxy to the local intelli-app-operations server (no CORS); ws for subscriptions.
  server: {
    proxy: { '/graphql': { target: process.env.VITE_PROXY_TARGET ?? 'http://localhost:30011', ws: true } },
  },
});
