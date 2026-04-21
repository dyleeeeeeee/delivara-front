import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import GlassNavBar from '../components/GlassNavBar'
import SideDrawer from '../components/SideDrawer'
import StatusChip from '../components/StatusChip'
import { api } from '../lib/api'

interface HistoryJob {
  id: string
  status: string
  pickup_address: string
  dropoff_address: string
  tracking_slug: string
  created_at?: string
}

export default function HistoryPage() {
  const [jobs, setJobs] = useState<HistoryJob[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = () => {
    setLoading(true)
    setError('')
    api<HistoryJob[]>('/api/jobs')
      .then((data) => setJobs(Array.isArray(data) ? data : []))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Failed to load history'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const completed = jobs.filter((j) => j.status === 'COMPLETED')
  const active = jobs.filter((j) => j.status !== 'COMPLETED')

  const JobRow = ({ job, i, dim }: { job: HistoryJob; i: number; dim?: boolean }) => (
    <motion.div
      key={job.id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.04 }}
      className={`glass rounded-xl p-4 ${dim ? 'opacity-60' : ''}`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-mono text-text-secondary/50">{job.tracking_slug}</span>
        <StatusChip status={job.status} />
      </div>
      <div className="flex items-start gap-2 mb-1">
        <span className="text-accent-primary text-xs mt-0.5 flex-shrink-0">●</span>
        <p className="text-sm truncate">{job.pickup_address}</p>
      </div>
      <div className="flex items-start gap-2">
        <span className="text-cyan-400 text-xs mt-0.5 flex-shrink-0">●</span>
        <p className="text-xs text-text-secondary truncate">{job.dropoff_address}</p>
      </div>
    </motion.div>
  )

  return (
    <div className="h-full bg-bg-primary overflow-y-auto pb-24">
      <div className="px-4 pt-12 pb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">Delivery History</h1>
        {error && (
          <button onClick={load} className="text-xs text-accent-primary">
            Retry
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="w-8 h-8 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-text-secondary">Loading deliveries...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 px-6">
          <span className="text-3xl">⚠️</span>
          <p className="text-sm text-red-400 text-center">{error}</p>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={load}
            className="mt-2 px-6 py-2.5 bg-accent-primary/20 border border-accent-primary/30 rounded-xl text-accent-primary text-sm"
          >
            Try again
          </motion.button>
        </div>
      ) : (
        <div className="px-4 space-y-6">
          {active.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold text-text-secondary/60 uppercase tracking-wide mb-3">
                Active · {active.length}
              </h2>
              <div className="space-y-2">
                {active.map((job, i) => <JobRow key={job.id} job={job} i={i} />)}
              </div>
            </div>
          )}

          {completed.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold text-text-secondary/60 uppercase tracking-wide mb-3">
                Completed · {completed.length}
              </h2>
              <div className="space-y-2">
                {completed.map((job, i) => <JobRow key={job.id} job={job} i={i} dim />)}
              </div>
            </div>
          )}

          {jobs.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 gap-2">
              <span className="text-4xl">📭</span>
              <p className="text-text-secondary text-sm mt-2">No deliveries yet</p>
            </div>
          )}
        </div>
      )}

      <GlassNavBar />
      <SideDrawer />
    </div>
  )
}
