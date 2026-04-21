import { useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../stores/auth'
import { useUIStore } from '../stores/ui'

const VENDOR_ITEMS = [
  { path: '/vendor', label: 'Home', icon: '⬡' },
  { path: '/history', label: 'History', icon: '◷' },
  { path: '/ratings', label: 'Ratings', icon: '★' },
]

const RIDER_ITEMS = [
  { path: '/rider', label: 'Home', icon: '⬡' },
  { path: '/history', label: 'History', icon: '◷' },
  { path: '/ratings', label: 'Ratings', icon: '★' },
]

export default function GlassNavBar() {
  const navigate = useNavigate()
  const location = useLocation()
  const user = useAuthStore((s) => s.user)
  const toggleDrawer = useUIStore((s) => s.toggleDrawer)

  const items = user?.role === 'rider' ? RIDER_ITEMS : VENDOR_ITEMS

  return (
    <nav
      className="fixed bottom-4 left-4 right-4 rounded-2xl px-2 py-3 flex items-center justify-around z-50"
      style={{
        background: 'rgba(11, 15, 26, 0.45)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        border: '1px solid rgba(255,255,255,0.07)',
      }}
    >
      <button
        onClick={toggleDrawer}
        className="w-10 h-10 flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors"
      >
        ☰
      </button>
      {items.map((item) => (
        <button
          key={item.path}
          onClick={() => navigate(item.path)}
          className={`flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-all ${
            location.pathname === item.path
              ? 'text-accent-primary'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          <span className="text-lg">{item.icon}</span>
          <span className="text-[10px]">{item.label}</span>
        </button>
      ))}
    </nav>
  )
}
