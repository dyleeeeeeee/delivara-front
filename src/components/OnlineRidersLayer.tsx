import { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'

export interface PresenceRider {
  lat: number
  lng: number
  available?: boolean
}

function makeDot(available: boolean): HTMLDivElement {
  const color = available ? '#22c55e' : '#9CA3AF'
  const ring = available ? 'rgba(34,197,94,0.5)' : 'rgba(156,163,175,0.35)'
  const glow = available ? 'rgba(34,197,94,0.8)' : 'rgba(156,163,175,0.5)'
  const el = document.createElement('div')
  el.style.cssText = 'position:relative;width:14px;height:14px;'
  const pulse = document.createElement('div')
  pulse.style.cssText = `position:absolute;inset:-6px;border-radius:50%;border:2px solid ${ring};animation:rider-pulse 2.2s ease-out infinite;`
  const dot = document.createElement('div')
  dot.style.cssText = `width:14px;height:14px;border-radius:50%;background:${color};border:2px solid #05070D;box-shadow:0 0 10px ${glow};position:relative;z-index:1;`
  el.appendChild(pulse)
  el.appendChild(dot)
  return el
}

/** Renders a live, glowing dot per online rider on the vendor map (Bolt-style). */
export default function OnlineRidersLayer({
  map,
  riders,
}: {
  map: mapboxgl.Map | null
  riders: Record<string, PresenceRider>
}) {
  const markers = useRef<Record<string, { marker: mapboxgl.Marker; available: boolean }>>({})

  useEffect(() => {
    if (!map) return
    if (!document.getElementById('rider-pulse-style')) {
      const style = document.createElement('style')
      style.id = 'rider-pulse-style'
      style.textContent =
        '@keyframes rider-pulse{0%{transform:scale(0.8);opacity:0.8}70%{transform:scale(1.8);opacity:0}100%{transform:scale(0.8);opacity:0}}'
      document.head.appendChild(style)
    }

    const cur = markers.current
    for (const [id, r] of Object.entries(riders)) {
      const existing = cur[id]
      if (existing && existing.available === !!r.available) {
        existing.marker.setLngLat([r.lng, r.lat])
      } else {
        if (existing) existing.marker.remove()
        const marker = new mapboxgl.Marker({ element: makeDot(!!r.available), anchor: 'center' })
          .setLngLat([r.lng, r.lat])
          .addTo(map)
        cur[id] = { marker, available: !!r.available }
      }
    }
    for (const id of Object.keys(cur)) {
      if (!riders[id]) {
        cur[id].marker.remove()
        delete cur[id]
      }
    }
  }, [map, riders])

  useEffect(
    () => () => {
      Object.values(markers.current).forEach((m) => m.marker.remove())
      markers.current = {}
    },
    []
  )

  return null
}
