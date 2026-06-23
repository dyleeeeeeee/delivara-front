import { useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuthStore } from '../stores/auth'
import { useUIStore } from '../stores/ui'

const VENDOR_ITEMS = [
  { path: '/vendor', label: 'Home', icon: '⬡' },
  { path: '/history', label: 'History', icon: '◷' },
]

const RIDER_ITEMS = [
  { path: '/rider', label: 'Home', icon: '⬡' },
  { path: '/history', label: 'History', icon: '◷' },
]

export default function GlassNavBar() {
  const navigate = useNavigate()
  const location = useLocation()
  const user = useAuthStore((s) => s.user)
  const toggleDrawer = useUIStore((s) => s.toggleDrawer)

  const items = user?.role === 'rider' ? RIDER_ITEMS : VENDOR_ITEMS

  const setSpot = (e: React.PointerEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    e.currentTarget.style.setProperty('--mx', `${((e.clientX - r.left) / r.width) * 100}%`)
    e.currentTarget.style.setProperty('--my', `${((e.clientY - r.top) / r.height) * 100}%`)
  }

  return (
    <nav
      onPointerMove={setSpot}
      className="liquid-glass lg-refract lg-interactive fixed bottom-4 left-4 right-4 rounded-[28px] px-2 py-2.5 flex items-center justify-around z-50"
    >
      <button
        onClick={toggleDrawer}
        className="w-10 h-10 flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors"
      >
        ☰
      </button>
      {items.map((item) => {
        const active = location.pathname === item.path
        return (
          <button
            key={item.path}
            onClick={() => {
              if (active) {
                window.dispatchEvent(new CustomEvent('snapToLocation'))
              } else {
                navigate(item.path)
              }
            }}
            className={`relative flex flex-col items-center gap-1 px-4 py-1.5 rounded-2xl transition-colors ${
              active ? 'text-accent-primary' : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {active && (
              <motion.span
                layoutId="nav-active-pill"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                className="absolute inset-0 rounded-2xl liquid-glass-light"
                style={{ boxShadow: 'inset 0 0 0 1px rgba(99,102,241,0.35), 0 0 18px rgba(99,102,241,0.25)' }}
              />
            )}
            <span className="relative text-lg">{item.icon}</span>
            <span className="relative text-[10px]">{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
