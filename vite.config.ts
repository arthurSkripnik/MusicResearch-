import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Single-file build: the whole prototype ships as one index.html.
export default defineConfig({
  base: './',
  plugins: [react(), viteSingleFile()],
});
