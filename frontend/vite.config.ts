import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// In dev, calls to /api/* are proxied to the NestJS API (no CORS issues).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
});
