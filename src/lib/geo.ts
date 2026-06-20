// Delivra launch city default — Port Harcourt, Nigeria.
// Used as a fallback when device GPS is unavailable so rider matching and the
// map stay within the active service area (broadcast matching is radius-based).
export const PH_LAT = 4.8156
export const PH_LNG = 7.0498

// Mapbox expects [lng, lat].
export const DEFAULT_MAP_CENTER: [number, number] = [PH_LNG, PH_LAT]
