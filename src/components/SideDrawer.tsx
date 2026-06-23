import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useUIStore } from '../stores/ui'
import { useAuthStore } from '../stores/auth'
import { useToast } from './Toast'
import RiderApplicationModal from './RiderApplicationModal'

const MENU_ITEMS = [
  { path: '/', label: 'Dashboard', icon: '⬡' },
  { path: '/wallet', label: 'Wallet', icon: '💳' },
  { path: '/ratings', label: 'Ratings & Reviews', icon: '★' },
  { path: '/settings', label: 'Settings', icon: '⚙' },
]

export default function SideDrawer() {
  const open = useUIStore((s) => s.drawerOpen)
  const toggle = useUIStore((s) => s.toggleDrawer)
  const logout = useAuthStore((s) => s.logout)
  const user = useAuthStore((s) => s.user)
  const switchRole = useAuthStore((s) => s.switchRole)
  const navigate = useNavigate()
  const toast = useToast()
  const [switching, setSwitching] = useState(false)
  const [applyOpen, setApplyOpen] = useState(false)

  const go = (path: string) => { navigate(path); toggle() }

  // The other experience the user can switch into.
  const otherRole = user?.role === 'rider' ? 'vendor' : 'rider'
  const allowedRoles = user?.roles || (user?.role ? [user.role] : [])
  const isApprovedRider = allowedRoles.includes('rider')
  // Sending is open to all; becoming a rider needs an approved application.
  const otherLabel = otherRole === 'vendor' ? 'Switch to Sender' : (isApprovedRider ? 'Switch to Rider' : 'Become a rider')
  const otherIcon = otherRole === 'rider' ? '🏍️' : '📦'

  const handleSwitch = async () => {
    if (switching) return
    // Not an approved rider yet → open the application instead of switching.
    if (otherRole === 'rider' && !isApprovedRider) {
      setApplyOpen(true)
      return
    }
    setSwitching(true)
    try {
      await switchRole(otherRole)
      navigate(otherRole === 'rider' ? '/rider' : '/vendor')
      toggle()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not switch'
      if (msg.includes('rider_application_required')) {
        setApplyOpen(true)
      } else {
        toast.show(msg, 'error')
      }
    } finally {
      setSwitching(false)
    }
  }

  return (
    <>
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-[55]"
            onClick={toggle}
          />
          <motion.aside
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed left-0 top-0 bottom-0 w-[280px] glass z-[60] flex flex-col p-6"
          >
            <div className="mb-8">
              <h2 className="text-xl font-bold text-accent-primary">Delivra</h2>
              {user && (
                <p className="text-xs text-text-secondary mt-1">
                  {user.role === 'rider' ? 'Rider' : 'Sender'} · {user.phone || user.email}
                </p>
              )}
            </div>

            <div className="flex-1 flex flex-col gap-1">
              {MENU_ITEMS.map((item) => (
                <button
                  key={item.path}
                  onClick={() => go(item.path)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-text-secondary hover:text-text-primary hover:bg-white/5 transition-all text-left"
                >
                  <span>{item.icon}</span>
                  <span className="text-sm">{item.label}</span>
                </button>
              ))}

              {/* Divider */}
              <div className="my-2 border-t border-white/5" />

              {/* Switch experience — any user can be both a sender and a rider. */}
              <button
                onClick={handleSwitch}
                disabled={switching}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-text-secondary hover:text-text-primary hover:bg-white/5 transition-all text-left disabled:opacity-50"
              >
                <span>{otherIcon}</span>
                <span className="text-sm">{switching ? 'Switching…' : otherLabel}</span>
              </button>
            </div>

            <button
              onClick={() => { logout(); navigate('/login'); toggle() }}
              className="px-4 py-3 rounded-xl text-red-400 hover:bg-red-400/10 transition-all text-left text-sm"
            >
              Logout
            </button>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
    <RiderApplicationModal open={applyOpen} onClose={() => setApplyOpen(false)} />
    </>
  )
}
