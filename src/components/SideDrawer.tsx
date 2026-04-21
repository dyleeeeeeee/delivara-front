import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useUIStore } from '../stores/ui'
import { useAuthStore } from '../stores/auth'

const MENU_ITEMS = [
  { path: '/', label: 'Dashboard', icon: '⬡' },
  { path: '/settings', label: 'Settings', icon: '⚙' },
]

export default function SideDrawer() {
  const open = useUIStore((s) => s.drawerOpen)
  const toggle = useUIStore((s) => s.toggleDrawer)
  const logout = useAuthStore((s) => s.logout)
  const user = useAuthStore((s) => s.user)
  const navigate = useNavigate()

  const go = (path: string) => { navigate(path); toggle() }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40"
            onClick={toggle}
          />
          <motion.aside
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed left-0 top-0 bottom-0 w-[280px] glass z-50 flex flex-col p-6"
          >
            <div className="mb-8">
              <h2 className="text-xl font-bold text-accent-primary">Delivara</h2>
              {user && (
                <p className="text-xs text-text-secondary mt-1 capitalize">
                  {user.role} · {user.phone}
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

              {/* Coming soon items */}
              <div className="px-4 py-3 text-text-secondary/40 flex items-center gap-3">
                <span>💳</span>
                <span className="text-sm">Payments</span>
                <span className="text-[10px] ml-auto bg-white/10 px-2 py-0.5 rounded-full">Soon</span>
              </div>

              <div className="px-4 py-3 text-text-secondary/40 flex items-center gap-3">
                <span>🏪</span>
                <span className="text-sm">Become a Vendor</span>
                <span className="text-[10px] ml-auto bg-white/10 px-2 py-0.5 rounded-full">Soon</span>
              </div>

              <div className="px-4 py-3 text-text-secondary/40 flex items-center gap-3">
                <span>🏍️</span>
                <span className="text-sm">Become a Rider</span>
                <span className="text-[10px] ml-auto bg-white/10 px-2 py-0.5 rounded-full">Soon</span>
              </div>
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
  )
}
