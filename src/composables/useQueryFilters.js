import { useRoute, useRouter } from 'vue-router'

/**
 * Reads/writes list-page filter state (status/model/etc. checkboxes,
 * search, sort, page) to the URL query string, so a filtered view is
 * shareable/bookmarkable and survives a reload —
 * e.g. `/vehicles?models=2,8&lessors=20&statuses=3,5`. Array-valued
 * filters are comma-joined; empty/default values are left out of the
 * query entirely to keep the URL clean.
 *
 * `replaceQuery` always writes the *complete* filter state (not a merge
 * with whatever's already in the URL) and uses `router.replace` rather
 * than `push`, matching the tab-sync pattern in CustomerDetailPage.vue —
 * every filter tweak overwrites the current history entry instead of
 * piling up back-button stops.
 */
export function useQueryFilters() {
  const route = useRoute()
  const router = useRouter()

  function readArray(key, { numeric = false } = {}) {
    const raw = route.query[key]
    if (!raw) return []
    const list = String(raw).split(',').filter(Boolean)
    return numeric ? list.map(Number).filter((n) => !Number.isNaN(n)) : list
  }

  function readString(key, fallback = '') {
    const raw = route.query[key]
    return typeof raw === 'string' && raw ? raw : fallback
  }

  function readInt(key, fallback) {
    const raw = Number(route.query[key])
    return Number.isInteger(raw) && raw > 0 ? raw : fallback
  }

  function replaceQuery(params) {
    const query = {}
    for (const [key, value] of Object.entries(params)) {
      if (Array.isArray(value)) {
        if (value.length) query[key] = value.join(',')
      } else if (value !== '' && value !== undefined && value !== null) {
        query[key] = String(value)
      }
    }
    router.replace({ query })
  }

  return { readArray, readString, readInt, replaceQuery }
}
