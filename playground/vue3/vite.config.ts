import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// The package is linked from ../.. and has its own node_modules; dedupe so Vue 3 is loaded once.
export default defineConfig({
  plugins: [vue()],
  resolve: { dedupe: ['vue', 'vue-demi', 'graphql'] },
  // Same-origin proxy to the local intelli-app-operations server (no CORS); ws for subscriptions.
  server: {
    proxy: { '/graphql': { target: process.env.VITE_PROXY_TARGET ?? 'http://localhost:30011', ws: true } },
  },
});
