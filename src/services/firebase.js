import { initializeApp } from 'firebase/app'
import { getMessaging, getToken, isSupported } from 'firebase/messaging'

/**
 * FCM-only Firebase usage (no analytics/firestore/etc.) — mirrors the old
 * app's src/firebase.js, same project ("ontrack-notification", per user
 * decision 2026-09-07 to reuse it). Config values are not secret (Firebase
 * web config is restricted by security rules, not confidentiality) but
 * still come from env vars here, matching this project's convention.
 */
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

let messagingPromise = null

/**
 * Lazily initializes Firebase Messaging. Registers
 * public/firebase-messaging-sw.js under its own scope
 * (/firebase-cloud-messaging-push-scope) rather than the default "/" —
 * the standard Firebase-recommended workaround for coexisting with this
 * app's own PWA service worker (vite-plugin-pwa), which is also scoped to
 * "/": two service workers can't cleanly share one scope.
 *
 * Resolves to `null` (not a rejected promise) when messaging isn't
 * available — missing config, unsupported browser, or registration
 * failure — so callers can treat "no push" as a normal, expected case
 * rather than an error to handle.
 */
function getMessagingInstance() {
  if (!messagingPromise) {
    messagingPromise = (async () => {
      if (!firebaseConfig.apiKey) return null
      const supported = await isSupported().catch(() => false)
      if (!supported) return null
      try {
        const app = initializeApp(firebaseConfig)
        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
          scope: '/firebase-cloud-messaging-push-scope',
        })
        return { messaging: getMessaging(app), registration }
      } catch {
        return null
      }
    })()
  }
  return messagingPromise
}

/**
 * Requests notification permission and returns an FCM device token for the
 * `deviceToken` field on A-010 login — or `null` if permission was denied,
 * messaging isn't configured/supported, or VITE_FIREBASE_VAPID_KEY isn't
 * set (required by the modern SDK; the old app's v8 SDK didn't need it).
 *
 * Never throws, and never takes more than ~4s — login must never hang on
 * push setup (service-worker registration/activation involves a real
 * network fetch to Firebase's CDN inside the worker, which can be slow or
 * blocked in some environments; a `Notification.requestPermission()` with
 * no permission UI to answer it can, in principle, also never resolve).
 */
export async function getDeviceToken() {
  const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY
  if (!vapidKey) return null // fail fast — skip SW registration entirely

  const attempt = (async () => {
    const instance = await getMessagingInstance()
    if (!instance) return null

    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return null

    return await getToken(instance.messaging, {
      vapidKey,
      serviceWorkerRegistration: instance.registration,
    })
  })()

  const timeout = new Promise((resolve) => setTimeout(() => resolve(null), 4000))

  try {
    return await Promise.race([attempt, timeout])
  } catch {
    return null
  }
}
