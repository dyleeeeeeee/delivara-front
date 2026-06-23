import { useEffect, useState } from 'react'
import type { Map as MapboxMap } from 'mapbox-gl'
import Map from '../components/Map'
import GlassNavBar from '../components/GlassNavBar'
import SideDrawer from '../components/SideDrawer'
import JobSheet from '../components/JobSheet'
import JobCard from '../components/JobCard'
import RiderMarker from '../components/RiderMarker'
import OnlineRidersLayer from '../components/OnlineRidersLayer'
import StatusChip from '../components/StatusChip'
import Toast, { useToast } from '../components/Toast'
import { useWSStore } from '../stores/ws'
import { useJobsStore } from '../stores/jobs'
import { useNavigate } from 'react-router-dom'
import { haversineKm, MATCH_RADIUS_KM } from '../lib/geo'
import { motion, AnimatePresence } from 'framer-motion'
import Glass from '../components/Glass'

export default function VendorDashboard() {
  const [mapInstance, setMapInstance] = useState<MapboxMap | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [cameraFollow, setCameraFollow] = useState(true)
  const [offer, setOffer] = useState<{ job_id: string; rider_id: string; fee: number; suggested_fee?: number; rider_name?: string; rider_rating?: number } | null>(null)
  const [onlineRiders, setOnlineRiders] = useState<Record<string, { lat: number; lng: number; available?: boolean; ts: number }>>({})
  const [vendorPos, setVendorPos] = useState<{ lat: number; lng: number } | null>(null)
  const { connect, disconnect, on, send } = useWSStore()
  const connected = useWSStore((s) => s.connected)
  const toast = useToast()
  const navigate = useNavigate()
  const {
    jobs, activeJob, riderLocation,
    setActiveJob, setRiderLocation, updateJobStatus, addJob, fetchJobs,
  } = useJobsStore()

  useEffect(() => {
    connect()
    fetchJobs()
    return () => disconnect()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const unsubs = [
      on('JOB_CREATED', (data) => {
        const normalized = { ...data, id: (data as any).job_id ?? (data as any).id }
        addJob(normalized as never)
      }),

      on('JOB_ACCEPTED', (data) => {
        const d = data as { job_id: string; status: string; rider_id: string }
        updateJobStatus(d.job_id, d.status)
        setOffer(null) // resolve any pending counter-offer
        // Auto-set the accepted job as active so location updates aren't dropped
        const { jobs: currentJobs } = useJobsStore.getState()
        const accepted = currentJobs.find((j) => j.id === d.job_id)
        if (accepted) setActiveJob(accepted)
      }),

      on('LOCATION_UPDATE', (data) => {
        const d = data as { lat: number; lng: number; job_id: string }
        // Accept updates for the active job OR if no active job set yet
        const { activeJob: current } = useJobsStore.getState()
        if (!current || d.job_id === current.id) {
          setRiderLocation({ lat: d.lat, lng: d.lng })
        }
      }),

      on('JOB_STATUS', (data) => {
        const d = data as { job_id: string; status: string }
        updateJobStatus(d.job_id, d.status)
        // Sync activeJob status
        const { activeJob: current } = useJobsStore.getState()
        if (current && d.job_id === current.id) {
          setActiveJob({ ...current, status: d.status })
        }
      }),

      on('JOB_COMPLETED', (data) => {
        const d = data as { job_id: string }
        updateJobStatus(d.job_id, 'COMPLETED')
        const { activeJob: current } = useJobsStore.getState()
        if (current && d.job_id === current.id) {
          setActiveJob(null)
          setRiderLocation(null)
        }
      }),

      on('JOB_OFFER', (data) => {
        setOffer(data as never)
      }),

      on('ERROR', (data) => {
        const d = data as { message?: string; code?: string }
        if (d.code === 'INSUFFICIENT_FUNDS') {
          toast.show('Top up your wallet to send', 'error')
          navigate('/wallet')
        } else if (d.message) {
          toast.show(d.message, 'error')
        }
      }),

      on('RIDER_PRESENCE_SNAPSHOT', (data) => {
        const d = data as { riders?: Array<{ rider_id: string; lat: number; lng: number; available?: boolean }> }
        const next: Record<string, { lat: number; lng: number; available?: boolean; ts: number }> = {}
        ;(d.riders || []).forEach((r) => { next[r.rider_id] = { lat: r.lat, lng: r.lng, available: r.available, ts: Date.now() } })
        setOnlineRiders(next)
      }),
      on('RIDER_PRESENCE', (data) => {
        const r = data as { rider_id: string; lat: number; lng: number; available?: boolean }
        setOnlineRiders((prev) => ({ ...prev, [r.rider_id]: { lat: r.lat, lng: r.lng, available: r.available, ts: Date.now() } }))
      }),
      on('RIDER_OFFLINE_PRESENCE', (data) => {
        const r = data as { rider_id: string }
        setOnlineRiders((prev) => {
          const n = { ...prev }
          delete n[r.rider_id]
          return n
        })
      }),

      on('STATE_SNAPSHOT', (data) => {
        const d = data as { jobs?: Array<Record<string, unknown>> }
        if (d.jobs) {
          const snap = d.jobs.find((j) => j.status !== 'COMPLETED')
          if (snap) setActiveJob(snap as never)
        }
      }),
    ]
    return () => unsubs.forEach((u) => u())
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!mapInstance) return

    const snapToLocation = () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            mapInstance.flyTo({
              center: [pos.coords.longitude, pos.coords.latitude],
              zoom: 15,
              essential: true,
            })
          },
          (err) => console.warn('Could not get location:', err),
          { enableHighAccuracy: true, timeout: 5000 }
        )
      }
    }

    // Snap to location on initial load (login)
    snapToLocation()

    // Listen for double-tap on Home button
    window.addEventListener('snapToLocation', snapToLocation)
    return () => window.removeEventListener('snapToLocation', snapToLocation)
  }, [mapInstance])

  // Drop rider dots that stop reporting (offline/disconnect) after 15s.
  useEffect(() => {
    const id = setInterval(() => {
      setOnlineRiders((prev) => {
        const now = Date.now()
        let changed = false
        const next: typeof prev = {}
        for (const [k, v] of Object.entries(prev)) {
          if (now - v.ts < 15000) next[k] = v
          else changed = true
        }
        return changed ? next : prev
      })
    }, 5000)
    return () => clearInterval(id)
  }, [])

  // Track the vendor's location to show nearby supply.
  useEffect(() => {
    if (!navigator.geolocation) return
    const id = navigator.geolocation.watchPosition(
      (pos) => setVendorPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, maximumAge: 10000 }
    )
    return () => navigator.geolocation.clearWatch(id)
  }, [])

  const activeJobs = jobs.filter((j) => j.status !== 'COMPLETED')
  // A just-created job still looking for a rider.
  const broadcasting = activeJobs.find((j) => j.status === 'BROADCASTING' || j.status === 'CREATED')

  // Don't double-mark the assigned rider — they get the dedicated RiderMarker.
  const presenceRiders = { ...onlineRiders }
  if (activeJob?.rider_id) delete presenceRiders[activeJob.rider_id]
  const onlineCount = Object.keys(onlineRiders).length
  const nearbyCount = vendorPos
    ? Object.values(onlineRiders).filter(
        (r) => haversineKm(vendorPos.lat, vendorPos.lng, r.lat, r.lng) <= MATCH_RADIUS_KM
      ).length
    : null

  return (
    <div className="relative h-full w-full">
      <Map onMapReady={setMapInstance} />

      {/* Live online-rider dots */}
      <OnlineRidersLayer map={mapInstance} riders={presenceRiders} />

      {/* Reconnecting banner — so a network blip doesn't look like a frozen app */}
      {!connected && (
        <div className="absolute top-0 left-0 right-0 z-40">
          <div className="bg-plasma/90 text-white text-xs font-semibold text-center py-1.5 flex items-center justify-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-white/80 animate-pulse" />
            Reconnecting… your actions will send once you're back online
          </div>
        </div>
      )}

      {/* Finding a rider — clear feedback while a job is broadcasting */}
      {!activeJob && broadcasting && (
        <div className="absolute top-16 left-4 right-4 z-10">
          <Glass className="rounded-2xl p-5 text-center" specular shadow>
            <div className="relative mx-auto w-16 h-16 mb-3">
              <span className="absolute inset-0 rounded-full bg-iris/30 animate-ping" />
              <span className="absolute inset-0 rounded-full bg-iris/20 flex items-center justify-center text-2xl glow-primary">🔍</span>
            </div>
            <p className="font-bold text-holo text-lg">Finding you a rider…</p>
            <p className="text-xs text-text-secondary mt-1">
              Broadcasting to riders near {broadcasting.pickup_address}. This usually takes under a minute.
            </p>
            {nearbyCount !== null && (
              <p className="text-[11px] text-text-secondary/60 mt-2">
                {nearbyCount > 0
                  ? `${nearbyCount} rider${nearbyCount === 1 ? '' : 's'} nearby being notified`
                  : 'Reaching a little wider — hang tight'}
              </p>
            )}
            {typeof broadcasting.fee === 'number' && (
              <p className="text-[11px] text-aqua mt-1">Dispatch fee ₦{broadcasting.fee.toLocaleString()}</p>
            )}
          </Glass>
        </div>
      )}

      {/* Live supply density — always visible to the vendor */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30">
        <div className="glass rounded-full px-3 py-1.5 flex items-center gap-1.5 shadow-lg">
          <span
            className={`w-2 h-2 rounded-full animate-pulse ${
              (nearbyCount ?? onlineCount) > 0 ? 'bg-lime' : 'bg-plasma'
            }`}
          />
          <span className="text-xs text-text-secondary whitespace-nowrap">
            {nearbyCount === null
              ? `${onlineCount} rider${onlineCount === 1 ? '' : 's'} online`
              : `${nearbyCount} rider${nearbyCount === 1 ? '' : 's'} online within ${MATCH_RADIUS_KM} km`}
          </span>
        </div>
      </div>

      {/* Rider counter-offer — accept to match at their price */}
      <AnimatePresence>
        {offer && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-40"
            />
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              className="fixed left-4 right-4 bottom-24 z-50 glass rounded-2xl p-5"
            >
              <p className="text-sm font-bold mb-1">Rider counter-offer</p>
              <p className="text-xs text-text-secondary mb-3">
                {offer.rider_name || 'A rider'}
                {typeof offer.rider_rating === 'number' ? ` · ${offer.rider_rating.toFixed(1)}★` : ''}
                {' '}wants to do this delivery at their price.
              </p>
              <div className="flex items-end justify-between mb-4">
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-text-secondary/60">Their price</p>
                  <p className="text-2xl font-bold text-holo">₦{offer.fee.toLocaleString()}</p>
                </div>
                {typeof offer.suggested_fee === 'number' && (
                  <p className="text-xs text-text-secondary/60">Suggested ₦{offer.suggested_fee.toLocaleString()}</p>
                )}
              </div>
              <div className="flex gap-2.5">
                <button
                  onClick={() => {
                    send('RESPOND_OFFER', { job_id: offer.job_id, rider_id: offer.rider_id, accept: false })
                    setOffer(null)
                  }}
                  className="flex-1 py-3 glass-light rounded-xl text-text-secondary text-sm font-medium"
                >
                  Decline
                </button>
                <button
                  onClick={() => {
                    send('RESPOND_OFFER', { job_id: offer.job_id, rider_id: offer.rider_id, fee: offer.fee, accept: true })
                  }}
                  className="flex-1 py-3 btn-iris rounded-xl text-white text-sm font-bold glow-primary"
                >
                  Accept ₦{offer.fee.toLocaleString()}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Rider marker — follows camera when cameraFollow is on */}
      {riderLocation && mapInstance && (
        <RiderMarker
          map={mapInstance}
          lat={riderLocation.lat}
          lng={riderLocation.lng}
          follow={cameraFollow}
        />
      )}

      {/* Active job card */}
      {activeJob && (
        <div className="absolute top-14 left-4 right-4 z-10">
          <Glass className="rounded-xl p-4" specular shadow>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-text-primary">Active Delivery</span>
              <div className="flex items-center gap-2">
                <StatusChip status={activeJob.status} />
                {/* Camera follow toggle */}
                {riderLocation && (
                  <button
                    onClick={() => setCameraFollow((v) => !v)}
                    className={`text-xs px-2 py-1 rounded-lg transition-all ${
                      cameraFollow
                        ? 'bg-aqua/20 text-aqua border border-aqua/40 glow-accent'
                        : 'glass-light text-text-secondary'
                    }`}
                  >
                    {cameraFollow ? '🎯 Following' : '📍 Follow'}
                  </button>
                )}
              </div>
            </div>
            <p className="text-xs text-text-secondary truncate">{activeJob.dropoff_address}</p>
            <p className="text-[10px] text-aqua/70 mt-1 font-mono select-all">
              {location.origin}/track/{activeJob.tracking_slug}
            </p>
          </Glass>
        </div>
      )}

      {/* No active job — show job list */}
      <AnimatePresence>
        {!activeJob && !broadcasting && activeJobs.length > 0 && (
          <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="absolute top-20 left-4 right-4 z-10 space-y-2 max-h-[40vh] overflow-y-auto"
          >
            {activeJobs.map((job) => (
              <JobCard key={job.id} job={job} onClick={() => setActiveJob(job)} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rider location pulse when streaming */}
      {riderLocation && !activeJob && (
        <div className="absolute top-14 left-4 right-4 z-10">
          <Glass className="rounded-xl px-4 py-3 flex items-center gap-2" specular>
            <motion.span
              className="w-2 h-2 rounded-full bg-aqua glow-accent"
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            />
            <span className="text-xs text-text-secondary">Rider location streaming</span>
          </Glass>
        </div>
      )}

      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => setSheetOpen(true)}
        className="fixed bottom-24 right-4 w-14 h-14 btn-iris rounded-full flex items-center justify-center text-2xl text-white font-bold glow-primary z-20"
      >
        +
      </motion.button>

      <JobSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />
      <GlassNavBar />
      <SideDrawer />
      <Toast />
    </div>
  )
}
