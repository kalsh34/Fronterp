import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  // Same VITE_API_URL the app uses (.env.local / .env.production / process env).
  const env = loadEnv(mode, __dirname, '');
  const apiTarget = (
    env.VITE_API_URL ||
    'https://erpback-tnsv.onrender.com'
  ).replace(/\/+$/, '');

  return {
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
                target: apiTarget,
                changeOrigin: true,
              },
            }
          : undefined,
    },
  };
});
