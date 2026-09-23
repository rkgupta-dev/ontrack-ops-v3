import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { v2Client, setUnauthorizedHandler } from '../../../src/services/api/v2Client'
import * as tokenStorage from '../../../src/services/tokenStorage'
import { useUiStore } from '../../../src/stores/ui.store'

describe('v2Client', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  afterEach(() => {
    tokenStorage.clearToken()
    setUnauthorizedHandler(null)
  })

  it('attaches a Bearer token from storage to outgoing requests', () => {
    tokenStorage.setToken('my-token')
    const requestInterceptor = v2Client.interceptors.request.handlers[0].fulfilled

    const config = requestInterceptor({ headers: {} })

    expect(config.headers.Authorization).toBe('Bearer my-token')
  })

  it('does not attach an Authorization header when there is no token', () => {
    const requestInterceptor = v2Client.interceptors.request.handlers[0].fulfilled

    const config = requestInterceptor({ headers: {} })

    expect(config.headers.Authorization).toBeUndefined()
  })

  it('invokes the registered unauthorized handler on a 401 response', async () => {
    const handler = vi.fn()
    setUnauthorizedHandler(handler)
    const responseErrorInterceptor = v2Client.interceptors.response.handlers[0].rejected

    await expect(responseErrorInterceptor({ response: { status: 401 } })).rejects.toBeDefined()

    expect(handler).toHaveBeenCalledOnce()
  })

  it('does not invoke the handler for non-401 errors', async () => {
    const handler = vi.fn()
    setUnauthorizedHandler(handler)
    const responseErrorInterceptor = v2Client.interceptors.response.handlers[0].rejected

    await expect(responseErrorInterceptor({ response: { status: 500 } })).rejects.toBeDefined()

    expect(handler).not.toHaveBeenCalled()
  })

  it('increments the global loading counter on request and decrements on a successful response', () => {
    const ui = useUiStore()
    const requestInterceptor = v2Client.interceptors.request.handlers[0].fulfilled
    const responseInterceptor = v2Client.interceptors.response.handlers[0].fulfilled

    const config = requestInterceptor({ headers: {} })
    expect(ui.loading).toBe(true)

    responseInterceptor({ config })
    expect(ui.loading).toBe(false)
  })

  it('decrements the global loading counter on an errored response too', async () => {
    const ui = useUiStore()
    const requestInterceptor = v2Client.interceptors.request.handlers[0].fulfilled
    const responseErrorInterceptor = v2Client.interceptors.response.handlers[0].rejected

    const config = requestInterceptor({ headers: {} })
    expect(ui.loading).toBe(true)

    await expect(
      responseErrorInterceptor({ config, response: { status: 500 } }),
    ).rejects.toBeDefined()
    expect(ui.loading).toBe(false)
  })

  it('does not touch the loading counter for a request marked skipGlobalLoading', () => {
    const ui = useUiStore()
    const requestInterceptor = v2Client.interceptors.request.handlers[0].fulfilled

    requestInterceptor({ headers: {}, skipGlobalLoading: true })

    expect(ui.loading).toBe(false)
  })

  // Regression: a client-wide `Content-Type: application/json` default made
  // axios serialize FormData to JSON, silently dropping every file upload.
  async function capturedRequest(data) {
    let captured
    await v2Client.post('/echo', data, {
      adapter: async (config) => {
        captured = config
        return { data: {}, status: 200, statusText: 'OK', headers: {}, config }
      },
    })
    return captured
  }

  it('sends FormData as-is (multipart), not serialized to JSON', async () => {
    const fd = new FormData()
    fd.append('image1', new Blob(['x'], { type: 'image/png' }), 'a.png')

    const config = await capturedRequest(fd)

    expect(config.data).toBeInstanceOf(FormData)
    expect(String(config.headers.getContentType() ?? '')).not.toContain('application/json')
  })

  it('still sends plain objects as JSON', async () => {
    const config = await capturedRequest({ a: 1 })

    expect(config.data).toBe('{"a":1}')
    expect(config.headers.getContentType()).toContain('application/json')
  })
})
