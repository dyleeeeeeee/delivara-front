import { create } from 'zustand'
import { api } from '../lib/api'

interface Job {
  id: string
  vendor_id: string
  rider_id?: string
  status: string
  pickup_address: string
  pickup_lat: number
  pickup_lng: number
  dropoff_address: string
  dropoff_lat: number
  dropoff_lng: number
  tracking_slug: string
  package_description?: string
}

interface JobsState {
  jobs: Job[]
  activeJob: Job | null
  incomingRequest: Job | null
  riderLocation: { lat: number; lng: number } | null
  loading: boolean
  error: string | null
  setActiveJob: (job: Job | null) => void
  setIncomingRequest: (job: Job | null) => void
  setRiderLocation: (loc: { lat: number; lng: number } | null) => void
  updateJobStatus: (jobId: string, status: string) => void
  fetchJobs: () => Promise<void>
  addJob: (job: Job) => void
}

export const useJobsStore = create<JobsState>((set) => ({
  jobs: [],
  activeJob: null,
  incomingRequest: null,
  riderLocation: null,
  loading: false,
  error: null,

  setActiveJob: (job) => set({ activeJob: job }),
  setIncomingRequest: (job) => set({ incomingRequest: job }),
  setRiderLocation: (loc) => set({ riderLocation: loc }),

  updateJobStatus: (jobId, status) => {
    set((s) => ({
      jobs: s.jobs.map((j) => (j.id === jobId ? { ...j, status } : j)),
      activeJob: s.activeJob?.id === jobId ? { ...s.activeJob, status } : s.activeJob,
    }))
  },

  fetchJobs: async () => {
    set({ loading: true, error: null })
    try {
      const jobs = await api<Job[]>('/api/jobs')
      set({ jobs, loading: false })
    } catch (err: unknown) {
      set({
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to load jobs',
      })
    }
  },

  addJob: (job) => set((s) => ({ jobs: [job, ...s.jobs] })),
}))
