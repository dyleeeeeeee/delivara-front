import { useEffect, useState } from 'react'
import type { Map as MapboxMap } from 'mapbox-gl'
import Map from '../components/Map'
import GlassNavBar from '../components/GlassNavBar'
import SideDrawer from '../components/SideDrawer'
import JobSheet from '../components/JobSheet'
import JobCard from '../components/JobCard'
import RiderMarker from '../components/RiderMarker'
import StatusChip from '../components/StatusChip'
import Toast from '../components/Toast'
import { useWSStore } from '../stores/ws'
import { useJobsStore } from '../stores/jobs'
import { motion, AnimatePresence } from 'framer-motion'

export default function VendorDashboard() {
  const [mapInstance, setMapInstance] = useState<MapboxMap | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [cameraFollow, setCameraFollow] = useState(true)
  const { connect, disconnect, on } = useWSStore()
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
        addJob(data as never)
      }),

      on('JOB_ACCEPTED', (data) => {
        const d = data as { job_id: string; status: string; rider_id: string }
        updateJobStatus(d.job_id, d.status)
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

  const activeJobs = jobs.filter((j) => j.status !== 'COMPLETED')

  return (
    <div className="relative h-full w-full">
      <Map onMapReady={setMapInstance} />

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
        <div className="absolute top-4 left-4 right-4 z-10">
          <div className="glass rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Active Delivery</span>
              <div className="flex items-center gap-2">
                <StatusChip status={activeJob.status} />
                {/* Camera follow toggle */}
                {riderLocation && (
                  <button
                    onClick={() => setCameraFollow((v) => !v)}
                    className={`text-xs px-2 py-1 rounded-lg transition-all ${
                      cameraFollow
                        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                        : 'glass-light text-text-secondary'
                    }`}
                  >
                    {cameraFollow ? '🎯 Following' : '📍 Follow'}
                  </button>
                )}
              </div>
            </div>
            <p className="text-xs text-text-secondary truncate">{activeJob.dropoff_address}</p>
            <p className="text-[10px] text-text-secondary/60 mt-1 font-mono select-all">
              {location.origin}/track/{activeJob.tracking_slug}
            </p>
          </div>
        </div>
      )}

      {/* No active job — show job list */}
      <AnimatePresence>
        {!activeJob && activeJobs.length > 0 && (
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
        <div className="absolute top-4 left-4 right-4 z-10">
          <div className="glass rounded-xl px-4 py-3 flex items-center gap-2">
            <motion.span
              className="w-2 h-2 rounded-full bg-cyan-400"
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            />
            <span className="text-xs text-text-secondary">Rider location streaming</span>
          </div>
        </div>
      )}

      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => setSheetOpen(true)}
        className="fixed bottom-24 right-4 w-14 h-14 bg-accent-primary rounded-full flex items-center justify-center text-2xl text-white glow-primary z-20"
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
