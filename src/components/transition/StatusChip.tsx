import { STATUS, type StatusKey } from '../../data/status'

/** Overall-status pill (the slide's "At Risk" tab). Text is dark on the amber fill for contrast. */
export default function StatusChip({ status }: { status: StatusKey }) {
  const { color, label } = STATUS[status]
  const darkText = status === 'atRisk' || status === 'notStarted'
  return (
    <span
      className="inline-flex items-center rounded-full px-4 py-1.5 text-sm font-semibold"
      style={{ background: color, color: darkText ? '#1f2937' : '#ffffff' }}
    >
      {label}
    </span>
  )
}
