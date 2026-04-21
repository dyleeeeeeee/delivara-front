import { motion } from 'framer-motion'

const STATUS_COLORS: Record<string, string> = {
  CREATED: 'bg-gray-500',
  BROADCASTING: 'bg-yellow-500',
  ASSIGNED: 'bg-blue-500',
  PICKED_UP: 'bg-indigo-500',
  IN_TRANSIT: 'bg-accent-secondary',
  DELIVERED: 'bg-green-500',
  COMPLETED: 'bg-green-600',
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
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium text-white ${color}`}
    >
      {pulse && (
        <motion.span
          className="w-2 h-2 rounded-full bg-white"
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
        />
      )}
      {label}
    </motion.div>
  )
}
