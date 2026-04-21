import StatusChip from './StatusChip'

interface JobCardProps {
  job: {
    id: string
    status: string
    pickup_address: string
    dropoff_address: string
    tracking_slug: string
    package_description?: string
  }
  onClick?: () => void
}

export default function JobCard({ job, onClick }: JobCardProps) {
  return (
    <button
      onClick={onClick}
      className="w-full glass rounded-xl p-4 text-left hover:border-accent-primary/30 transition-all"
    >
      <div className="flex items-center justify-between mb-3">
        <StatusChip status={job.status} />
        <span className="text-[10px] text-text-secondary font-mono">
          {job.tracking_slug}
        </span>
      </div>
      <div className="space-y-1.5">
        <div className="flex items-start gap-2">
          <span className="text-accent-primary text-sm mt-0.5">●</span>
          <span className="text-sm text-text-secondary truncate">{job.pickup_address}</span>
        </div>
        <div className="flex items-start gap-2">
          <span className="text-accent-secondary text-sm mt-0.5">●</span>
          <span className="text-sm text-text-secondary truncate">{job.dropoff_address}</span>
        </div>
      </div>
      {job.package_description && (
        <p className="text-xs text-text-secondary/60 mt-2 truncate">{job.package_description}</p>
      )}
    </button>
  )
}
