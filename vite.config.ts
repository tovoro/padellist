import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Padellist',
        short_name: 'Padellist',
        description: 'Rangliste und Statistiken fuer unsere Padel-Runde',
        lang: 'de-CH',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0b100e',
        theme_color: '#0b100e',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        // Deutsch braucht nur das Latin-Subset; die uebrigen wuerden den
        // Offline-Cache ohne Nutzen vergroessern.
        globIgnores: ['**/*-{vietnamese,latin-ext}-*.woff2'],
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            // Letzter erfolgreicher Datenstand bleibt offline lesbar (Halle ohne Empfang).
            urlPattern: ({ url }) => url.pathname === '/api/data',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'padel-data',
              networkTimeoutSeconds: 4,
              expiration: { maxEntries: 1, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [200] },
            },
          },
        ],
      },
    }),
  ],
  server: {
    proxy: {
      '/api': 'http://localhost:8788',
    },
  },
})
