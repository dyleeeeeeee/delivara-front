export const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || ''

// Using hosted Mapbox style — more reliable than custom vector style
// which requires tiles to load before the map appears
export const MAP_STYLE = 'mapbox://styles/mapbox/dark-v11'
