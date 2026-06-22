import { useEffect, useState, useRef } from 'react'
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
import { PH_LAT, PH_LNG } from '../lib/geo'

export default function RiderDashboard() {
  const [, setMapInstance] = useState<unknown>(null)
  const [isOnline, setIsOnline] = useState(false)
  const [proofUploaded, setProofUploaded] = useState(false)
  const [rating, setRating] = useState(0)
  const [ratingSubmitted, setRatingSubmitted] = useState(false)
  const [counterOpen, setCounterOpen] = useState(false)
  const [counterFee, setCounterFee] = useState('')
  const offerJobRef = useRef<Record<string, unknown> | null>(null)
  const { connect, disconnect, send, on } = useWSStore()
  const connected = useWSStore((s) => s.connected)
  const { activeJob, incomingRequest, setActiveJob, setIncomingRequest, updateJobStatus } = useJobsStore()
  const pendingRequests = useJobsStore((s) => s.pendingRequests)
  const { addPendingRequest, removePendingRequest, clearPendingRequests } = useJobsStore()
  const [feedOpen, setFeedOpen] = useState(false)
  const { startWatching, stopWatching, upgradeJobId, currentLat, currentLng, permissionDenied, httpsRequired, requestPermission } = useLocationStore()
  const toast = useToast()

  // Request location permission on mount
  useEffect(() => {
    requestPermission()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Persist online state across page refreshes
  useEffect(() => {
    const savedOnline = localStorage.getItem('rider_online') === 'true'
    setIsOnline(savedOnline)
  }, [])

  // Auto-send RIDER_ONLINE if previously online and WebSocket connects
  useEffect(() => {
    const { connected } = useWSStore.getState()
    if (connected && isOnline) {
      const { currentLat: lat, currentLng: lng } = useLocationStore.getState()
      send('RIDER_ONLINE', {
        lat: lat ?? PH_LAT,
        lng: lng ?? PH_LNG,
      })
      // Start idle location watch if previously online
      startWatching('idle')
    }
  }, [isOnline]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    connect()
    return () => disconnect()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Rehydrate an in-progress delivery on mount from the DB (source of truth).
  // The WS STATE_SNAPSHOT also restores it, but that relies on volatile server
  // memory — this HTTP path survives a backend restart too.
  useEffect(() => {
    let cancelled = false
    api<{ job: Record<string, unknown> | null }>('/api/jobs/active')
      .then((res) => {
        if (cancelled || !res.job) return
        const { activeJob: cur } = useJobsStore.getState()
        if (cur) return // WS snapshot already restored it
        setActiveJob(res.job as never)
        startWatching(res.job.id as string)
      })
      .catch(() => { /* best-effort rehydrate */ })
    return () => { cancelled = true }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const unsubs = [
      on('JOB_REQUEST', (data) => {
        // Normalize: backend sends job_id, frontend uses .id
        const normalized = { ...data, id: (data.job_id as string) ?? (data.id as string) }
        addPendingRequest(normalized as never)   // keep it in the live feed…
        setIncomingRequest(normalized as never)  // …and pop the focused sheet
        toast.show('📦 New delivery request!')
      }),

      on('JOB_ASSIGNED', (data) => {
        const fullJob = data as Record<string, unknown>
        // Merge over the optimistic/incoming job so addresses aren't lost if the
        // assignment payload omits them.
        const { activeJob: cur, incomingRequest: inc } = useJobsStore.getState()
        setActiveJob({ ...(cur || inc || {}), ...fullJob } as never)
        offerJobRef.current = null
        startWatching(fullJob.id as string)
        setIncomingRequest(null)
        removePendingRequest(fullJob.id as string)
        toast.show('Job accepted!', 'success')
      }),
      on('JOB_TAKEN', (data) => {
        const d = data as { job_id: string }
        removePendingRequest(d.job_id)   // gone from the live feed for everyone
        const { incomingRequest: req } = useJobsStore.getState()
        if (req && req.id === d.job_id) {
          setIncomingRequest(null)
          toast.show('This job was taken by another rider', 'error')
        }
      }),
      on('JOB_ASSIGN_FAILED', () => {
        setIncomingRequest(null)
        toast.show('Job already taken', 'error')
      }),
      on('OFFER_SENT', () => {
        toast.show('Offer sent — waiting for sender', 'info')
      }),
      on('OFFER_DECLINED', () => {
        // Stop attaching location to a job we were never assigned, and bring the
        // request back so the rider can accept at the suggested price.
        useLocationStore.getState().upgradeJobId('idle')
        if (offerJobRef.current) {
          setIncomingRequest(offerJobRef.current as never)
          offerJobRef.current = null
        }
        toast.show('Sender declined your price', 'error')
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
    localStorage.setItem('rider_online', 'true')
    // Start idle location watch immediately — keeps currentLat/currentLng fresh
    // Uses 'idle' sentinel so location updates aren't sent to backend until job assigned
    startWatching('idle')
    const { currentLat: lat, currentLng: lng } = useLocationStore.getState()
    send('RIDER_ONLINE', {
      lat: lat ?? PH_LAT,
      lng: lng ?? PH_LNG,
    })
    toast.show('You are now online', 'success')
  }

  const goOffline = () => {
    setIsOnline(false)
    localStorage.setItem('rider_online', 'false')
    stopWatching()
    clearPendingRequests()   // stop showing requests you can no longer take
    setFeedOpen(false)
    send('RIDER_OFFLINE', {})
  }

  const acceptRequest = (req?: typeof incomingRequest) => {
    req = req ?? useJobsStore.getState().incomingRequest
    if (!req) {
      toast.show('Error: No request data found', 'error')
      return
    }
    toast.show('Accepting job...', 'info')
    send('ACCEPT_JOB', { job_id: req.id })
    // Upgrade the job_id on the existing watch — no GPS restart, no gap in stream
    upgradeJobId(req.id)
    // Optimistically close the modal and show active job UI — JOB_ASSIGNED will
    // fill in full details. Prevents the "old UI" flash while awaiting server.
    setActiveJob({ ...req, status: 'ASSIGNED' } as never)
    removePendingRequest(req.id)
    setIncomingRequest(null)
    setFeedOpen(false)
  }
  const acceptJob = () => acceptRequest()

  const sendCounter = () => {
    const { incomingRequest: req } = useJobsStore.getState()
    if (!req) return
    const fee = parseInt(counterFee, 10)
    if (!fee || fee <= 0) {
      toast.show('Enter a valid amount', 'error')
      return
    }
    send('ACCEPT_JOB', { job_id: req.id, fee })
    // Pre-arm the location watch in case the vendor accepts.
    upgradeJobId(req.id)
    offerJobRef.current = req as unknown as Record<string, unknown> // remember it so we can restore on decline
    removePendingRequest(req.id)
    setIncomingRequest(null)
    setCounterOpen(false)
    setCounterFee('')
  }

  // Decline only dismisses the focused sheet — the request stays in the live feed
  // so a rider who taps Decline by mistake can reopen and still accept it.
  const declineJob = () => {
    setIncomingRequest(null)
    setCounterOpen(false)
    setCounterFee('')
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

      {/* Reconnecting banner */}
      {!connected && (
        <div className="absolute top-0 left-0 right-0 z-40">
          <div className="bg-yellow-500/90 text-black text-xs font-medium text-center py-1.5 flex items-center justify-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-black/60 animate-pulse" />
            Reconnecting…
          </div>
        </div>
      )}

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
            {/* Backdrop — tap outside to dismiss */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={declineJob}
              className="fixed inset-0 bg-black/60 z-[55] cursor-pointer"
            />

            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 220 }}
              className="fixed bottom-0 left-0 right-0 z-[60] glass rounded-t-3xl flex flex-col"
              style={{ maxHeight: '85vh', boxShadow: '0 -8px 40px rgba(0,0,0,0.5)' }}
            >
              {/* Drag handle */}
              <div className="flex justify-center pt-3 pb-2 flex-shrink-0">
                <div className="w-10 h-1 bg-white/20 rounded-full" />
              </div>

              {/* Sticky header — the earnings figure is always visible */}
              <div className="px-5 pb-3 flex-shrink-0 border-b border-white/5 flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-base">New delivery</h3>
                  <p className="text-xs text-text-secondary">Recipient pays on delivery</p>
                </div>
                {typeof incomingRequest.fee === 'number' && (
                  <div className="text-right shrink-0">
                    <p className="text-[10px] text-green-400/70 uppercase tracking-wide font-medium">You earn</p>
                    <p className="text-3xl font-extrabold text-green-400 leading-none mt-0.5">
                      ₦{incomingRequest.fee.toLocaleString()}
                    </p>
                  </div>
                )}
              </div>

              {/* Scrollable body */}
              <div className="overflow-y-auto flex-1 px-5 py-4 space-y-3" style={{ WebkitOverflowScrolling: 'touch' }}>
                <div className="glass-light rounded-2xl p-4 space-y-2.5">
                  <div className="flex items-start gap-3">
                    <span className="mt-1 w-2.5 h-2.5 rounded-full bg-accent-primary shrink-0" />
                    <div>
                      <p className="text-[10px] text-text-secondary/60 uppercase tracking-wide font-medium">Pickup</p>
                      <p className="text-sm font-medium">{incomingRequest.pickup_address}</p>
                    </div>
                  </div>
                  <div className="ml-1 h-3 border-l border-dashed border-white/15" />
                  <div className="flex items-start gap-3">
                    <span className="mt-1 w-2.5 h-2.5 rounded-full bg-cyan-400 shrink-0" />
                    <div>
                      <p className="text-[10px] text-text-secondary/60 uppercase tracking-wide font-medium">Dropoff</p>
                      <p className="text-sm font-medium">{incomingRequest.dropoff_address}</p>
                    </div>
                  </div>
                </div>

                {incomingRequest.package_description && (
                  <div className="glass-light rounded-xl px-4 py-3 flex items-center gap-2">
                    <span className="text-sm">📦</span>
                    <p className="text-sm text-text-secondary">{incomingRequest.package_description}</p>
                  </div>
                )}
              </div>

              {/* Sticky footer — actions always reachable on mobile */}
              <div
                className="flex-shrink-0 px-5 pt-3 border-t border-white/5 space-y-2.5"
                style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
              >
                {counterOpen ? (
                  <>
                    <div className="flex items-center glass-light rounded-xl px-4 py-3">
                      <span className="text-text-secondary mr-1 text-lg">₦</span>
                      <input
                        type="number"
                        inputMode="numeric"
                        autoFocus
                        value={counterFee}
                        onChange={(e) => setCounterFee(e.target.value)}
                        placeholder="Your price"
                        className="bg-transparent outline-none text-lg font-semibold text-text-primary w-full"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setCounterOpen(false)} className="flex-1 py-3 glass-light rounded-xl text-text-secondary text-sm font-medium">
                        Back
                      </button>
                      <motion.button whileTap={{ scale: 0.97 }} onClick={sendCounter} className="flex-[2] py-3 bg-accent-primary rounded-xl text-white font-bold glow-primary">
                        Send offer →
                      </motion.button>
                    </div>
                    <p className="text-[11px] text-text-secondary/60 text-center">The sender matches if they accept your price.</p>
                  </>
                ) : (
                  <>
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={acceptJob}
                      className="w-full py-3.5 bg-accent-primary rounded-xl text-white font-bold text-base glow-primary"
                    >
                      {typeof incomingRequest.fee === 'number'
                        ? `Accept · ₦${incomingRequest.fee.toLocaleString()}`
                        : 'Accept'}
                    </motion.button>
                    <div className="flex gap-2">
                      <button onClick={declineJob} className="flex-1 py-3 glass-light rounded-xl text-text-secondary text-sm font-medium">
                        Decline
                      </button>
                      <button
                        onClick={() => { setCounterFee(String(incomingRequest.fee ?? '')); setCounterOpen(true) }}
                        className="flex-1 py-3 glass-light rounded-xl text-text-primary text-sm font-medium"
                      >
                        Offer my price
                      </button>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>


      {/* ─── Live requests button — reopen the feed (e.g. after an accidental decline) ─── */}
      {isOnline && !activeJob && pendingRequests.length > 0 && !incomingRequest && !feedOpen && (
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setFeedOpen(true)}
          className="absolute bottom-28 right-4 z-20 glass rounded-2xl px-4 py-3 flex items-center gap-2 glow-primary"
        >
          <span className="text-lg">📨</span>
          <span className="text-sm font-semibold">{pendingRequests.length} request{pendingRequests.length > 1 ? 's' : ''}</span>
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        </motion.button>
      )}

      {/* ─── Requests feed — full list of open requests, each actionable ─── */}
      <AnimatePresence>
        {feedOpen && !incomingRequest && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setFeedOpen(false)}
              className="fixed inset-0 bg-black/60 z-[55] cursor-pointer"
            />
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 220 }}
              className="fixed bottom-0 left-0 right-0 z-[60] glass rounded-t-3xl flex flex-col"
              style={{ maxHeight: '85vh', boxShadow: '0 -8px 40px rgba(0,0,0,0.5)' }}
            >
              <div className="flex justify-center pt-3 pb-2 flex-shrink-0">
                <div className="w-10 h-1 bg-white/20 rounded-full" />
              </div>
              <div className="px-5 pb-3 flex-shrink-0 border-b border-white/5 flex items-center justify-between">
                <h3 className="font-bold text-base">Live requests</h3>
                <span className="text-xs text-text-secondary">{pendingRequests.length} open</span>
              </div>
              <div className="overflow-y-auto flex-1 px-5 py-4 space-y-3" style={{ WebkitOverflowScrolling: 'touch' }}>
                {pendingRequests.length === 0 ? (
                  <p className="text-sm text-text-secondary text-center py-8">No open requests right now.</p>
                ) : pendingRequests.map((req) => (
                  <div key={req.id} className="glass-light rounded-2xl p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[10px] text-text-secondary/60 uppercase tracking-wide font-medium">Pickup → Dropoff</p>
                        <p className="text-sm font-medium truncate">{req.pickup_address}</p>
                        <p className="text-sm text-text-secondary truncate">{req.dropoff_address}</p>
                      </div>
                      {typeof req.fee === 'number' && (
                        <div className="text-right shrink-0">
                          <p className="text-[10px] text-green-400/70 uppercase font-medium">Earn</p>
                          <p className="text-xl font-extrabold text-green-400 leading-none">₦{req.fee.toLocaleString()}</p>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setFeedOpen(false); setIncomingRequest(req as never) }}
                        className="flex-1 py-2.5 glass-light rounded-xl text-text-primary text-sm font-medium"
                      >
                        View
                      </button>
                      <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={() => acceptRequest(req as never)}
                        className="flex-[2] py-2.5 bg-accent-primary rounded-xl text-white font-bold text-sm glow-primary"
                      >
                        {typeof req.fee === 'number' ? `Accept · ₦${req.fee.toLocaleString()}` : 'Accept'}
                      </motion.button>
                    </div>
                  </div>
                ))}
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

          {activeJob.status === 'IN_TRANSIT' && (
            <PhotoCapture jobId={activeJob.id} onUploaded={() => setProofUploaded(true)} />
          )}

          {activeJob.status === 'COMPLETED' && !ratingSubmitted && (
            <div className="glass rounded-2xl p-4 space-y-3">
              <p className="text-sm font-medium">Rate the sender</p>
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
