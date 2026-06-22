import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore, type RiderApplication } from '../stores/auth'
import { useToast } from './Toast'

/**
 * Rider application sheet. Becoming a rider is vetted, so instead of an instant
 * switch this collects name + phone and submits an application for admin review.
 * If an application already exists it shows its current status.
 */
export default function RiderApplicationModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const user = useAuthStore((s) => s.user)
  const applyForRider = useAuthStore((s) => s.applyForRider)
  const getRiderApplication = useAuthStore((s) => s.getRiderApplication)
  const toast = useToast()

  const [fullName, setFullName] = useState(user?.name || '')
  const [phone, setPhone] = useState(user?.phone || '')
  const [submitting, setSubmitting] = useState(false)
  const [existing, setExisting] = useState<RiderApplication | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!open) return
    setLoaded(false)
    getRiderApplication()
      .then((a) => setExisting(a))
      .catch(() => setExisting(null))
      .finally(() => setLoaded(true))
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async () => {
    if (!fullName.trim() || !phone.trim()) {
      toast.show('Enter your name and phone', 'error')
      return
    }
    setSubmitting(true)
    try {
      await applyForRider(fullName.trim(), phone.trim())
      toast.show('Application submitted — we’ll review it shortly', 'success')
      onClose()
    } catch (e: unknown) {
      toast.show(e instanceof Error ? e.message : 'Could not submit', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const pending = existing?.status === 'pending'
  const rejected = existing?.status === 'rejected'

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 z-[55] cursor-pointer"
          />
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 220 }}
            className="fixed bottom-0 left-0 right-0 z-[60] glass rounded-t-3xl flex flex-col"
            style={{ maxHeight: '85vh', boxShadow: '0 -8px 40px rgba(0,0,0,0.5)' }}
          >
            <div className="flex justify-center pt-3 pb-2"><div className="w-10 h-1 bg-white/20 rounded-full" /></div>
            <div className="px-5 pb-3 border-b border-white/5">
              <h3 className="font-bold text-base">Become a rider</h3>
              <p className="text-xs text-text-secondary">Earn by delivering for senders near you.</p>
            </div>

            <div className="overflow-y-auto flex-1 px-5 py-4 space-y-3" style={{ WebkitOverflowScrolling: 'touch' }}>
              {!loaded ? (
                <p className="text-sm text-text-secondary text-center py-6">Loading…</p>
              ) : pending ? (
                <div className="glass-light rounded-2xl p-4 text-center space-y-1">
                  <div className="text-2xl">⏳</div>
                  <p className="text-sm font-medium">Application under review</p>
                  <p className="text-xs text-text-secondary">We’ll notify you once you’re approved.</p>
                </div>
              ) : (
                <>
                  {rejected && (
                    <div className="glass-light rounded-xl p-3 border border-red-500/30">
                      <p className="text-xs text-red-400">Previous application was declined{existing?.reject_reason ? `: ${existing.reject_reason}` : ''}. You can re-apply below.</p>
                    </div>
                  )}
                  <div>
                    <label className="text-[11px] uppercase tracking-wide text-text-secondary/60">Full name</label>
                    <input
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Your full name"
                      className="w-full mt-1 px-4 py-3 glass-light rounded-xl text-sm text-text-primary outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] uppercase tracking-wide text-text-secondary/60">Phone</label>
                    <input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      inputMode="tel"
                      placeholder="080…"
                      className="w-full mt-1 px-4 py-3 glass-light rounded-xl text-sm text-text-primary outline-none"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="px-5 pt-3 border-t border-white/5" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
              {pending ? (
                <button onClick={onClose} className="w-full py-3 glass-light rounded-xl text-text-secondary text-sm font-medium">Close</button>
              ) : (
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={submit}
                  disabled={submitting || !loaded}
                  className="w-full py-3.5 bg-accent-primary rounded-xl text-white font-bold glow-primary disabled:opacity-50"
                >
                  {submitting ? 'Submitting…' : 'Submit application'}
                </motion.button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
