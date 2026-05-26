import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base must match the GitHub repo name when deployed to GitHub Pages project pages.
// e.g. https://username.github.io/ncnu_chat_room/ → base: '/ncnu_chat_room/'
export default defineConfig({
  plugins: [react()],
  base: '/ncnu_chat_room/',
  build: {
    rollupOptions: {
      output: {
        // Stable filenames prevent GitHub Pages CDN from serving a new index.html
        // that references a hashed JS file the CDN hasn't propagated yet.
        entryFileNames: 'assets/index.js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name][extname]',
      },
    },
  },
});
