import { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import { MAPBOX_TOKEN, MAP_STYLE } from '../lib/mapStyle'
import { DEFAULT_MAP_CENTER } from '../lib/geo'
import { registerMapCanvas } from '../lib/liquidGlass'

interface MapProps {
  onMapReady?: (map: mapboxgl.Map) => void
  center?: [number, number]
  zoom?: number
}

export default function Map({ onMapReady, center, zoom = 13 }: MapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    if (!MAPBOX_TOKEN) {
      console.warn('[Map] No Mapbox token — set VITE_MAPBOX_TOKEN in .env')
      return
    }

    mapboxgl.accessToken = MAPBOX_TOKEN

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: MAP_STYLE,
      center: center || DEFAULT_MAP_CENTER,
      zoom,
      attributionControl: false,
      logoPosition: 'bottom-left',
      // Required so liquidGL can read the map's pixels each frame and refract
      // the live, moving map through the glass surfaces above it.
      preserveDrawingBuffer: true,
    })

    mapRef.current = map
    let unregister: (() => void) | undefined
    map.on('load', () => {
      onMapReady?.(map)
      const canvas = map.getCanvas()
      unregister = registerMapCanvas(canvas)
    })

    return () => {
      unregister?.()
      map.remove()
      mapRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!center || !mapRef.current) return
    mapRef.current.easeTo({ center, duration: 800 })
  }, [center?.[0], center?.[1]]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 w-full h-full"
      style={{ zIndex: 0 }}
    />
  )
}
