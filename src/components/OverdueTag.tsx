import { isOverdue } from '../lib/format'

/** Red "Overdue" tag after a due date that has passed while the item isn't done. */
export default function OverdueTag({ date, done, className = 'ml-1.5' }: { date?: string; done: boolean; className?: string }) {
  if (!isOverdue(date, done)) return null
  return (
    <span className={`inline-block ${className} px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-red-600 text-white whitespace-nowrap align-middle`}>
      Overdue
    </span>
  )
}
