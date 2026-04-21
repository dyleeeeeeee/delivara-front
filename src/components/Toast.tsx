import { motion, AnimatePresence } from 'framer-motion'
import { create } from 'zustand'

interface ToastState {
  message: string | null
  type: 'success' | 'error' | 'info'
  show: (message: string, type?: 'success' | 'error' | 'info') => void
  hide: () => void
}

export const useToast = create<ToastState>((set) => ({
  message: null,
  type: 'info',
  show: (message, type = 'info') => {
    set({ message, type })
    setTimeout(() => set({ message: null }), 3000)
  },
  hide: () => set({ message: null }),
}))

const COLORS = {
  success: 'border-green-500/30',
  error: 'border-red-500/30',
  info: 'border-accent-primary/30',
}

export default function Toast() {
  const { message, type } = useToast()

  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -60, opacity: 0 }}
          className={`fixed top-4 left-4 right-4 glass rounded-xl px-4 py-3 z-[100] ${COLORS[type]}`}
        >
          <p className="text-sm text-text-primary text-center">{message}</p>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
