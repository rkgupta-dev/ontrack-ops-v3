import axios from 'axios'
import { GOOGLE_GEOCODE_URL } from './api/endpoints'

/**
 * A-069 — GET https://maps.googleapis.com/maps/api/geocode/json
 *
 * Reverse-geocodes coordinates into a human-readable place name for the
 * punch in/out `place` field. This is a direct third-party call (not
 * routed through v2Client — it isn't an ops backend endpoint), using a
 * bare axios instance deliberately, same as the documented call site.
 *
 * Requires VITE_GOOGLE_MAPS_API_KEY. Returns null on any failure — a
 * missing/failed place name shouldn't block punch in/out, since `lat`/
 * `long` are the fields that actually matter.
 */
async function reverseGeocodeGoogle(lat, long) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
  if (!apiKey) return null
  try {
    const response = await axios.get(GOOGLE_GEOCODE_URL, {
      params: { latlng: `${lat},${long}`, key: apiKey },
    })
    return response.data?.results?.[0]?.formatted_address ?? null
  } catch {
    return null
  }
}

/**
 * Reverse-geocodes via OpenStreetMap's Nominatim — no API key required, so
 * the Attendance "Location Detected" address is populated even before
 * VITE_GOOGLE_MAPS_API_KEY is configured (falls back to raw coordinates
 * only if this also fails). Note: Nominatim's usage policy asks for a
 * descriptive User-Agent/Referer and caps free usage at ~1 req/s — fine
 * for occasional punch in/out clicks, but swap back to Google (or a paid
 * geocoder) if this ever needs higher volume.
 */
async function reverseGeocodeNominatim(lat, long) {
  try {
    const response = await axios.get('https://nominatim.openstreetmap.org/reverse', {
      params: { lat, lon: long, format: 'jsonv2' },
    })
    return response.data?.display_name ?? null
  } catch {
    return null
  }
}

export async function reverseGeocode(lat, long) {
  return (await reverseGeocodeGoogle(lat, long)) ?? (await reverseGeocodeNominatim(lat, long))
}
