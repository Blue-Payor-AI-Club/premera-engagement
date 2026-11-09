export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

export function formatDateTime(iso: string | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

/** "3 days ago", "just now" — for the "Updated …" note next to the As-Of date. */
export function timeAgo(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return ''
  const secs = Math.round((new Date(iso).getTime() - now) / 1000)
  if (Number.isNaN(secs)) return ''
  if (Math.abs(secs) < 60) return 'just now'
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })
  for (const [unit, size] of [['day', 86400], ['hour', 3600], ['minute', 60]] as const) {
    if (Math.abs(secs) >= size) return rtf.format(Math.round(secs / size), unit)
  }
  return 'just now'
}

/** A portal date (M/D/YYYY) that has passed while the item isn't done. TBD / N/A / blank never are. */
export function isOverdue(date: string | undefined, done: boolean, today = new Date()): boolean {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(date?.trim() ?? '')
  if (done || !m) return false
  return new Date(+m[3], +m[1] - 1, +m[2]) < new Date(today.getFullYear(), today.getMonth(), today.getDate())
}
