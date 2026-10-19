/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { viteSingleFile } from 'vite-plugin-singlefile';

const artifact = process.env.ARTIFACT === '1';

export default defineConfig({
  base: artifact ? './' : '/',
  build: artifact ? { outDir: 'dist-artifact', assetsInlineLimit: 100_000_000 } : undefined,
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? '1.0.0'),
  },
  plugins: [
    react(),
    tailwindcss(),
    ...(artifact ? [viteSingleFile()] : []),
    VitePWA({
      disable: artifact,
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'SEM DEFESA',
        short_name: 'Sem Defesa',
        description: 'Seus amigos te conhecem. Esse é o problema.',
        lang: 'pt-BR',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0b0910',
        theme_color: '#0b0910',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'supabase/**/*.test.ts'],
  },
});
