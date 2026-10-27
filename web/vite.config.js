import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  root: import.meta.dirname,
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        results: resolve(import.meta.dirname, 'results.html'),
        account: resolve(import.meta.dirname, 'account.html'),
        share: resolve(import.meta.dirname, 'share.html'),
      },
    },
  },
});
