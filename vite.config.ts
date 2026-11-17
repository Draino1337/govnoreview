import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Относительная база + hash-роутинг: сайт работает на любом подпути GitHub Pages.
// Сборка идёт в docs/ — GitHub Pages раздаёт эту папку прямо из ветки govnoreview.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: { outDir: 'docs', emptyOutDir: true, target: 'es2020' },
});
