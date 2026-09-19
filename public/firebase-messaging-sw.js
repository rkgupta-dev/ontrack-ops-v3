// Firebase Cloud Messaging service worker — handles push notifications
// while the app isn't in the foreground. Registered separately from this
// app's own PWA service worker (see src/services/firebase.js for why),
// under its own scope so the two don't conflict.
//
// This runs in a plain worker context (no bundler), so it uses the
// Firebase "compat" build via importScripts, same as the old app
// (operationsapp-frontend/public/firebase-messaging-sw.js) — config values
// below are not secret (see src/services/firebase.js's comment) and can't
// be read from import.meta.env in this context, so they're inlined
// directly, matching the old app's approach.
importScripts('https://www.gstatic.com/firebasejs/10.13.1/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.13.1/firebase-messaging-compat.js')

firebase.initializeApp({
  apiKey: 'AIzaSyBDhHqIEdXXs6NxFgFucnVnqqLjItA1fBY',
  authDomain: 'ontrack-notification.firebaseapp.com',
  projectId: 'ontrack-notification',
  storageBucket: 'ontrack-notification.appspot.com',
  messagingSenderId: '44016478849',
  appId: '1:44016478849:web:4d85406735348dc20ffb80',
})

const messaging = firebase.messaging()

// Rebroadcast background push payloads to the main thread — a foreground
// listener (not yet built; a future phase) can pick these up the same way
// the old app did via `new BroadcastChannel('sw-notification')`.
messaging.onBackgroundMessage((payload) => {
  const channel = new BroadcastChannel('sw-notification')
  channel.postMessage(payload)
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((client) => 'focus' in client)
      if (existing) return existing.focus()
      return self.clients.openWindow('/')
    }),
  )
})
