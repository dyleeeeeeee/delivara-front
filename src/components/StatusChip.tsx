import { motion } from 'framer-motion'

const STATUS_COLORS: Record<string, string> = {
  CREATED: 'bg-white/10 text-text-secondary',
  BROADCASTING: 'bg-plasma/20 text-plasma',
  ASSIGNED: 'bg-aqua/20 text-aqua',
  PICKED_UP: 'bg-iris/20 text-iris',
  IN_TRANSIT: 'bg-iris/25 text-iris glow-primary',
  DELIVERED: 'bg-lime/20 text-lime',
  COMPLETED: 'bg-lime/25 text-lime glow-accent',
}

const STATUS_LABELS: Record<string, string> = {
  CREATED: 'Created',
  BROADCASTING: 'Broadcasting',
  ASSIGNED: 'Assigned',
  PICKED_UP: 'Picked Up',
  IN_TRANSIT: 'In Transit',
  DELIVERED: 'Delivered',
  COMPLETED: 'Completed',
}

export default function StatusChip({ status }: { status: string }) {
  const color = STATUS_COLORS[status] ?? 'bg-gray-500'
  const label = STATUS_LABELS[status] ?? status.replace(/_/g, ' ')
  const pulse = status === 'IN_TRANSIT' || status === 'BROADCASTING'

  return (
    <motion.div
      layout
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border border-current/20 ${color}`}
    >
      {pulse && (
        <motion.span
          className="w-2 h-2 rounded-full bg-current"
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
        />
      )}
      {label}
    </motion.div>
  )
}
