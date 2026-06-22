import { useState, useEffect, useCallback } from 'react'

const BASE = import.meta.env.VITE_API_URL || 'https://api.delivra.ng'

// ── shared admin fetch ──
function useAdmin(token: string) {
  return useCallback(
    async <T,>(path: string, opts: RequestInit = {}): Promise<T> => {
      const res = await fetch(`${BASE}${path}`, {
        ...opts,
        headers: { 'X-Admin-Token': token, 'Content-Type': 'application/json', ...(opts.headers || {}) },
      })
      const text = await res.text()
      const data = text ? JSON.parse(text) : {}
      if (!res.ok) throw new Error(data.error || 'Request failed')
      return data as T
    },
    [token],
  )
}

const bare = (id: string) => id.split(':').slice(1).join(':') || id

// ── Overview tab ──
interface Metrics {
  users_total: number; vendors: number; riders: number; riders_online_now: number
  jobs_total: number; jobs_accepted: number; jobs_expired: number; completed_this_week: number
  jobs_this_week: number; signups_today: number; signups_this_week: number
  jobs_by_status: Record<string, number>
}
interface Payout { id: string; amount: number; bank_name: string; account_number: string; account_name: string }

function Stat({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="glass rounded-xl p-4">
      <p className="text-[11px] uppercase tracking-wide text-text-secondary/60">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${accent || 'text-text-primary'}`}>{value}</p>
    </div>
  )
}

function Overview({ token }: { token: string }) {
  const adminFetch = useAdmin(token)
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [payouts, setPayouts] = useState<Payout[]>([])

  const load = useCallback(() => {
    adminFetch<Metrics>('/api/admin/metrics').then(setMetrics).catch(() => {})
    adminFetch<{ pending: Payout[] }>('/api/admin/payouts').then((d) => setPayouts(d.pending || [])).catch(() => {})
  }, [adminFetch])

  useEffect(() => {
    load()
    const id = setInterval(load, 20000)
    return () => clearInterval(id)
  }, [load])

  const markPaid = async (id: string) => {
    await adminFetch(`/api/admin/payouts/${bare(id)}/mark-paid`, { method: 'POST' })
    load()
  }

  if (!metrics) return <p className="text-text-secondary text-sm">Loading…</p>
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <Stat label="Riders online now" value={metrics.riders_online_now} accent={metrics.riders_online_now > 0 ? 'text-green-400' : 'text-yellow-400'} />
        <Stat label="Completed / week" value={metrics.completed_this_week} accent="text-accent-secondary" />
        <Stat label="Jobs accepted" value={metrics.jobs_accepted} accent="text-green-400" />
        <Stat label="Jobs expired" value={metrics.jobs_expired} accent={metrics.jobs_expired > 0 ? 'text-red-400' : 'text-text-primary'} />
        <Stat label="Signups today" value={metrics.signups_today} />
        <Stat label="Signups / week" value={metrics.signups_this_week} />
        <Stat label="Senders" value={metrics.vendors} />
        <Stat label="Riders" value={metrics.riders} />
        <Stat label="Jobs / week" value={metrics.jobs_this_week} />
        <Stat label="Jobs total" value={metrics.jobs_total} />
      </div>
      <div className="glass rounded-xl p-4 mt-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] uppercase tracking-wide text-text-secondary/60">Pending payouts</p>
          {payouts.length > 0 && <span className="text-xs text-yellow-400">{payouts.length}</span>}
        </div>
        {payouts.length === 0 ? <p className="text-xs text-text-secondary/50">No pending payouts</p> : (
          <div className="space-y-2">
            {payouts.map((p) => (
              <div key={p.id} className="glass-light rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-green-400">₦{p.amount.toLocaleString()}</span>
                  <button onClick={() => markPaid(p.id)} className="text-xs px-3 py-1.5 bg-green-500/20 border border-green-500/30 rounded-lg text-green-400">Mark paid</button>
                </div>
                <p className="text-xs text-text-secondary mt-1">{p.account_name} · {p.bank_name}</p>
                <p className="text-[11px] text-text-secondary/60 font-mono">{p.account_number}</p>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="glass rounded-xl p-4 mt-3">
        <p className="text-[11px] uppercase tracking-wide text-text-secondary/60 mb-2">Jobs by status</p>
        {Object.entries(metrics.jobs_by_status).map(([s, c]) => (
          <div key={s} className="flex justify-between text-sm"><span className="text-text-secondary">{s}</span><span className="font-medium">{c}</span></div>
        ))}
      </div>
    </>
  )
}

// ── Rider applications tab ──
interface RiderApp { id: string; full_name: string; phone: string; email?: string; note?: string; status: string }

function Applications({ token }: { token: string }) {
  const adminFetch = useAdmin(token)
  const [apps, setApps] = useState<RiderApp[]>([])
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(() => {
    adminFetch<{ applications: RiderApp[] }>('/api/admin/rider-applications?status=pending')
      .then((d) => setApps(d.applications || [])).catch(() => {})
  }, [adminFetch])
  useEffect(() => { load() }, [load])

  const act = async (id: string, action: 'approve' | 'reject') => {
    setBusy(id)
    try {
      let body: string | undefined
      if (action === 'reject') {
        const reason = prompt('Reason for rejection (optional):') || ''
        body = JSON.stringify({ reason })
      }
      await adminFetch(`/api/admin/rider-applications/${bare(id)}/${action}`, { method: 'POST', body })
      setApps((a) => a.filter((x) => x.id !== id))
    } catch { /* ignore */ } finally { setBusy(null) }
  }

  if (apps.length === 0) return <p className="text-text-secondary text-sm">No pending applications.</p>
  return (
    <div className="space-y-3">
      {apps.map((a) => (
        <div key={a.id} className="glass rounded-xl p-4 space-y-2">
          <div>
            <p className="text-sm font-semibold">{a.full_name}</p>
            <p className="text-xs text-text-secondary">{a.phone}{a.email ? ` · ${a.email}` : ''}</p>
            {a.note && <p className="text-xs text-text-secondary/70 mt-1">{a.note}</p>}
          </div>
          <div className="flex gap-2">
            <button disabled={busy === a.id} onClick={() => act(a.id, 'approve')} className="flex-1 py-2 bg-green-500/20 border border-green-500/30 rounded-lg text-green-400 text-sm font-medium disabled:opacity-50">Approve</button>
            <button disabled={busy === a.id} onClick={() => act(a.id, 'reject')} className="flex-1 py-2 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm font-medium disabled:opacity-50">Reject</button>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Users tab ──
interface AdminUser { id: string; name?: string; phone?: string; email?: string; role: string; roles?: string[]; suspended?: boolean }

function Users({ token }: { token: string }) {
  const adminFetch = useAdmin(token)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [total, setTotal] = useState(0)
  const [q, setQ] = useState('')

  const load = useCallback((query: string) => {
    adminFetch<{ users: AdminUser[]; total: number }>(`/api/admin/users?q=${encodeURIComponent(query)}`)
      .then((d) => { setUsers(d.users || []); setTotal(d.total || 0) }).catch(() => {})
  }, [adminFetch])
  useEffect(() => { load('') }, [load])

  const suspend = async (u: AdminUser) => {
    await adminFetch(`/api/admin/users/${bare(u.id)}/suspend`, { method: 'POST', body: JSON.stringify({ suspended: !u.suspended }) })
    setUsers((us) => us.map((x) => (x.id === u.id ? { ...x, suspended: !x.suspended } : x)))
  }
  const revoke = async (u: AdminUser) => {
    if (!confirm(`Revoke rider role from ${u.name || u.phone}?`)) return
    await adminFetch(`/api/admin/riders/${bare(u.id)}/revoke`, { method: 'POST' })
    load(q)
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && load(q)} placeholder="Search name / phone / email" className="flex-1 px-4 py-2.5 glass-light rounded-xl text-sm outline-none" />
        <button onClick={() => load(q)} className="px-4 py-2.5 bg-accent-primary rounded-xl text-white text-sm">Search</button>
      </div>
      <p className="text-[11px] text-text-secondary/60">{total} users</p>
      {users.map((u) => {
        const roles = u.roles && u.roles.length ? u.roles : [u.role]
        return (
          <div key={u.id} className="glass rounded-xl p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{u.name || '—'} {u.suspended && <span className="text-[10px] text-red-400">(suspended)</span>}</p>
                <p className="text-xs text-text-secondary truncate">{u.phone || u.email || '—'}</p>
                <p className="text-[10px] text-text-secondary/60 mt-0.5">{roles.join(' · ')}</p>
              </div>
              <div className="flex flex-col gap-1 shrink-0">
                <button onClick={() => suspend(u)} className={`text-[11px] px-2 py-1 rounded-lg border ${u.suspended ? 'text-green-400 border-green-500/30' : 'text-red-400 border-red-500/30'}`}>{u.suspended ? 'Unsuspend' : 'Suspend'}</button>
                {roles.includes('rider') && <button onClick={() => revoke(u)} className="text-[11px] px-2 py-1 rounded-lg border border-yellow-500/30 text-yellow-400">Revoke rider</button>}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Riders tab ──
interface AdminRider { id: string; user_id: string; name?: string; phone?: string; is_online?: boolean; trust_score?: number; completed_count?: number; suspended?: boolean }

function Riders({ token }: { token: string }) {
  const adminFetch = useAdmin(token)
  const [riders, setRiders] = useState<AdminRider[]>([])

  const load = useCallback(() => {
    adminFetch<{ riders: AdminRider[] }>('/api/admin/riders').then((d) => setRiders(d.riders || [])).catch(() => {})
  }, [adminFetch])
  useEffect(() => { load() }, [load])

  const revoke = async (r: AdminRider) => {
    if (!confirm(`Revoke rider role from ${r.name || r.phone}?`)) return
    await adminFetch(`/api/admin/riders/${bare(String(r.user_id))}/revoke`, { method: 'POST' })
    load()
  }

  if (riders.length === 0) return <p className="text-text-secondary text-sm">No riders yet.</p>
  return (
    <div className="space-y-2">
      {riders.map((r) => (
        <div key={r.id} className="glass rounded-xl p-3 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{r.name || '—'} {r.is_online && <span className="text-[10px] text-green-400">● online</span>}</p>
            <p className="text-xs text-text-secondary truncate">{r.phone || '—'}</p>
            <p className="text-[10px] text-text-secondary/60">⭐ {(r.trust_score ?? 5).toFixed(1)} · {r.completed_count ?? 0} done</p>
          </div>
          <button onClick={() => revoke(r)} className="text-[11px] px-2 py-1 rounded-lg border border-yellow-500/30 text-yellow-400 shrink-0">Revoke</button>
        </div>
      ))}
    </div>
  )
}

// ── Jobs tab ──
interface AdminJob { id: string; status: string; pickup_address: string; dropoff_address: string; fee?: number; tracking_slug: string }
const JOB_STATUSES = ['', 'CREATED', 'BROADCASTING', 'ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'COMPLETED', 'EXPIRED']

function Jobs({ token }: { token: string }) {
  const adminFetch = useAdmin(token)
  const [jobs, setJobs] = useState<AdminJob[]>([])
  const [status, setStatus] = useState('')

  const load = useCallback((s: string) => {
    adminFetch<{ jobs: AdminJob[] }>(`/api/admin/jobs${s ? `?status=${s}` : ''}`).then((d) => setJobs(d.jobs || [])).catch(() => {})
  }, [adminFetch])
  useEffect(() => { load(status) }, [load, status])

  return (
    <div className="space-y-3">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {JOB_STATUSES.map((s) => (
          <button key={s || 'all'} onClick={() => setStatus(s)} className={`text-[11px] px-3 py-1.5 rounded-lg whitespace-nowrap ${status === s ? 'bg-accent-primary text-white' : 'glass-light text-text-secondary'}`}>{s || 'All'}</button>
        ))}
      </div>
      {jobs.length === 0 ? <p className="text-text-secondary text-sm">No jobs.</p> : jobs.map((j) => (
        <div key={j.id} className="glass rounded-xl p-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wide text-accent-secondary">{j.status}</span>
            {typeof j.fee === 'number' && <span className="text-sm font-bold text-green-400">₦{j.fee.toLocaleString()}</span>}
          </div>
          <p className="text-sm truncate mt-1">{j.pickup_address}</p>
          <p className="text-xs text-text-secondary truncate">→ {j.dropoff_address}</p>
          <a href={`/track/${j.tracking_slug}`} target="_blank" rel="noreferrer" className="text-[11px] text-accent-primary">Track →</a>
        </div>
      ))}
    </div>
  )
}

// ── Shell ──
const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'applications', label: 'Applications' },
  { key: 'users', label: 'Users' },
  { key: 'riders', label: 'Riders' },
  { key: 'jobs', label: 'Jobs' },
] as const

export default function AdminPage() {
  const [token, setToken] = useState(localStorage.getItem('delivra_admin_token') || '')
  const [input, setInput] = useState('')
  const [valid, setValid] = useState<boolean | null>(null)
  const [tab, setTab] = useState<(typeof TABS)[number]['key']>('overview')

  // Validate the token once against metrics.
  useEffect(() => {
    if (!token) { setValid(false); return }
    fetch(`${BASE}/api/admin/metrics`, { headers: { 'X-Admin-Token': token } })
      .then((r) => setValid(r.ok)).catch(() => setValid(false))
  }, [token])

  if (!token || valid === false) {
    return (
      <div className="h-full flex items-center justify-center bg-bg-primary px-6">
        <div className="glass rounded-2xl p-6 w-full max-w-sm space-y-3">
          <h1 className="text-lg font-bold">Delivra Admin</h1>
          {valid === false && token && <p className="text-xs text-red-400">Invalid token</p>}
          <input type="password" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Admin token" className="w-full px-4 py-3 glass-light rounded-xl text-sm text-text-primary outline-none" />
          <button onClick={() => { localStorage.setItem('delivra_admin_token', input); setToken(input); setValid(null) }} className="w-full py-3 bg-accent-primary rounded-xl text-white text-sm font-medium">Sign in</button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full bg-bg-primary overflow-y-auto">
      <div className="sticky top-0 z-10 bg-bg-primary/90 backdrop-blur px-4 pt-4 pb-2 border-b border-white/5">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-bold">Delivra Admin</h1>
          <button onClick={() => { localStorage.removeItem('delivra_admin_token'); setToken(''); setValid(false) }} className="text-xs glass px-3 py-1.5 rounded-lg text-text-secondary">Sign out</button>
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {TABS.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)} className={`text-sm px-3 py-1.5 rounded-lg whitespace-nowrap ${tab === t.key ? 'bg-accent-primary text-white' : 'glass-light text-text-secondary'}`}>{t.label}</button>
          ))}
        </div>
      </div>
      <div className="p-4 pb-12">
        {tab === 'overview' && <Overview token={token} />}
        {tab === 'applications' && <Applications token={token} />}
        {tab === 'users' && <Users token={token} />}
        {tab === 'riders' && <Riders token={token} />}
        {tab === 'jobs' && <Jobs token={token} />}
      </div>
    </div>
  )
}
