/**
 * Loads the Google Maps JavaScript API once (cached across callers) and
 * resolves with the `google.maps` namespace. Used by GpsTrackerPage.vue
 * instead of a Vue-Maps wrapper library — `vue2-google-maps` (the old
 * app's dependency) has no maintained Vue 3 equivalent in this project's
 * dependency set, and the page only needs a handful of `google.maps` calls
 * (Map, Marker, LatLng), so talking to the raw API directly avoids adding
 * a new third-party dependency for that.
 *
 * Requires VITE_GOOGLE_MAPS_API_KEY — same env var `services/geocode.js`
 * already reads. Rejects (rather than hanging) when the key is unset, so
 * callers can show a clear "Maps unavailable" state instead of a silent
 * blank map.
 */
let loadPromise = null

export function loadGoogleMaps() {
  if (loadPromise) return loadPromise

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
  if (!apiKey) {
    return Promise.reject(new Error('VITE_GOOGLE_MAPS_API_KEY is not set.'))
  }

  loadPromise = new Promise((resolve, reject) => {
    if (window.google?.maps) {
      resolve(window.google.maps)
      return
    }
    const callbackName = '__onGoogleMapsLoaded'
    window[callbackName] = () => {
      delete window[callbackName]
      resolve(window.google.maps)
    }
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&callback=${callbackName}`
    script.async = true
    script.onerror = () => reject(new Error('Failed to load Google Maps.'))
    document.head.appendChild(script)
  })

  return loadPromise
}
