import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useUiStore } from '../../src/stores/ui.store'

describe('ui store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('notify() queues a message and dismiss() removes it', () => {
    const store = useUiStore()

    store.notify('Hello')
    expect(store.queue).toHaveLength(1)

    store.dismiss(store.queue[0].id)
    expect(store.queue).toHaveLength(0)
  })

  describe('loading', () => {
    it('is false with no pending requests', () => {
      const store = useUiStore()
      expect(store.loading).toBe(false)
    })

    it('becomes true while a request is pending and false once it stops', () => {
      const store = useUiStore()

      store.startLoading()
      expect(store.loading).toBe(true)

      store.stopLoading()
      expect(store.loading).toBe(false)
    })

    it('stays true while any of several overlapping requests are still pending', () => {
      const store = useUiStore()

      store.startLoading()
      store.startLoading()
      store.stopLoading()
      expect(store.loading).toBe(true)

      store.stopLoading()
      expect(store.loading).toBe(false)
    })

    it('never goes negative on an unbalanced stopLoading()', () => {
      const store = useUiStore()

      store.stopLoading()
      expect(store.pendingRequests).toBe(0)
      expect(store.loading).toBe(false)
    })
  })
})
