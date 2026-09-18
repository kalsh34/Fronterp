import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    proxy:
      mode === 'development'
        ? {
            '/api': {
              target:'https://erpback-tnsv.onrender.com',
              changeOrigin: true,
            },
          }
        : undefined,
  },
}));
