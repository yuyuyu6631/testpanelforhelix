import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      proxy: {
        '/templates': 'http://127.0.0.1:8001',
        '/cases': 'http://127.0.0.1:8001',
        '/reports': 'http://127.0.0.1:8001',
        '/generate': 'http://127.0.0.1:8001',
        '/run': {
          target: 'http://127.0.0.1:8001',
          ws: true
        },
        '/settings': 'http://127.0.0.1:8001',
      },
    },
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      }
    }
  };
});
