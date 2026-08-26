import { STATUS, type StatusKey } from '../data/status'

/** Filled pill badge — read-only. Extracted from the old Admin.tsx editor so the
 * Admin preview can render it without pulling in any of the editing UI around it. */
export default function StatusBadge({ status }: { status: StatusKey }) {
  const s = STATUS[status]
  return (
    <span
      className="inline-block px-2 py-0.5 rounded-full text-white text-[10px] font-bold"
      style={{ background: s.color }}
    >
      {s.label}
    </span>
  )
}
