import { STATUS, type StatusKey } from '../data/status'
import StatusDot from './StatusDot'

/** A status dot plus its word; "N/A" for a phase that doesn't apply. */
export default function StatusLabel({ status }: { status: StatusKey | null }) {
  if (!status) return <span className="text-slate-400 text-xs">N/A</span>
  const meta = STATUS[status]
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap" style={{ color: meta?.color }}>
      <StatusDot status={status} size={10} /> {meta?.label ?? status}
    </span>
  )
}
