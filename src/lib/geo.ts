// Delivra launch city default — Port Harcourt, Nigeria.
// Used as a fallback when device GPS is unavailable so rider matching and the
// map stay within the active service area (broadcast matching is radius-based).
export const PH_LAT = 4.8156
export const PH_LNG = 7.0498

// Mapbox expects [lng, lat].
export const DEFAULT_MAP_CENTER: [number, number] = [PH_LNG, PH_LAT]

// Broadcast matching radius (mirrors the backend default in matching.py).
export const MATCH_RADIUS_KM = 5

/** Great-circle distance between two lat/lng points, in km. */
export function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371
  const dLat = ((bLat - aLat) * Math.PI) / 180
  const dLng = ((bLng - aLng) * Math.PI) / 180
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.asin(Math.sqrt(s))
}
