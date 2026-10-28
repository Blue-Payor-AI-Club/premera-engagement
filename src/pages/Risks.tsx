import { useMemo, useState } from 'react'
import VisibleToPremera from '../components/VisibleToPremera'
import { AlertTriangle, Flag, Filter, CalendarDays } from 'lucide-react'
import SlideHeader from '../components/SlideHeader'
import Legend from '../components/Legend'
import StatusDot from '../components/StatusDot'
import RiskActionsModal from '../components/RiskActionsModal'
import { usePortalData } from '../context/PortalDataContext'
import { type IssueRow, type SeverityLevel } from '../data/portalData'

const isAtRisk = (s: string) => s === 'atRisk' || s === 'delayed'

// ─── Severity / Priority ──────────────────────────────────────────────────────

const SEVERITY_STYLE: Record<SeverityLevel, { label: string; bg: string; text: string }> = {
  critical: { label: 'Critical', bg: '#fee2e2', text: '#b91c1c' },
  high:     { label: 'High',     bg: '#ffedd5', text: '#c2410c' },
  medium:   { label: 'Medium',   bg: '#fef9c3', text: '#854d0e' },
  low:      { label: 'Low',      bg: '#f1f5f9', text: '#475569' },
}

function SeverityBadge({ value }: { value?: SeverityLevel }) {
  if (!value) return <span className="text-slate-300 text-xs">—</span>
  const s = SEVERITY_STYLE[value]
  return (
    <span
      className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide"
      style={{ background: s.bg, color: s.text }}
    >
      {s.label}
    </span>
  )
}

// ─── Issue group ──────────────────────────────────────────────────────────────

