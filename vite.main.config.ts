import { defineConfig } from 'vite';

// https://vitejs.dev/config
export default defineConfig({
  build: {
    rollupOptions: {
      external: ['fsevents', 'bufferutil', 'utf-8-validate'],
    },
  },
});
