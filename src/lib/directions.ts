import { MAPBOX_TOKEN } from './mapStyle'

export type RouteFeature = GeoJSON.Feature<GeoJSON.LineString>

/**
 * Fetch the suggested driving route between two [lng, lat] points as GeoJSON.
 * Returns null if no token or the request fails.
 */
export async function fetchRouteGeoJSON(
  from: [number, number],
  to: [number, number]
): Promise<RouteFeature | null> {
  if (!MAPBOX_TOKEN) return null
  try {
    const url =
      `https://api.mapbox.com/directions/v5/mapbox/driving/` +
      `${from[0]},${from[1]};${to[0]},${to[1]}` +
      `?geometries=geojson&overview=full&access_token=${MAPBOX_TOKEN}`
    const res = await fetch(url)
    const data = await res.json()
    const route = data.routes?.[0]
    if (!route?.geometry) return null
    return { type: 'Feature', properties: {}, geometry: route.geometry }
  } catch {
    return null
  }
}
