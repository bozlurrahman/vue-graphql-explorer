import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// The package is linked from ../.. and has its own node_modules; dedupe so Vue 3 is loaded once.
export default defineConfig({
  plugins: [vue()],
  resolve: { dedupe: ['vue', 'vue-demi', 'graphql'] },
});
