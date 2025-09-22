import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    strictPort: true,
    proxy: { '/api': { target: 'http://127.0.0.1:8788', changeOrigin: true } }
  },
  build: {
    outDir: '../frontend',
    emptyOutDir: true,
  },
});


