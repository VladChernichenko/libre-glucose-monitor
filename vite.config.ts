import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// outDir 'build' and envPrefix 'REACT_APP_' are load-bearing: Dockerfile copies
// /app/build, render.yaml serves build/, and every deployed env var is REACT_APP_*.
export default defineConfig({
  plugins: [react()],
  envPrefix: 'REACT_APP_',
  build: { outDir: 'build' },
  server: {
    port: 3000,
    proxy: { '/api': { target: 'http://localhost:8080', changeOrigin: true } },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.ts'],
  },
});
