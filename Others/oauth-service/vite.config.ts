import { defineConfig } from 'vite';
import solid from 'vite-plugin-solid';

export default defineConfig({
  plugins: [solid()],
  server: {
    port: 5174,
    proxy: {
      '/api': {
        target: 'http://localhost:9090',
        changeOrigin: true,
      },
      '/auth': {
        target: 'http://localhost:9090',
        changeOrigin: true,
      },
      '/health': {
        target: 'http://localhost:9090',
        changeOrigin: true,
      }
    }
  },
  build: {
    outDir: '../static',
    emptyOutDir: true
  }
});
