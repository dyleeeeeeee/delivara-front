import { useEffect, useState, useRef } from 'react'
import { useParams } from 'react-router-dom'

import Map from '../components/Map'
import StatusChip from '../components/StatusChip'
import RiderMarker from '../components/RiderMarker'
import { api } from '../lib/api'

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

  useEffect(() => {
    if (!job || job.status === 'COMPLETED') return

    // Default to a secure ws:// scheme matching the page protocol.
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
        ws.send(JSON.stringify({
          type: 'TRACK_SUBSCRIBE',
          data: { tracking_slug: slug, job_id: job.id },
        }))
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
          if (msg.type === 'STATE_SNAPSHOT' && msg.data?.status) {
            setJob((prev) => (prev ? { ...prev, status: msg.data.status } : prev))
          }
          if (msg.type === 'JOB_COMPLETED' || msg.data?.status === 'COMPLETED') {
            completed = true
          }
        } catch {}
      }

      ws.onerror = () => ws.close()

      // Reconnect with exponential backoff on unexpected close.
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

  const center: [number, number] =
    riderLat != null && riderLng != null
      ? [riderLng, riderLat]
      : [job.dropoff_lng, job.dropoff_lat]

  return (
    <div className="relative h-full w-full">
      <Map onMapReady={setMapInstance} center={center} />

      {riderLat != null && riderLng != null && mapInstance && (
        <RiderMarker map={mapInstance} lat={riderLat} lng={riderLng} />
      )}

      <div className="absolute top-4 left-4 right-4 z-10">
        <div className="glass rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold">Live Tracking</span>
            <StatusChip status={job.status} />
          </div>
          <p className="text-xs text-text-secondary">{job.pickup_address}</p>
          <p className="text-xs text-text-secondary mt-1">→ {job.dropoff_address}</p>

          {typeof job.fee === 'number' && job.status !== 'COMPLETED' && (
            <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between">
              <span className="text-xs text-text-secondary/70">Dispatch fee</span>
              <span className="text-sm font-bold text-accent-secondary">
                ₦{job.fee.toLocaleString()}
                <span className="ml-1 text-[10px] font-normal text-text-secondary/60">pay rider</span>
              </span>
            </div>
          )}
        </div>
      </div>

      {job.status === 'COMPLETED' && (
        <div className="absolute bottom-24 left-4 right-4 z-10">
          <div className="glass rounded-xl p-4 text-center">
            <p className="text-sm font-medium text-green-400">✓ Delivery Complete</p>
          </div>
        </div>
      )}

      {/* Growth loop — every tracking link is a chance to win a new vendor */}
      <div className="absolute bottom-6 left-4 right-4 z-10">
        <a
          href="https://delivra.ng/login"
          className="block glass rounded-xl px-4 py-3 text-center hover:bg-white/5 transition-colors"
        >
          <p className="text-xs text-text-secondary/70">Powered by <span className="text-accent-primary font-semibold">Delivra</span></p>
          <p className="text-sm font-medium text-text-primary mt-0.5">Send your own delivery →</p>
        </a>
      </div>
    </div>
  )
}
