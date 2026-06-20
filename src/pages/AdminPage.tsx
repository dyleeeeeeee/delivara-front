import { useState, useEffect, useCallback } from 'react'

const BASE = import.meta.env.VITE_API_URL || 'https://api.delivra.ng'

interface Metrics {
  users_total: number
  vendors: number
  riders: number
  riders_online_now: number
  jobs_total: number
  jobs_accepted: number
  jobs_expired: number
  completed_this_week: number
  jobs_this_week: number
  signups_today: number
  signups_this_week: number
  jobs_by_status: Record<string, number>
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="glass rounded-xl p-4">
      <p className="text-[11px] uppercase tracking-wide text-text-secondary/60">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${accent || 'text-text-primary'}`}>{value}</p>
    </div>
  )
}

export default function AdminPage() {
  const [token, setToken] = useState(localStorage.getItem('delivra_admin_token') || '')
  const [input, setInput] = useState('')
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [error, setError] = useState('')

  const load = useCallback(async (t: string) => {
    try {
      const res = await fetch(`${BASE}/api/admin/metrics`, { headers: { 'X-Admin-Token': t } })
      if (!res.ok) {
        setError('Invalid token')
        setMetrics(null)
        return
      }
      setError('')
      setMetrics(await res.json())
    } catch {
      setError('Failed to load metrics')
    }
  }, [])

  useEffect(() => {
    if (!token) return
    load(token)
    const id = setInterval(() => load(token), 20000)
    return () => clearInterval(id)
  }, [token, load])

  if (!token || error) {
    return (
      <div className="h-full flex items-center justify-center bg-bg-primary px-6">
        <div className="glass rounded-2xl p-6 w-full max-w-sm space-y-3">
          <h1 className="text-lg font-bold">Delivra Admin</h1>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <input
            type="password"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Admin token"
            className="w-full px-4 py-3 glass-light rounded-xl text-sm text-text-primary outline-none"
          />
          <button
            onClick={() => {
              localStorage.setItem('delivra_admin_token', input)
              setToken(input)
              setError('')
            }}
            className="w-full py-3 bg-accent-primary rounded-xl text-white text-sm font-medium"
          >
            View metrics
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full bg-bg-primary overflow-y-auto p-4 pb-12">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">Delivra Metrics</h1>
        <button
          onClick={() => load(token)}
          className="text-xs glass px-3 py-1.5 rounded-lg text-text-secondary"
        >
          Refresh
        </button>
      </div>

      {!metrics ? (
        <p className="text-text-secondary text-sm">Loading…</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Riders online now" value={metrics.riders_online_now}
                  accent={metrics.riders_online_now > 0 ? 'text-green-400' : 'text-yellow-400'} />
            <Stat label="Completed / week" value={metrics.completed_this_week} accent="text-accent-secondary" />
            <Stat label="Jobs accepted" value={metrics.jobs_accepted} accent="text-green-400" />
            <Stat label="Jobs expired" value={metrics.jobs_expired}
                  accent={metrics.jobs_expired > 0 ? 'text-red-400' : 'text-text-primary'} />
            <Stat label="Signups today" value={metrics.signups_today} />
            <Stat label="Signups / week" value={metrics.signups_this_week} />
            <Stat label="Vendors" value={metrics.vendors} />
            <Stat label="Riders" value={metrics.riders} />
            <Stat label="Jobs / week" value={metrics.jobs_this_week} />
            <Stat label="Jobs total" value={metrics.jobs_total} />
          </div>

          <div className="glass rounded-xl p-4 mt-3">
            <p className="text-[11px] uppercase tracking-wide text-text-secondary/60 mb-2">Jobs by status</p>
            {Object.keys(metrics.jobs_by_status).length === 0 ? (
              <p className="text-xs text-text-secondary/50">No jobs yet</p>
            ) : (
              <div className="space-y-1">
                {Object.entries(metrics.jobs_by_status).map(([s, c]) => (
                  <div key={s} className="flex justify-between text-sm">
                    <span className="text-text-secondary">{s}</span>
                    <span className="font-medium">{c}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
