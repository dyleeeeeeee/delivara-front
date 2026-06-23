import StatusChip from './StatusChip'

interface JobCardProps {
  job: {
    id: string
    status: string
    pickup_address: string
    dropoff_address: string
    tracking_slug: string
    package_description?: string
    fee?: number
  }
  onClick?: () => void
}

export default function JobCard({ job, onClick }: JobCardProps) {
  return (
    <button
      onClick={onClick}
      className="w-full glass-light rounded-xl p-4 text-left border border-white/5 hover:border-iris/40 hover:shadow-[0_0_24px_-6px_rgba(124,92,255,0.35)] transition-all"
    >
      <div className="flex items-center justify-between mb-3">
        <StatusChip status={job.status} />
        <div className="flex items-center gap-2">
          {typeof job.fee === 'number' && (
            <span className="text-xs font-bold text-aqua">₦{job.fee.toLocaleString()}</span>
          )}
          <span className="text-[10px] text-text-secondary font-mono">
            {job.tracking_slug}
          </span>
        </div>
      </div>
      <div className="space-y-1.5">
        <div className="flex items-start gap-2">
          <span className="text-iris text-sm mt-0.5 drop-shadow-[0_0_4px_rgba(124,92,255,0.7)]">●</span>
          <span className="text-sm text-text-secondary truncate">{job.pickup_address}</span>
        </div>
        <div className="flex items-start gap-2">
          <span className="text-aqua text-sm mt-0.5 drop-shadow-[0_0_4px_rgba(34,224,240,0.7)]">●</span>
          <span className="text-sm text-text-secondary truncate">{job.dropoff_address}</span>
        </div>
      </div>
      {job.package_description && (
        <p className="text-xs text-text-secondary/60 mt-2 truncate">{job.package_description}</p>
      )}
    </button>
  )
}
