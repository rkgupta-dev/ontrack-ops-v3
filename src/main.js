import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import { router } from './router'
import { vuetify } from './plugins/vuetify'
import { setUnauthorizedHandler } from './services/api/v2Client'
import { useAuthStore } from './stores/auth.store'
import { useUiStore } from './stores/ui.store'
import './assets/styles/main.css'

// This app now legitimately registers its own service workers — the
// vite-plugin-pwa precache worker (production builds only, see
// vite.config.js's devOptions.enabled: false) and Firebase's messaging
// worker (services/firebase.js, scoped to
// /firebase-cloud-messaging-push-scope). A *different* project run on the
// same localhost port previously (an earlier PWA-enabled scaffold, per
// project history) could still leave an unrelated worker registered —
// scoped to the origin, not the project — serving a stale cached shell
// (broken asset paths, 404s) even across a hard refresh. Unregister only
// workers that aren't ours, rather than the blanket sweep this used to be
// (which would otherwise kill our own PWA/FCM workers on every load).
const OWN_SERVICE_WORKER_FILENAMES = ['sw.js', 'firebase-messaging-sw.js']

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => {
      const scriptUrl = registration.active?.scriptURL ?? ''
      const isOwn = OWN_SERVICE_WORKER_FILENAMES.some((name) => scriptUrl.endsWith(`/${name}`))
      if (!isOwn) registration.unregister()
    })
  })
}

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.use(vuetify)

// Centralized 401 handling (see services/api/v2Client.js): any request
// that comes back unauthorized clears the session and returns the agent
// to /login, from wherever they were.
setUnauthorizedHandler(() => {
  const authStore = useAuthStore()
  const uiStore = useUiStore()
  const wasAuthenticated = authStore.isAuthenticated

  authStore.logout()

  if (wasAuthenticated) {
    uiStore.notify('Your session has expired. Please log in again.', { type: 'error' })
  }
  if (router.currentRoute.value.name !== 'login') {
    router.push({ name: 'login', query: { redirect: router.currentRoute.value.fullPath } })
  }
})

app.mount('#app')
