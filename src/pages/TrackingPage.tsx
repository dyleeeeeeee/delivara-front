import { useEffect, useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import mapboxgl from 'mapbox-gl'

import Map from '../components/Map'
import RiderMarker from '../components/RiderMarker'
import { api } from '../lib/api'
import { fetchRouteGeoJSON } from '../lib/directions'

interface TrackingJob {
  id: string
  status: string
  pickup_address: string
  dropoff_address: string
  pickup_lat: number
  pickup_lng: number
  dropoff_lat: number
  dropoff_lng: number
  tracking_slug: string
  fee?: number
  package_description?: string
}

const STEPS = [
  { key: 'finding', label: 'Finding a rider' },
  { key: 'assigned', label: 'Rider assigned' },
  { key: 'picked', label: 'Picked up' },
  { key: 'transit', label: 'On the way' },
  { key: 'delivered', label: 'Delivered' },
]

function stepIndex(status: string): number {
  switch (status) {
    case 'ASSIGNED': return 1
    case 'PICKED_UP': return 2
    case 'IN_TRANSIT': return 3
    case 'DELIVERED':
    case 'COMPLETED': return 4
    default: return 0 // CREATED / BROADCASTING
  }
}

function addPin(map: mapboxgl.Map, lng: number, lat: number, color: string) {
  const el = document.createElement('div')
  el.style.cssText = `width:16px;height:16px;border-radius:50%;background:${color};border:3px solid #05070D;box-shadow:0 0 12px ${color};`
  return new mapboxgl.Marker({ element: el, anchor: 'center' }).setLngLat([lng, lat]).addTo(map)
}

export default function TrackingPage() {
  const { slug } = useParams<{ slug: string }>()
  const [mapInstance, setMapInstance] = useState<mapboxgl.Map | null>(null)
  const [job, setJob] = useState<TrackingJob | null>(null)
  const [riderLat, setRiderLat] = useState<number | null>(null)
  const [riderLng, setRiderLng] = useState<number | null>(null)
  const [error, setError] = useState('')
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    if (!slug) return
    api<TrackingJob>(`/api/track/${slug}`)
      .then((data) => setJob(data))
      .catch(() => setError('Delivery not found'))
  }, [slug])

  // Draw pickup/dropoff markers + the suggested route, and fit the map to it.
  useEffect(() => {
    if (!mapInstance || !job) return
    const map = mapInstance
    const pickup: [number, number] = [job.pickup_lng, job.pickup_lat]
    const dropoff: [number, number] = [job.dropoff_lng, job.dropoff_lat]

    const m1 = addPin(map, pickup[0], pickup[1], '#22c55e')
    const m2 = addPin(map, dropoff[0], dropoff[1], '#22D3EE')

    const bounds = new mapboxgl.LngLatBounds(pickup, pickup).extend(dropoff)
    map.fitBounds(bounds, { padding: 70, maxZoom: 15, duration: 800 })

    let cancelled = false
    fetchRouteGeoJSON(pickup, dropoff).then((feat) => {
      if (cancelled || !feat) return
      const draw = () => {
        const src = map.getSource('delivra-route') as mapboxgl.GeoJSONSource | undefined
        if (src) {
          src.setData(feat as never)
        } else {
          map.addSource('delivra-route', { type: 'geojson', data: feat as never })
          map.addLayer({
            id: 'delivra-route-line',
            type: 'line',
            source: 'delivra-route',
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: { 'line-color': '#6366f1', 'line-width': 4, 'line-opacity': 0.85 },
          })
        }
        const coords = feat.geometry.coordinates as [number, number][]
        if (coords.length) {
          const rb = coords.reduce(
            (bb, c) => bb.extend(c),
            new mapboxgl.LngLatBounds(coords[0], coords[0])
          )
          map.fitBounds(rb, { padding: 70, maxZoom: 15, duration: 800 })
        }
      }
      if (map.isStyleLoaded()) draw()
      else map.once('idle', draw)
    })

    return () => {
      cancelled = true
      m1.remove()
      m2.remove()
      if (map.getLayer('delivra-route-line')) map.removeLayer('delivra-route-line')
      if (map.getSource('delivra-route')) map.removeSource('delivra-route')
    }
  }, [mapInstance, job?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Live updates over WebSocket with reconnect.
  useEffect(() => {
    if (!job || job.status === 'COMPLETED') return
    const fallback = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`
    const wsUrl = import.meta.env.VITE_WS_URL || fallback

    let intentional = false
    let completed = false
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null
    let delay = 1000

    const connect = () => {
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws
      ws.onopen = () => {
        delay = 1000
        ws.send(JSON.stringify({ type: 'TRACK_SUBSCRIBE', data: { tracking_slug: slug, job_id: job.id } }))
      }
      ws.onmessage = (evt) => {
        try {
          const msg = JSON.parse(evt.data)
          if (msg.type === 'LOCATION_UPDATE') {
            setRiderLat(msg.data.lat)
            setRiderLng(msg.data.lng)
          }
          if (msg.type === 'JOB_STATUS' || msg.type === 'JOB_COMPLETED') {
            setJob((prev) => (prev ? { ...prev, status: msg.data.status } : prev))
          }
          if (msg.type === 'JOB_ACCEPTED') {
            setJob((prev) => (prev ? { ...prev, status: msg.data.status || prev.status, fee: msg.data.fee ?? prev.fee } : prev))
          }
          if (msg.type === 'STATE_SNAPSHOT' && msg.data?.status) {
            setJob((prev) => (prev ? { ...prev, status: msg.data.status } : prev))
          }
          if (msg.type === 'JOB_COMPLETED' || msg.data?.status === 'COMPLETED') completed = true
        } catch {}
      }
      ws.onerror = () => ws.close()
      ws.onclose = () => {
        wsRef.current = null
        if (intentional || completed) return
        reconnectTimer = setTimeout(() => {
          delay = Math.min(delay * 2, 30000)
          connect()
        }, delay)
      }
    }
    connect()
    return () => {
      intentional = true
      if (reconnectTimer) clearTimeout(reconnectTimer)
      wsRef.current?.close()
      wsRef.current = null
    }
  }, [job?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-bg-primary">
        <p className="text-text-secondary">{error}</p>
      </div>
    )
  }
  if (!job) {
    return (
      <div className="h-full flex items-center justify-center bg-bg-primary">
        <div className="w-8 h-8 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const active = stepIndex(job.status)
  const hasRider = riderLat != null && riderLng != null
  const headline =
    job.status === 'COMPLETED' || job.status === 'DELIVERED'
      ? 'Delivered ✓'
      : active === 0
      ? 'Finding a rider nearby…'
      : hasRider
      ? 'Your rider is on the move'
      : 'Rider assigned — heading to pickup'

  return (
    <div className="relative h-full w-full">
      <Map onMapReady={setMapInstance} />

      {hasRider && mapInstance && (
        <RiderMarker map={mapInstance} lat={riderLat as number} lng={riderLng as number} />
      )}

      {/* Top status banner */}
      <div className="absolute top-4 left-4 right-4 z-10">
        <div className="glass rounded-2xl px-4 py-3">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${active >= 4 ? 'bg-green-400' : 'bg-accent-secondary animate-pulse'}`} />
            <span className="text-sm font-semibold">{headline}</span>
          </div>
        </div>
      </div>

      {/* Bottom sheet — details */}
      <div className="absolute bottom-0 left-0 right-0 z-10">
        <div className="glass rounded-t-3xl p-5 pb-6 space-y-4">
          {/* Timeline */}
          <div className="flex items-center justify-between">
            {STEPS.map((s, i) => (
              <div key={s.key} className="flex-1 flex flex-col items-center">
                <div className="flex items-center w-full">
                  {i > 0 && <div className={`h-0.5 flex-1 ${i <= active ? 'bg-accent-primary' : 'bg-white/10'}`} />}
                  <div
                    className={`w-3 h-3 rounded-full shrink-0 ${
                      i < active ? 'bg-accent-primary' : i === active ? 'bg-accent-secondary ring-4 ring-accent-secondary/20' : 'bg-white/15'
                    }`}
                  />
                  {i < STEPS.length - 1 && <div className={`h-0.5 flex-1 ${i < active ? 'bg-accent-primary' : 'bg-white/10'}`} />}
                </div>
                <span className={`text-[9px] mt-1.5 text-center ${i <= active ? 'text-text-primary' : 'text-text-secondary/50'}`}>
                  {s.label}
                </span>
              </div>
            ))}
          </div>

          {/* Route */}
          <div className="glass-light rounded-2xl p-4 space-y-2.5">
            <div className="flex items-start gap-2.5">
              <span className="mt-1 w-2.5 h-2.5 rounded-full bg-green-400 shrink-0" />
              <div>
                <p className="text-[10px] uppercase tracking-wide text-text-secondary/60">Pickup</p>
                <p className="text-sm">{job.pickup_address}</p>
              </div>
            </div>
            <div className="ml-1 h-3 border-l border-dashed border-white/15" />
            <div className="flex items-start gap-2.5">
              <span className="mt-1 w-2.5 h-2.5 rounded-full bg-accent-secondary shrink-0" />
              <div>
                <p className="text-[10px] uppercase tracking-wide text-text-secondary/60">Dropoff</p>
                <p className="text-sm">{job.dropoff_address}</p>
              </div>
            </div>
          </div>

          {/* Item + fee */}
          <div className="flex items-center gap-3">
            {job.package_description && (
              <div className="flex-1 glass-light rounded-xl px-3 py-2.5 flex items-center gap-2">
                <span>📦</span>
                <span className="text-xs text-text-secondary truncate">{job.package_description}</span>
              </div>
            )}
            {typeof job.fee === 'number' && job.status !== 'COMPLETED' && (
              <div className="glass-light rounded-xl px-3 py-2.5 text-right">
                <p className="text-[10px] text-text-secondary/60">Dispatch fee</p>
                <p className="text-sm font-bold text-accent-secondary">
                  ₦{job.fee.toLocaleString()} <span className="text-[10px] font-normal text-text-secondary/60">pay rider</span>
                </p>
              </div>
            )}
          </div>

          {/* Growth loop */}
          <a
            href="https://delivra.ng/login"
            className="block rounded-xl px-4 py-3 text-center bg-accent-primary/10 border border-accent-primary/25 hover:bg-accent-primary/15 transition-colors"
          >
            <span className="text-xs text-text-secondary/70">Powered by </span>
            <span className="text-xs text-accent-primary font-semibold">Delivra</span>
            <span className="text-sm font-medium text-text-primary"> · Send your own delivery →</span>
          </a>
        </div>
      </div>
    </div>
  )
}
