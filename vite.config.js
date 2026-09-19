import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vuetify from 'vite-plugin-vuetify'
import { VitePWA } from 'vite-plugin-pwa'
import vueDevTools from 'vite-plugin-vue-devtools'

export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
    vuetify({ autoImport: true }),
    VitePWA({
      registerType: 'autoUpdate',
      // Installable + push notifications, NOT offline-first (project
      // decision — an ops tool being offline usually means you can't do
      // your job anyway): precache only the app shell, no API-response
      // caching/runtime caching strategy.
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Ontrack Operations',
        short_name: 'Ontrack Ops',
        description: 'Ontrack fleet operations — bookings, vehicles, customers.',
        start_url: '/',
        display: 'standalone',
        background_color: '#F5F7FA',
        theme_color: '#1867C0',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'maskable-icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
      },
      // Firebase's messaging service worker (public/firebase-messaging-sw.js)
      // is registered separately, under its own scope, by
      // services/firebase.js — see the comment there for why (avoids two
      // service workers fighting over the same "/" scope).
      devOptions: {
        enabled: false,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.js'],
    clearMocks: true,
  },
})
