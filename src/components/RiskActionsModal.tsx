import { useEffect } from 'react'
import { X, AlertTriangle } from 'lucide-react'
import { type IssueRow, type ActionStatus } from '../data/portalData'
import StatusDot from './StatusDot'

// Read-only now that Excel is the sole source of truth for portal data — action
// status comes from the RiskActions sheet's Action Status column like everything
// else. `next`/`hint` (used by the old click-to-cycle interaction) are gone.
const ACTION_STATUS: Record<ActionStatus, { label: string; color: string }> = {
  open:       { label: 'Open',        color: '#e0392b' },
  inProgress: { label: 'In Progress', color: '#f2b705' },
  closed:     { label: 'Closed',      color: '#1aa260' },
}

export default function RiskActionsModal({ issue, onClose }: { issue: IssueRow | null; onClose: () => void }) {
  useEffect(() => {
    if (!issue) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [issue, onClose])

  if (!issue) return null

  const actions = issue.riskActions ?? []

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-slate-200">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle size={15} className="text-amber-500 shrink-0" />
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Risks &amp; Issues</span>
              {issue.needsPremeraAttention && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 uppercase tracking-wide">
                  Attention required from Premera
                </span>
              )}
            </div>
            <p className="text-sm font-semibold text-slate-800">{issue.issue}</p>
            {(issue.severity || issue.priority) && (
              <div className="flex gap-3 mt-1.5">
                {issue.severity && (
                  <span className="text-xs text-slate-500">
                    Severity: <span className="font-semibold text-slate-700 capitalize">{issue.severity}</span>
                  </span>
                )}
                {issue.priority && (
                  <span className="text-xs text-slate-500">
                    Priority: <span className="font-semibold text-slate-700 capitalize">{issue.priority}</span>
                  </span>
                )}
              </div>
            )}
          </div>
          <button onClick={onClose} className="shrink-0 p-1 rounded hover:bg-slate-100 transition">
            <X size={18} className="text-slate-500" />
          </button>
        </div>

        {/* Mitigations */}
        {issue.mitigations.length > 0 && (
          <div className="px-6 py-3 border-b border-slate-100">
            <div className="text-xs font-semibold text-slate-500 mb-1.5">Mitigation Plan / Next Steps</div>
            <ul className="space-y-1">
              {issue.mitigations.map((m, i) => (
                <li key={i} className="flex gap-2 text-sm text-[#0f7aa6]">
                  <span>•</span><span>{m}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Actions table */}
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Actions &amp; Ownership</div>
            {actions.length > 0 && (
              <div className="text-[10px] text-slate-400">Read-only — maintained in the source workbook</div>
            )}
          </div>

          {actions.length === 0 ? (
            <p className="text-sm text-slate-400 italic">No actions recorded yet.</p>
          ) : (
            <>
              {/* desktop */}
              <table className="hidden sm:table w-full text-sm border-collapse">
                <thead>
                  <tr style={{ background: '#dfe3e6' }} className="text-slate-700">
                    <th className="text-left font-semibold px-3 py-2">Action</th>
                    <th className="text-left font-semibold px-3 py-2 w-32">Owner</th>
                    <th className="text-left font-semibold px-3 py-2 w-24">Due Date</th>
                    <th className="text-center font-semibold px-3 py-2 w-32">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {actions.map((a, i) => {
                    const s = ACTION_STATUS[a.actionStatus] ?? ACTION_STATUS.open
                    return (
                      <tr key={a.id} className={i % 2 ? 'bg-slate-50' : 'bg-white'}>
                        <td className="px-3 py-2.5 text-slate-700">{a.action}</td>
                        <td className="px-3 py-2.5 font-medium" style={{ color: '#0067b1' }}>{a.owner}</td>
                        <td className="px-3 py-2.5 text-slate-600">{a.dueDate}</td>
                        <td className="px-3 py-2.5 text-center">
                          <span
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-white text-xs font-semibold"
                            style={{ background: s.color }}
                          >
                            {s.label}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              {/* mobile */}
              <div className="sm:hidden space-y-2">
                {actions.map((a) => {
                  const s = ACTION_STATUS[a.actionStatus] ?? ACTION_STATUS.open
                  return (
                    <div key={a.id} className="rounded-lg border border-slate-200 p-3">
                      <p className="text-sm text-slate-700 mb-2">{a.action}</p>
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="text-xs">
                          <span className="font-semibold" style={{ color: '#0067b1' }}>{a.owner}</span>
                          {a.dueDate && <span className="ml-2 text-slate-400">· {a.dueDate}</span>}
                        </div>
                        <span
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-white text-xs font-semibold"
                          style={{ background: s.color }}
                        >
                          {s.label}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-100 text-xs text-slate-400">
          <span>Due Date: {issue.date || '—'}</span>
          <div className="flex items-center gap-1.5">
            <StatusDot status={issue.status} />
            <span>{issue.status === 'atRisk' ? 'At Risk' : issue.status === 'delayed' ? 'Delayed' : issue.status}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
