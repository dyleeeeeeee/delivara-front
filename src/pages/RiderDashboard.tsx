import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Map from '../components/Map'
import GlassNavBar from '../components/GlassNavBar'
import SideDrawer from '../components/SideDrawer'
import StatusChip from '../components/StatusChip'
import PhotoCapture from '../components/PhotoCapture'
import StarRating from '../components/StarRating'
import Toast, { useToast } from '../components/Toast'
import { useWSStore } from '../stores/ws'
import { useJobsStore } from '../stores/jobs'
import { useLocationStore } from '../stores/location'
import { api } from '../lib/api'

export default function RiderDashboard() {
  const [, setMapInstance] = useState<unknown>(null)
  const [isOnline, setIsOnline] = useState(false)
  const [proofUploaded, setProofUploaded] = useState(false)
  const [rating, setRating] = useState(0)
  const [ratingSubmitted, setRatingSubmitted] = useState(false)
  const { connect, disconnect, send, on } = useWSStore()
  const { activeJob, incomingRequest, setActiveJob, setIncomingRequest, updateJobStatus } = useJobsStore()
  const { startWatching, stopWatching, upgradeJobId, currentLat, currentLng, permissionDenied, httpsRequired, requestPermission } = useLocationStore()
  const toast = useToast()

  // Request location permission on mount
  useEffect(() => {
    requestPermission()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    connect()
    return () => disconnect()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const unsubs = [
      on('JOB_REQUEST', (data) => {
        // Normalize: backend sends job_id, frontend uses .id
        const normalized = { ...data, id: (data.job_id as string) ?? (data.id as string) }
        setIncomingRequest(normalized as never)
        toast.show('📦 New delivery request!')
      }),

      on('JOB_ACCEPTED', (data) => {
        const d = data as { job_id: string; rider_id: string }
        const { incomingRequest: req } = useJobsStore.getState()
        if (req) {
          setActiveJob({ ...req, id: d.job_id, status: 'ASSIGNED' })
        }
        setIncomingRequest(null)
        toast.show('Job accepted!', 'success')
      }),
      on('JOB_ASSIGN_FAILED', () => {
        setIncomingRequest(null)
        toast.show('Job already taken', 'error')
      }),
      on('JOB_STATUS', (data) => {
        const d = data as { job_id: string; status: string }
        updateJobStatus(d.job_id, d.status)
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
          setActiveJob({ ...current, status: 'COMPLETED' })
        }
      }),
      on('STATE_SNAPSHOT', (data) => {
        const d = data as { jobs?: Array<Record<string, unknown>> }
        if (d.jobs) {
          const myJob = d.jobs.find((j) => j.rider_id && j.status !== 'COMPLETED')
          if (myJob) {
            setActiveJob(myJob as never)
            startWatching(myJob.id as string)
          }
        }
      }),
    ]
    return () => unsubs.forEach((u) => u())
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const goOnline = async () => {
    const granted = await requestPermission()
    if (!granted) {
      toast.show('Location permission required to go online', 'error')
      return
    }
    setIsOnline(true)
    // Start idle location watch immediately — keeps currentLat/currentLng fresh
    // Uses 'idle' sentinel so location updates aren't sent to backend until job assigned
    startWatching('idle')
    const { currentLat: lat, currentLng: lng } = useLocationStore.getState()
    send('RIDER_ONLINE', {
      lat: lat ?? 6.5244,
      lng: lng ?? 3.3792,
    })
    toast.show('You are now online', 'success')
  }

  const goOffline = () => {
    setIsOnline(false)
    stopWatching()
    send('RIDER_OFFLINE', {})
  }

  const acceptJob = () => {
    const { incomingRequest: req } = useJobsStore.getState()
    if (!req) return
    send('ACCEPT_JOB', { job_id: req.id })
    // Upgrade the job_id on the existing watch — no GPS restart, no gap in stream
    upgradeJobId(req.id)
  }

  const declineJob = () => {
    setIncomingRequest(null)
  }

  const advanceStatus = () => {
    const { activeJob: current } = useJobsStore.getState()
    if (!current) return
    const transitions: Record<string, string> = {
      ASSIGNED: 'PICKED_UP',
      PICKED_UP: 'IN_TRANSIT',
      IN_TRANSIT: 'DELIVERED',
      DELIVERED: 'COMPLETED',
    }
    const next = transitions[current.status]
    if (!next) return

    if (next === 'DELIVERED' && !proofUploaded) {
      toast.show('Upload photo proof first', 'error')
      return
    }

    send('JOB_STATUS', { job_id: current.id, status: next })

    if (next === 'COMPLETED') {
      stopWatching()
      setProofUploaded(false)
      setRatingSubmitted(false)
    }
  }

  const submitRating = async () => {
    const { activeJob: current } = useJobsStore.getState()
    if (!current || rating === 0 || ratingSubmitted) return
    try {
      const shortId = current.id.replace('jobs:', '')
      await api(`/api/jobs/${shortId}/rate`, {
        method: 'POST',
        body: JSON.stringify({ score: rating }),
      })
      toast.show('Rating submitted', 'success')
      setRatingSubmitted(true)
      setRating(0)
      setActiveJob(null)
    } catch {
      toast.show('Failed to submit rating', 'error')
    }
  }

  const statusLabels: Record<string, string> = {
    ASSIGNED: 'Mark Picked Up',
    PICKED_UP: 'Start Transit',
    IN_TRANSIT: 'Mark Delivered',
    DELIVERED: 'Complete Delivery',
  }

  const statusIcons: Record<string, string> = {
    ASSIGNED: '📍',
    PICKED_UP: '🚚',
    IN_TRANSIT: '⚡',
    DELIVERED: '✅',
  }

  return (
    <div className="relative h-full w-full">
      <Map
        onMapReady={setMapInstance}
        center={currentLat != null && currentLng != null ? [currentLng, currentLat] : undefined}
      />

      {/* Top bar */}
      <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={isOnline ? goOffline : goOnline}
          className={`px-5 py-2.5 rounded-xl font-medium text-sm transition-all ${
            isOnline
              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
              : 'glass text-text-secondary'
          }`}
        >
          {isOnline ? '● Online' : 'Go Online'}
        </motion.button>

        {activeJob && <StatusChip status={activeJob.status} />}
      </div>

      {/* Location permission warning */}
      <AnimatePresence>
        {(permissionDenied || httpsRequired) && (
          <motion.div
            initial={{ y: -40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -40, opacity: 0 }}
            className="absolute top-20 left-4 right-4 z-20 glass rounded-xl px-4 py-3 border border-yellow-500/30"
          >
            {httpsRequired ? (
              <p className="text-xs text-yellow-400 text-center">
                🔒 Location requires HTTPS. Access via <strong>https://</strong> or use localhost.
              </p>
            ) : (
              <p className="text-xs text-yellow-400 text-center">
                📍 Location access denied. Enable it in browser settings to go online.
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Incoming job request — full bottom sheet ─── */}
      <AnimatePresence>
        {incomingRequest && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-30"
            />

            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 220 }}
              className="fixed bottom-0 left-0 right-0 z-40 glass rounded-t-3xl flex flex-col"
              style={{ maxHeight: '85vh', boxShadow: '0 -8px 40px rgba(0,0,0,0.5)' }}
            >
              {/* Drag handle */}
              <div className="flex justify-center pt-4 pb-1 flex-shrink-0">
                <motion.div
                  className="w-10 h-1 bg-accent-primary/60 rounded-full"
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                />
              </div>

              {/* Scrollable content */}
              <div className="overflow-y-auto flex-1 px-6 pt-2">
                {/* Header */}
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-2xl bg-accent-primary/20 border border-accent-primary/30 flex items-center justify-center text-lg">
                    📦
                  </div>
                  <div>
                    <h3 className="font-bold text-base">New Delivery Request</h3>
                    <p className="text-xs text-text-secondary">Tap Accept to claim this job</p>
                  </div>
                </div>

                {/* Route */}
                <div className="glass-light rounded-2xl p-4 mb-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 w-6 h-6 rounded-full bg-accent-primary/20 border border-accent-primary/40 flex items-center justify-center flex-shrink-0">
                      <div className="w-2 h-2 rounded-full bg-accent-primary" />
                    </div>
                    <div>
                      <p className="text-[10px] text-text-secondary/60 uppercase tracking-wide font-medium">Pickup</p>
                      <p className="text-sm font-medium mt-0.5">{incomingRequest.pickup_address}</p>
                      <p className="text-[11px] text-text-secondary/60 font-mono mt-0.5">
                        {incomingRequest.pickup_lat},{' '}
                        {incomingRequest.pickup_lng}
                      </p>
                    </div>
                  </div>

                  {/* Route line */}
                  <div className="flex items-center gap-3">
                    <div className="w-6 flex justify-center">
                      <div className="w-px h-5 bg-white/10" />
                    </div>
                    <div className="h-px flex-1 border-t border-dashed border-white/10" />
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 w-6 h-6 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center flex-shrink-0">
                      <div className="w-2 h-2 rounded-full bg-cyan-400" />
                    </div>
                    <div>
                      <p className="text-[10px] text-text-secondary/60 uppercase tracking-wide font-medium">Dropoff</p>
                      <p className="text-sm font-medium mt-0.5">{incomingRequest.dropoff_address}</p>
                      <p className="text-[11px] text-text-secondary/60 font-mono mt-0.5">
                        {incomingRequest.dropoff_lat},{' '}
                        {incomingRequest.dropoff_lng}
                      </p>
                    </div>
                  </div>
                </div>

                {incomingRequest.package_description && (
                  <div className="glass-light rounded-xl px-4 py-3 mb-4 flex items-center gap-2">
                    <span className="text-sm">📋</span>
                    <p className="text-sm text-text-secondary">
                      {incomingRequest.package_description}
                    </p>
                  </div>
                )}

                {/* Tracking slug */}
                <div className="glass-light rounded-xl px-4 py-3 mb-4 flex items-center justify-between">
                  <span className="text-xs text-text-secondary/60">Job ID</span>
                  <span className="text-xs font-mono text-text-secondary">
                    {incomingRequest.tracking_slug}
                  </span>
                </div>
              </div>

              {/* Sticky CTA buttons — always visible above safe area */}
              <div
                className="flex gap-3 px-6 pt-3 pb-6 flex-shrink-0"
                style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
              >
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={declineJob}
                  className="flex-1 py-3.5 glass-light rounded-2xl text-text-secondary text-sm font-medium"
                >
                  Decline
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={acceptJob}
                  className="flex-[2] py-3.5 bg-accent-primary rounded-2xl text-white text-sm font-bold glow-primary"
                >
                  Accept Job →
                </motion.button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>


      {/* Active job panel */}
      {activeJob && !incomingRequest && (
        <div className="absolute bottom-28 left-4 right-4 z-10 space-y-3">
          <div className="glass rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-base">{statusIcons[activeJob.status] || '🚚'}</span>
                <StatusChip status={activeJob.status} />
              </div>
              <span className="text-[10px] font-mono text-text-secondary/50">
                {activeJob.tracking_slug}
              </span>
            </div>
            <p className="text-xs text-text-secondary mb-0.5">Delivering to</p>
            <p className="text-sm font-medium">{activeJob.dropoff_address}</p>
          </div>

          {activeJob.status === 'IN_TRANSIT' && !proofUploaded && (
            <PhotoCapture jobId={activeJob.id} onUploaded={() => setProofUploaded(true)} />
          )}

          {activeJob.status === 'COMPLETED' && !ratingSubmitted && (
            <div className="glass rounded-2xl p-4 space-y-3">
              <p className="text-sm font-medium">Rate this vendor</p>
              <StarRating value={rating} onChange={setRating} />
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={submitRating}
                disabled={rating === 0}
                className="w-full py-2.5 bg-accent-primary rounded-xl text-white text-sm font-medium disabled:opacity-40"
              >
                Submit Rating
              </motion.button>
            </div>
          )}

          {statusLabels[activeJob.status] && (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={advanceStatus}
              className="w-full py-3.5 bg-accent-primary rounded-2xl text-white font-bold glow-primary"
            >
              {statusLabels[activeJob.status]}
            </motion.button>
          )}
        </div>
      )}

      <GlassNavBar />
      <SideDrawer />
      <Toast />
    </div>
  )
}
