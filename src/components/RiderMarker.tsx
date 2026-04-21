import { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import { interpolatePosition } from '../lib/interpolate'

interface RiderMarkerProps {
  map: mapboxgl.Map | null
  lat: number
  lng: number
  follow?: boolean // if true, camera tracks the marker
}

export default function RiderMarker({ map, lat, lng, follow = false }: RiderMarkerProps) {
  const markerRef = useRef<mapboxgl.Marker | null>(null)
  const pulseRef = useRef<HTMLDivElement | null>(null)
  const prevPos = useRef({ lat, lng })
  const animFrame = useRef<number>(0)
  const isFirstUpdate = useRef(true)

  // Create marker once when map is ready
  useEffect(() => {
    if (!map) return

    // Outer container
    const el = document.createElement('div')
    el.style.position = 'relative'
    el.style.width = '24px'
    el.style.height = '24px'

    // Pulse ring
    const pulse = document.createElement('div')
    pulse.style.cssText = `
      position:absolute;inset:-8px;border-radius:50%;
      border:2px solid rgba(34,211,238,0.5);
      animation:rider-pulse 2s ease-out infinite;
    `
    pulseRef.current = pulse

    // Dot
    const dot = document.createElement('div')
    dot.style.cssText = `
      width:24px;height:24px;border-radius:50%;
      background:#22D3EE;border:3px solid #05070D;
      box-shadow:0 0 16px rgba(34,211,238,0.7);
      position:relative;z-index:1;
    `

    el.appendChild(pulse)
    el.appendChild(dot)

    // Inject pulse keyframes once
    if (!document.getElementById('rider-pulse-style')) {
      const style = document.createElement('style')
      style.id = 'rider-pulse-style'
      style.textContent = `
        @keyframes rider-pulse {
          0%   { transform: scale(0.8); opacity: 0.8; }
          70%  { transform: scale(1.8); opacity: 0; }
          100% { transform: scale(0.8); opacity: 0; }
        }
      `
      document.head.appendChild(style)
    }

    markerRef.current = new mapboxgl.Marker({ element: el, anchor: 'center' })
      .setLngLat([lng, lat])
      .addTo(map)

    return () => {
      markerRef.current?.remove()
      cancelAnimationFrame(animFrame.current)
    }
  }, [map]) // eslint-disable-line react-hooks/exhaustive-deps

  // Animate to new position on every lat/lng update
  useEffect(() => {
    if (!markerRef.current || !map) return

    const from = prevPos.current
    const to = { lat, lng }

    // Snap immediately on first render, animate subsequent updates
    if (isFirstUpdate.current) {
      markerRef.current.setLngLat([lng, lat])
      isFirstUpdate.current = false
      if (follow) {
        map.flyTo({ center: [lng, lat], zoom: 15, duration: 800 })
      }
      prevPos.current = to
      return
    }

    const duration = 3500
    const start = performance.now()
    cancelAnimationFrame(animFrame.current)

    const animate = (now: number) => {
      const t = Math.min((now - start) / duration, 1)
      const pos = interpolatePosition(from, to, t)
      markerRef.current?.setLngLat([pos.lng, pos.lat])

      // Pan camera smoothly alongside marker if following
      if (follow && t < 1) {
        map.easeTo({ center: [pos.lng, pos.lat], duration: 100, easing: (x) => x })
      }

      if (t < 1) {
        animFrame.current = requestAnimationFrame(animate)
      } else if (follow) {
        map.easeTo({ center: [to.lng, to.lat], duration: 300 })
      }
    }

    animFrame.current = requestAnimationFrame(animate)
    prevPos.current = to
  }, [lat, lng, follow, map]) // eslint-disable-line react-hooks/exhaustive-deps

  return null
}
