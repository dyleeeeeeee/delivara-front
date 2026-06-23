import { useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuthStore } from '../stores/auth'
import { useUIStore } from '../stores/ui'
import Glass from './Glass'

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

  return (
    <Glass
      className="fixed bottom-4 left-4 right-4 px-2 py-2.5 flex items-center justify-around z-50"
      style={{ borderRadius: 28 }}
      refraction={0.02}
      bevelDepth={0.09}
      bevelWidth={0.14}
      specular
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
              active ? 'text-aqua' : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {active && (
              <motion.span
                layoutId="nav-active-pill"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                className="absolute inset-0 rounded-2xl"
                style={{
                  background: 'linear-gradient(120deg, rgba(124,92,255,0.28), rgba(34,224,240,0.22))',
                  boxShadow: 'inset 0 0 0 1px rgba(124,92,255,0.4), 0 0 20px rgba(124,92,255,0.3)',
                }}
              />
            )}
            <span className="relative text-lg">{item.icon}</span>
            <span className="relative text-[10px]">{item.label}</span>
          </button>
        )
      })}
    </Glass>
  )
}
