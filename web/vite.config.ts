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
      includeAssets: ['favicon.svg', 'pwa-192x192.png', 'pwa-512x512.png'],
      manifest: {
        name: 'Solennix — Gestión de Eventos',
        short_name: 'Solennix',
        description:
          'Encontrá proveedores para tu evento y gestioná tu negocio de eventos. Cotizaciones, inventario y pagos.',
        lang: 'es',
        theme_color: '#C4A265',
        background_color: '#F5F4F1',
        display: 'standalone',
        // 'any' lets desktop installs resize freely instead of locking to
        // portrait (mobile-first constraint felt wrong on macOS Windows #888).
        orientation: 'any',
        // Organizer default; inbound visitors install from /providers and still
        // get standalone. Dashboard redirects unauthenticated users to login.
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
          // Public organizer profiles + directory (#1132): offline read of
          // visited shells. NetworkFirst so fresh data wins when online.
          {
            urlPattern: /\/api\/public\/organizers(?:\/|$)/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'public-profiles',
              networkTimeoutSeconds: 5,
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 7 * 24 * 60 * 60,
              },
              cacheableResponse: { statuses: [0, 200] },
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
