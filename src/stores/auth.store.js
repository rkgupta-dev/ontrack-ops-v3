import { defineStore } from 'pinia'
import * as authApi from '../services/auth/auth.api'
import { getToken, setToken, clearToken } from '../services/tokenStorage'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: getToken(),
    user: null,
    status: 'idle', // idle | loading | ready | error
    error: null,
  }),
  getters: {
    isAuthenticated: (state) => Boolean(state.token),
    // Same rule as the old app's `canViewAdmin` getter (store.js): only
    // Ontrack's own agents have `lessor: null`; a lessor-scoped agent
    // carries their lessor id and loses the admin-only pages/sections.
    // `role` is deliberately ignored — a lessor agent can be role "ADMIN".
    canViewAdmin: (state) => state.user?.lessor === null,
  },
  actions: {
    /** A-010 login. Throws on failure — the caller (LoginPage) owns the
     * loading/error UI so it can show inline form feedback. */
    async login(credentials) {
      this.status = 'loading'
      this.error = null
      try {
        const { user, token } = await authApi.login(credentials)
        this.token = token
        this.user = user
        setToken(token)
        this.status = 'ready'
      } catch (error) {
        this.status = 'error'
        this.error = error
        throw error
      }
    },

    /** Validates a persisted token and hydrates the user on app start /
     * hard refresh, via A-019/A-020. Called from the router guard before
     * entering a protected route. */
    async restoreSession() {
      if (!this.token) {
        this.status = 'ready'
        return
      }
      this.status = 'loading'
      try {
        this.user = await authApi.fetchLoggedInUser()
        this.status = 'ready'
      } catch (error) {
        // Invalid/expired token — clear it rather than leaving the app
        // stuck believing it's authenticated.
        this.logout()
        this.status = 'ready'
        throw error
      }
    },

    /** Client-side only — docs/api-reference.md has no logout endpoint. */
    logout() {
      this.token = null
      this.user = null
      clearToken()
    },
  },
})
