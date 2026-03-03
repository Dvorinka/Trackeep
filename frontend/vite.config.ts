import { defineConfig } from 'vite'
import solid from 'vite-plugin-solid'
import UnoCSS from 'unocss/vite'
import path from 'path'
import { readFileSync } from 'fs'

// Read version from package.json
const packageJson = JSON.parse(readFileSync(path.resolve(__dirname, './package.json'), 'utf8'))
const version = packageJson.version

export default defineConfig(({ mode }) => {
  void mode
  
  return {
    envDir: path.resolve(__dirname, '..'),
    plugins: [
      solid(), 
      UnoCSS(),
      {
        name: 'suppress-css-warnings',
        enforce: 'post',
        apply: 'build',
        generateBundle(_options: any, _bundle: any) {
          // Suppress CSS syntax warnings for complex selectors
          // Note: This is a simple approach to reduce build warnings
        }
      }
    ],
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
    esbuild: {
      logOverride: { 'css-syntax-error': 'silent' }
    },
    // Suppress warnings
    rollupOptions: {
      onwarn(warning, warn) {
        // Suppress CSS syntax warnings and dynamic import warnings
        if (warning.code === 'CSS_SYNTAX_ERROR' || 
            warning.message.includes('dynamically imported') ||
            warning.message.includes('\\:not\\(')) {
          return
        }
        warn(warning)
      },
      output: {
        manualChunks: {
          vendor: ['solid-js', '@solidjs/router'],
          ui: ['@kobalte/core', '@tabler/icons-solidjs', 'lucide-solid'],
          query: ['@tanstack/solid-query'],
        },
        // Optimize chunk naming for caching
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
    // Increase chunk size warning limit to reduce warnings
    chunkSizeWarningLimit: 1000,
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
    // Prevent dynamic import warnings
    exclude: ['@tanstack/solid-query'],
  },
  }
})
