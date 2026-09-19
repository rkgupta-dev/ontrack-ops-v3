import { storeToRefs } from 'pinia'
import { useAuthStore } from '../stores/auth.store'

/** Thin facade over the auth store for page components — keeps pages
 * from reaching into store internals directly. */
export function useAuth() {
  const store = useAuthStore()
  const { user, isAuthenticated, status, error } = storeToRefs(store)

  return {
    user,
    isAuthenticated,
    status,
    error,
    login: store.login,
    logout: store.logout,
  }
}
