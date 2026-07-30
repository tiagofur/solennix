import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  build: {
    sourcemap: 'hidden',
  },
  plugins: [
    react({
      babel: {
        plugins: process.env.NODE_ENV !== 'production' ? ['react-dev-locator'] : [],
      },
    }),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'pwa-192x192.png'],
      manifest: {
        name: 'Solennix — Gestión de Eventos',
        short_name: 'Solennix',
        description: 'Plataforma profesional para organizadores de eventos. Gestiona clientes, cotizaciones, inventario y pagos.',
        lang: 'es',
        theme_color: '#C4A265',
        background_color: '#F5F4F1',
        display: 'standalone',
        // 'any' lets desktop installs resize freely instead of locking to
        // portrait (mobile-first constraint felt wrong on macOS Windows #888).
        orientation: 'any',
        start_url: '/dashboard',
        scope: '/',
        categories: ['business', 'productivity'],
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images',
              expiration: { maxEntries: 100, maxAgeSeconds: 30 * 24 * 60 * 60 },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: { maxEntries: 10, maxAgeSeconds: 365 * 24 * 60 * 60 },
            },
          },
        ],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [
          /^\/api\//,
          /^\/(?:login|register|forgot-password|reset-password)(?:\/|$)/,
        ],
      },
    }),
  ],
})
