import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { attachAuthGuard } from '../../src/router/guards'
import * as authApi from '../../src/services/auth/auth.api'
import * as tokenStorage from '../../src/services/tokenStorage'

vi.mock('../../src/services/auth/auth.api')

function createFakeRouter() {
  let guard
  return {
    beforeEach: (fn) => {
      guard = fn
    },
    run: (to) => guard(to),
  }
}

describe('attachAuthGuard', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    tokenStorage.clearToken()
  })

  it('redirects to login, preserving the destination, when visiting a protected route unauthenticated', async () => {
    const router = createFakeRouter()
    attachAuthGuard(router)

    const result = await router.run({ meta: { requiresAuth: true }, fullPath: '/attendance' })

    expect(result).toEqual({ name: 'login', query: { redirect: '/attendance' } })
  })

  it('allows a protected route once the session is restored', async () => {
    tokenStorage.setToken('valid-token')
    authApi.fetchLoggedInUser.mockResolvedValue({ name: 'Agent A' })
    const router = createFakeRouter()
    attachAuthGuard(router)

    const result = await router.run({ meta: { requiresAuth: true }, fullPath: '/attendance' })

    expect(result).toBe(true)
  })

  it('redirects an authenticated agent away from the guest-only login route', async () => {
    tokenStorage.setToken('valid-token')
    authApi.fetchLoggedInUser.mockResolvedValue({ name: 'Agent A' })
    const router = createFakeRouter()
    attachAuthGuard(router)

    const result = await router.run({ meta: { guestOnly: true }, fullPath: '/login' })

    expect(result).toEqual({ name: 'home' })
  })

  it('allows an unauthenticated agent to view the login route', async () => {
    const router = createFakeRouter()
    attachAuthGuard(router)

    const result = await router.run({ meta: { guestOnly: true }, fullPath: '/login' })

    expect(result).toBe(true)
  })

  it('only restores the session once across multiple navigations', async () => {
    tokenStorage.setToken('valid-token')
    authApi.fetchLoggedInUser.mockResolvedValue({ name: 'Agent A' })
    const router = createFakeRouter()
    attachAuthGuard(router)

    await router.run({ meta: { requiresAuth: true }, fullPath: '/attendance' })
    await router.run({ meta: { requiresAuth: true }, fullPath: '/attendance' })

    expect(authApi.fetchLoggedInUser).toHaveBeenCalledOnce()
  })
})
