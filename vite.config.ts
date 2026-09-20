import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Deployed backend. Keep in sync with DEFAULT_API_ORIGIN in src/lib/api.ts.
const DEFAULT_API_ORIGIN = 'https://erpback-tnsv.onrender.com';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiTarget = (env.VITE_API_URL || '').trim().replace(/\/+$/, '') || DEFAULT_API_ORIGIN;

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
                secure: true,
              },
            }
          : undefined,
    },
  };
});
