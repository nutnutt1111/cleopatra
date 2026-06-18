import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@shared': resolve(__dirname, '../../packages/donutit-shared/src'),
    },
  },
  server: {
    host: true,
    port: Number(process.env.PORT) || 3005,
    proxy: {
      // Same-origin API for donutit-cleopatra — browser calls :3005/api/*
      '/api': {
        target: `http://localhost:${process.env.API_PORT || 3004}`,
        changeOrigin: true,
      },
    },
  },
});
