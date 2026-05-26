import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base must match the GitHub repo name when deployed to GitHub Pages project pages.
// e.g. https://username.github.io/ai_course_2/ → base: '/ai_course_2/'
export default defineConfig({
  plugins: [react()],
  base: '/ncnu_chat_room/',
});
