import { defineStore } from 'pinia'

/**
 * Centralized notification queue (CLAUDE.md §5 "reusable patterns for...
 * Notifications"). AppSnackbar.vue renders whatever is at the front of
 * `queue`; any store/page can call notify() instead of managing its own
 * v-snackbar state.
 */
export const useUiStore = defineStore('ui', {
  state: () => ({
    queue: [],
    // Count of in-flight v2Client requests (see services/api/v2Client.js's
    // request/response interceptors) — a plain counter rather than a
    // boolean so overlapping requests don't hide the indicator early when
    // one finishes while another is still pending.
    pendingRequests: 0,
  }),
  getters: {
    loading: (state) => state.pendingRequests > 0,
  },
  actions: {
    notify(message, { type = 'info', timeout = 4000 } = {}) {
      this.queue.push({ id: Date.now() + Math.random(), message, type, timeout })
    },
    dismiss(id) {
      this.queue = this.queue.filter((item) => item.id !== id)
    },
    startLoading() {
      this.pendingRequests += 1
    },
    stopLoading() {
      this.pendingRequests = Math.max(0, this.pendingRequests - 1)
    },
  },
})
