import type { RaidItem, TransitionWorkstream } from '../data/transitionData'
import { LEGEND_ORDER, type StatusKey } from '../data/status'

// Program Level (Neeta's review, set 1, 2026-11-11): one tab per operational area.

export const raidDone = (r: RaidItem) => r.status === 'Closed' || r.status === 'Mitigated'
/** Workstream names typed in Excel by hand: compare case- and space-insensitively. */
export const sameName = (a: string | undefined, b: string) => !!a && a.trim().toLowerCase().replace(/\s+/g, ' ') === b.trim().toLowerCase().replace(/\s+/g, ' ')

/** In display order. A tab shows the workstream whose name starts with its label (ignoring case,
 * punctuation and a trailing "(…)"), so "Claims Operations (100-400)" finds "Claims Operations". */
export const PROGRAM_TABS = [
  'Service Desk and ITOC',
  'Claims Operations (100-400)',
  'Application support and operations',
  'Provider Data Management',
  'Application Development Services',
  'Enrollment & Billing',
  'Product Config & Group Set-up',
  'Provider Contact Center',
  'Employer Portal Project',
  'Database Administration',
  'End‑to‑End Testing',
]

const key = (s: string) => s.replace(/\(.*?\)/g, '').toLowerCase().replace(/[^a-z0-9]/g, '')
export const tabWorkstream = (dashboard: TransitionWorkstream[], tab: string) =>
  dashboard.findIndex((w) => key(w.workstream).startsWith(key(tab)))

/** Unset overall status: the worst phase status, else complete when all phases are, else on track once any started. */
export function overallStatus(w: TransitionWorkstream): StatusKey {
  if (w.status) return w.status
  const s = w.phases.map((p) => p.status).filter((x): x is StatusKey => !!x)
  if (s.includes('delayed')) return 'delayed'
  if (s.includes('atRisk')) return 'atRisk'
  if (s.length && s.every((x) => x === 'complete')) return 'complete'
  return s.some((x) => x === 'onTrack' || x === 'complete') ? 'onTrack' : 'notStarted'
}

/** KPI counts: the workstream's phases (those with a status) and their milestones. */
export function statusCounts(w: TransitionWorkstream | undefined): Record<StatusKey, number> {
  const counts = Object.fromEntries(LEGEND_ORDER.map((k) => [k, 0])) as Record<StatusKey, number>
  for (const p of w?.phases ?? []) {
    if (p.status) counts[p.status]++
    for (const m of p.milestones) counts[m.status]++
  }
  return counts
}