function IssueGroup({
  title,
  rows,
  onSelect,
  showAll,
  premeraOnly,
}: {
  title: string
  rows: IssueRow[]
  onSelect: (r: IssueRow) => void
  showAll: boolean
  premeraOnly: boolean
}) {
  const visible = rows.filter((r) => {
    const statusOk = showAll || isAtRisk(r.status)
    const premeraOk = !premeraOnly || r.needsPremeraAttention
    return statusOk && premeraOk
  })

  if (visible.length === 0) return null

  return (
    <div className="card overflow-hidden">
      <div style={{ background: '#dfe3e6' }} className="px-4 py-2 font-semibold text-slate-700 text-sm">
        {title}
      </div>

      {/* desktop */}
      <table className="hidden sm:table w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-slate-200 text-xs text-slate-500">
            <th className="text-left font-semibold px-4 py-2">Risks &amp; Issues</th>
            <th className="text-left font-semibold px-4 py-2">Mitigation Plan</th>
            <th className="text-left font-semibold px-4 py-2 w-24">Due Date</th>
            <th className="text-center font-semibold px-4 py-2 w-20">Severity</th>
            <th className="text-center font-semibold px-4 py-2 w-20">Priority</th>
            <th className="text-center font-semibold px-4 py-2 w-16">Status</th>
            <th className="text-center font-semibold px-4 py-2 w-24">Actions</th>
          </tr>
        </thead>
        <tbody>
          {visible.map((row, i) => (
            <tr key={row.id} className={i % 2 ? 'bg-slate-50' : 'bg-white'}>
              <td className="px-4 py-3 align-top text-slate-700">
                {row.needsPremeraAttention && (
                  <span className="inline-block mr-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 uppercase tracking-wide">
                    Premera
                  </span>
                )}
                {row.issue}<VisibleToPremera flagged={row.needsPremeraAttention} />
              </td>
              <td className="px-4 py-3 align-top">
                <ul className="space-y-1">
                  {row.mitigations.map((m, j) => (
                    <li key={j} className="flex gap-2 text-[#0f7aa6]">
                      <span>•</span>
                      <span>{m}</span>
                    </li>
                  ))}
                </ul>
              </td>
              <td className="px-4 py-3 align-top text-[#0f7aa6] font-medium">{row.date || '—'}</td>
              <td className="px-4 py-3 align-top text-center">
                <SeverityBadge value={row.severity} />
              </td>
              <td className="px-4 py-3 align-top text-center">
                <SeverityBadge value={row.priority} />
              </td>
              <td className="px-4 py-3 align-top text-center">
                <StatusDot status={row.status} />
              </td>
              <td className="px-4 py-3 align-top text-center">
                <button
                  onClick={() => onSelect(row)}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold text-amber-700 bg-amber-100 hover:bg-amber-200 transition"
                >
                  <AlertTriangle size={12} />
                  Actions
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* mobile */}
      <div className="sm:hidden divide-y divide-slate-100">
        {visible.map((row, i) => (
          <div key={row.id} className={`px-3 py-3 ${i % 2 ? 'bg-slate-50' : 'bg-white'}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="text-sm text-slate-700 min-w-0">
                {row.needsPremeraAttention && (
                  <span className="inline-block mr-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 uppercase tracking-wide">
                    Premera
                  </span>
                )}
                {row.issue}<VisibleToPremera flagged={row.needsPremeraAttention} />
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => onSelect(row)}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold text-amber-700 bg-amber-100 hover:bg-amber-200 transition"
                >
                  <AlertTriangle size={12} />
                  Actions
                </button>
                <StatusDot status={row.status} />
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 mt-2">
              {row.date && (
                <span className="flex items-center gap-1 text-xs text-[#0f7aa6] font-medium ml-auto">
                  <CalendarDays size={12} className="shrink-0" />
                  {row.date}
                </span>
              )}
              {row.severity && (
                <div className="flex items-center gap-1">
                  <span className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">Sev:</span>
                  <SeverityBadge value={row.severity} />
                </div>
              )}
              {row.priority && (
                <div className="flex items-center gap-1">
                  <span className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">Pri:</span>
                  <SeverityBadge value={row.priority} />
                </div>
              )}
            </div>
            <ul className="mt-2 space-y-1">
              {row.mitigations.map((m, j) => (
                <li key={j} className="flex gap-2 text-[13px] text-[#0f7aa6]">
                  <span>•</span>
                  <span>{m}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Risks() {
  const { data } = usePortalData()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)
  const [premeraOnly, setPremeraOnly] = useState(false)

  const allIssues = useMemo(() => [
    ...data.program.ito.issues,
    ...data.program.bpo.issues,
  ], [data])

  // Derive from live context (not a snapshot) so the open modal reflects a fresh
  // Excel sync immediately rather than showing stale data from when it was opened.
  const selectedIssue = useMemo(() =>
    selectedId ? (allIssues.find(r => r.id === selectedId) ?? null) : null,
    [selectedId, allIssues]
  )

  const totalAtRisk = allIssues.filter((r) => isAtRisk(r.status)).length
  const totalPremera = allIssues.filter((r) => r.needsPremeraAttention).length

  return (
    <div className="slide">
      <RiskActionsModal issue={selectedIssue} onClose={() => setSelectedId(null)} />

      <SlideHeader title="Consolidated Risks & Issues" sampleLines={[]} asOf={data.asOf} />

      {/* Summary pills */}
      <div data-tour="risks-summary" className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-50 border border-amber-200 w-full sm:w-auto">
          <AlertTriangle size={15} className="text-amber-500 shrink-0" />
          <span className="text-sm font-semibold text-amber-800">
            Risks &amp; Issues: <span className="text-amber-600">{totalAtRisk}</span>
          </span>
        </div>
        {totalPremera > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-50 border border-red-200 w-full sm:w-auto">
            <Flag size={15} className="text-red-500 shrink-0" />
            <span className="text-sm font-semibold text-red-800">
              Attention required from Premera: <span className="text-red-600">{totalPremera}</span>
            </span>
          </div>
        )}
      </div>

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-6 px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wide sm:mr-1">
          <Filter size={12} />
          Filter
        </div>
        <button
          onClick={() => setPremeraOnly(v => !v)}
          className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-md text-xs font-semibold border transition w-full sm:w-auto ${
            premeraOnly
              ? 'bg-red-600 text-white border-red-600 shadow-sm'
              : 'bg-white text-red-700 border-red-300 hover:border-red-400'
          }`}
        >
          <Flag size={11} />
          Premera Action Items Only
        </button>
        <button
          onClick={() => setShowAll(v => !v)}
          className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-md text-xs font-semibold border transition w-full sm:w-auto ${
            showAll
              ? 'bg-slate-700 text-white border-slate-700 shadow-sm'
              : 'bg-white text-slate-600 border-slate-300 hover:border-slate-500'
          }`}
        >
          {showAll ? 'Showing All Statuses' : 'Include Resolved / On Track'}
        </button>
      </div>

      <div className="mb-4">
        <Legend />
      </div>

      <div className="space-y-6">
        <IssueGroup
          title="Program Level — ITO"
          rows={data.program.ito.issues}
          onSelect={(r) => setSelectedId(r.id)}
          showAll={showAll}
          premeraOnly={premeraOnly}
        />
        <IssueGroup
          title="Program Level — BPO"
          rows={data.program.bpo.issues}
          onSelect={(r) => setSelectedId(r.id)}
          showAll={showAll}
          premeraOnly={premeraOnly}
        />
      </div>
    </div>
  )
}
