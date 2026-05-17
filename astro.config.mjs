import { defineConfig } from 'astro/config';
import svelte from '@astrojs/svelte';
import cloudflare from '@astrojs/cloudflare';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  root: '.',
  srcDir: './src',
  outDir: './dist',
  output: 'static',
  adapter: cloudflare(),
  integrations: [svelte()],
  vite: {
    plugins: [tailwindcss()],
    ssr: {
      noExternal: ['chart.js'],
    },
  },
});
