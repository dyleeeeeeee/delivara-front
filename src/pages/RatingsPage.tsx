import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
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
        <h1 className="text-xl font-bold">Ratings</h1>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : error ? (
        <p className="text-center text-red-400 text-sm py-12">{error}</p>
      ) : (
        <div className="px-4 space-y-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass rounded-xl p-6 text-center"
          >
            <p className="text-4xl font-bold">{avg.toFixed(1)}</p>
            <div className="flex justify-center mt-2">
              <StarRating value={Math.round(avg)} readonly />
            </div>
            <p className="text-xs text-text-secondary mt-2">
              {ratings.length} {ratings.length === 1 ? 'rating' : 'ratings'}
            </p>
          </motion.div>

          {ratings.length > 0 && (
            <div className="space-y-2">
              {ratings.map((r, i) => (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="glass rounded-xl p-4"
                >
                  <div className="flex items-center justify-between mb-1">
                    <StarRating value={r.score} readonly />
                    <span className="text-xs text-text-secondary/60 font-mono">
                      {r.job_id?.replace('jobs:', '') || ''}
                    </span>
                  </div>
                  {r.review && (
                    <p className="text-xs text-text-secondary mt-1">{r.review}</p>
                  )}
                </motion.div>
              ))}
            </div>
          )}

          {ratings.length === 0 && (
            <p className="text-center text-text-secondary text-sm py-8">No ratings yet</p>
          )}
        </div>
      )}

      <GlassNavBar />
      <SideDrawer />
    </div>
  )
}
