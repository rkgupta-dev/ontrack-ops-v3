import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '../../src/stores/auth.store'
import * as authApi from '../../src/services/auth/auth.api'
import * as tokenStorage from '../../src/services/tokenStorage'

vi.mock('../../src/services/auth/auth.api')

describe('auth store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    tokenStorage.clearToken()
  })

  it('login stores the token and user on success (A-010)', async () => {
    authApi.login.mockResolvedValue({ user: { name: 'Agent A' }, token: 'abc123' })
    const store = useAuthStore()

    await store.login({ employeeId: 'OTPL068', password: 'secret' })

    expect(store.token).toBe('abc123')
    expect(store.user).toEqual({ name: 'Agent A' })
    expect(store.isAuthenticated).toBe(true)
    expect(tokenStorage.getToken()).toBe('abc123')
  })

  it('login surfaces the error and leaves the store unauthenticated on failure', async () => {
    authApi.login.mockRejectedValue(new Error('bad creds'))
    const store = useAuthStore()

    await expect(store.login({ employeeId: 'x', password: 'y' })).rejects.toThrow('bad creds')

    expect(store.token).toBeNull()
    expect(store.status).toBe('error')
    expect(store.isAuthenticated).toBe(false)
  })

  it('restoreSession hydrates the user when a persisted token is valid (A-019/A-020)', async () => {
    tokenStorage.setToken('existing-token')
    authApi.fetchLoggedInUser.mockResolvedValue({ name: 'Agent B' })
    const store = useAuthStore()

    await store.restoreSession()

    expect(store.user).toEqual({ name: 'Agent B' })
    expect(store.status).toBe('ready')
  })

  it('restoreSession clears the session when the token is invalid/expired', async () => {
    tokenStorage.setToken('bad-token')
    authApi.fetchLoggedInUser.mockRejectedValue(new Error('401'))
    const store = useAuthStore()

    await expect(store.restoreSession()).rejects.toThrow()

    expect(store.token).toBeNull()
    expect(store.isAuthenticated).toBe(false)
    expect(tokenStorage.getToken()).toBeNull()
  })

  it('restoreSession is a no-op when there is no persisted token', async () => {
    const store = useAuthStore()

    await store.restoreSession()

    expect(authApi.fetchLoggedInUser).not.toHaveBeenCalled()
    expect(store.status).toBe('ready')
  })

  it('logout clears token and user (client-side only — no logout endpoint documented)', async () => {
    authApi.login.mockResolvedValue({ user: { name: 'Agent A' }, token: 'abc123' })
    const store = useAuthStore()
    await store.login({ employeeId: 'OTPL068', password: 'secret' })

    store.logout()

    expect(store.token).toBeNull()
    expect(store.user).toBeNull()
    expect(tokenStorage.getToken()).toBeNull()
  })

  it('canViewAdmin is true only for a user with lessor: null, regardless of role', () => {
    const store = useAuthStore()
    expect(store.canViewAdmin).toBe(false) // no user loaded yet

    store.user = { role: 'AGENT', lessor: null }
    expect(store.canViewAdmin).toBe(true)

    store.user = { role: 'ADMIN', lessor: 1 }
    expect(store.canViewAdmin).toBe(false)

    store.user = { role: 'ADMIN', lessor: 0 }
    expect(store.canViewAdmin).toBe(false)

    store.user = { role: 'ADMIN' } // field missing
    expect(store.canViewAdmin).toBe(false)
  })
})
