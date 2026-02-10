import { defineConfig, loadEnv } from 'vite'
import solid from 'vite-plugin-solid'
import UnoCSS from 'unocss/vite'
import path from 'path'
import { readFileSync } from 'fs'

// Read version from package.json
const packageJson = JSON.parse(readFileSync(path.resolve(__dirname, './package.json'), 'utf8'))
const version = packageJson.version

export default defineConfig(({ mode }) => {
  // Load env file from parent directory
  loadEnv(mode, path.resolve(__dirname, '..'), '')
  
  return {
    plugins: [solid(), UnoCSS()],
    define: {
      // Make version available at build time
      __APP_VERSION__: JSON.stringify(version)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
  build: {
    target: 'esnext',
    minify: 'terser',
    sourcemap: false,
    // Add asset optimization
    assetsInlineLimit: 4096,
    // Add CSS code splitting
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['solid-js', '@solidjs/router'],
          ui: ['@kobalte/core', '@tabler/icons-solidjs'],
          query: ['@tanstack/solid-query'],
        },
        // Optimize chunk naming for caching
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
    // Add compression for static hosting
    reportCompressedSize: true,
  },
  server: {
    port: 3000,
    host: true,
    hmr: {
      overlay: false,
    },
  },
  optimizeDeps: {
    include: ['solid-js', '@solidjs/router', '@kobalte/core'],
  },
  }
})
