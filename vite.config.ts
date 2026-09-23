import path from 'node:path';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      '@app': path.resolve(import.meta.dirname, './src/app'),
      '@entities': path.resolve(import.meta.dirname, './src/entities'),
      '@features': path.resolve(import.meta.dirname, './src/features'),
      '@widgets': path.resolve(import.meta.dirname, './src/widgets'),
      '@shared': path.resolve(import.meta.dirname, './src/shared'),
    },
  },
});
