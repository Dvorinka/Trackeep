import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  site: 'https://trackeep.org',
  output: 'static',
  integrations: [
    tailwind()
  ],
  vite: {
    optimizeDeps: {
      exclude: ['@astrojs/check']
    }
  },
  markdown: {
    shikiConfig: {
      theme: 'github-dark-default',
      wrap: true
    }
  }
});
