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

    // Use environment variable for WebSocket URL
    const wsUrl = import.meta.env.VITE_WS_URL || `ws://${location.host}/ws`
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = () => {
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
      } catch {}
    }

    // Reconnect on unexpected close (not intentional)
    ws.onclose = () => {
      wsRef.current = null
    }

    return () => {
      ws.close()
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
        </div>
      </div>

      {job.status === 'COMPLETED' && (
        <div className="absolute bottom-8 left-4 right-4 z-10">
          <div className="glass rounded-xl p-4 text-center">
            <p className="text-sm font-medium text-green-400">✓ Delivery Complete</p>
          </div>
        </div>
      )}
    </div>
  )
}
