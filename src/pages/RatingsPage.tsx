import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Glass from '../components/Glass'
import GlassNavBar from '../components/GlassNavBar'
import SideDrawer from '../components/SideDrawer'
import StarRating from '../components/StarRating'
import { api } from '../lib/api'
import { useAuthStore } from '../stores/auth'

interface RatingEntry {
  id: string
  score: number
  job_id: string
  review?: string
  created_at?: string
}

export default function RatingsPage() {
  const user = useAuthStore((s) => s.user)
  const [ratings, setRatings] = useState<RatingEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user) return

    // Riders use /api/riders/me which returns { rider, ratings }
    // Vendors don't have a dedicated ratings endpoint yet — show empty
    if (user.role === 'rider') {
      api<{ rider: unknown; ratings: RatingEntry[] }>('/api/riders/me')
        .then((data) => setRatings(data.ratings || []))
        .catch(() => setError('Failed to load ratings'))
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [user])

  const avg =
    ratings.length > 0
      ? ratings.reduce((s, r) => s + r.score, 0) / ratings.length
      : 0

  return (
    <div className="h-full bg-bg-primary overflow-y-auto pb-24">
      <div className="px-4 pt-12 pb-4">
        <h1 className="text-2xl font-bold text-holo tracking-tight">Ratings</h1>
        <p className="text-xs text-text-secondary mt-1">Your trust signal</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-iris border-t-transparent rounded-full animate-spin glow-primary" />
        </div>
      ) : error ? (
        <p className="text-center text-plasma text-sm py-12">{error}</p>
      ) : (
        <div className="px-4 space-y-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Glass className="rounded-2xl p-6 text-center glow-primary" specular shadow>
              <p className="text-6xl font-bold text-holo leading-none">{avg.toFixed(1)}</p>
              <div className="flex justify-center mt-3">
                <StarRating value={Math.round(avg)} readonly />
              </div>
              <p className="text-xs text-text-secondary mt-3 uppercase tracking-widest">
                {ratings.length} {ratings.length === 1 ? 'rating' : 'ratings'}
              </p>
            </Glass>
          </motion.div>

          {ratings.length > 0 && (
            <div className="space-y-2">
              {ratings.map((r, i) => (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="glass rounded-2xl p-4 border-l-2 border-iris/40"
                >
                  <div className="flex items-center justify-between mb-1">
                    <StarRating value={r.score} readonly />
                    <span className="text-[10px] text-aqua/70 font-mono tracking-tight">
                      {r.job_id?.replace('jobs:', '') || ''}
                    </span>
                  </div>
                  {r.review && (
                    <p className="text-xs text-text-secondary mt-1 leading-relaxed">{r.review}</p>
                  )}
                </motion.div>
              ))}
            </div>
          )}

          {ratings.length === 0 && (
            <p className="text-center text-text-secondary text-sm py-8 uppercase tracking-widest">No ratings yet</p>
          )}
        </div>
      )}

      <GlassNavBar />
      <SideDrawer />
    </div>
  )
}
