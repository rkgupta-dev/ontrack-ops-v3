import process from 'node:process'
import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vuetify from 'vite-plugin-vuetify'
import { VitePWA } from 'vite-plugin-pwa'
import vueDevTools from 'vite-plugin-vue-devtools'

import pkg from './package.json'

export default defineConfig({
  // Exposes package.json's version to the app (shown in the mobile drawer).
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(pkg.version),
  },
  plugins: [
    vue(),
    // Dev-only helper; its bundled vite-plugin-inspect crashes Vitest's
    // server startup, so leave it out when running tests.
    !process.env.VITEST && vueDevTools(),
    vuetify({ autoImport: true }),
    VitePWA({
      registerType: 'autoUpdate',
      // Installable + push notifications, NOT offline-first (project
      // decision — an ops tool being offline usually means you can't do
      // your job anyway): precache only the app shell, no API-response
      // caching/runtime caching strategy.
      includeAssets: [
        'favicon.ico',
        'favicon-16x16.png',
        'favicon-32x32.png',
        'apple-touch-icon.png',
      ],
      manifest: {
        name: 'Ontrack Operations',
        short_name: 'Ontrack Ops',
        description: 'Ontrack fleet operations — bookings, vehicles, customers.',
        start_url: '/',
        display: 'standalone',
        background_color: '#4E44D8',
        theme_color: '#4E44D8',
        icons: [
          { src: 'android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
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
