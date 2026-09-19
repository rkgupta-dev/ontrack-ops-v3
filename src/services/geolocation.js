/**
 * Promise wrapper over the browser Geolocation API, used before punch
 * in/out (A-004/A-005 require `lat`, `long`).
 */
export function getCurrentPosition(options = {}) {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('Geolocation is not supported by this browser.'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          long: position.coords.longitude,
        })
      },
      (error) => {
        reject(mapGeolocationError(error))
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
        ...options,
      },
    )
  })
}

function mapGeolocationError(error) {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return new Error('Location permission was denied. Please enable it to punch in/out.')
    case error.POSITION_UNAVAILABLE:
      return new Error('Your location could not be determined. Please try again.')
    case error.TIMEOUT:
      return new Error('Getting your location timed out. Please try again.')
    default:
      return new Error('Could not get your location.')
  }
}

/** Best-effort device identifier sent with punch in/out (A-004/A-005 `device`
 * field — the old app's exact format is unspecified in the docs). */
export function getDeviceInfo() {
  return typeof navigator !== 'undefined' ? navigator.userAgent : 'web'
}
