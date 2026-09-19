import { useAuthStore } from '../stores/auth.store'

/**
 * Centralized route protection: `meta.requiresAuth` routes require a
 * validated session, `meta.guestOnly` routes (login) redirect an already
 * authenticated agent straight to the app.
 */
export function attachAuthGuard(router) {
  // Scoped to this guard attachment (one router → one bootstrap), rather
  // than a module-level singleton — the session-restore call (A-019/
  // A-020) only needs to run once per app load, not once per module load.
  let bootstrapPromise = null

  function ensureSessionBootstrap(authStore) {
    if (!bootstrapPromise) {
      bootstrapPromise = authStore.restoreSession().catch(() => {
        // restoreSession already clears the token on failure; a rejected
        // promise here just means "not authenticated", which the check
        // below handles via isAuthenticated.
      })
    }
    return bootstrapPromise
  }

  router.beforeEach(async (to) => {
    const authStore = useAuthStore()
    await ensureSessionBootstrap(authStore)

    if (to.meta.requiresAuth && !authStore.isAuthenticated) {
      return { name: 'login', query: { redirect: to.fullPath } }
    }
    if (to.meta.guestOnly && authStore.isAuthenticated) {
      return { name: 'home' }
    }
    return true
  })
}
