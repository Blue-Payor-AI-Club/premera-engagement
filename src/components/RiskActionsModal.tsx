import { useMemo } from 'react'
import { AlertTriangle } from 'lucide-react'
import type { ColDef } from 'ag-grid-community'
import { type IssueRow, type ActionStatus, type RiskAction } from '../data/portalData'
import { type StatusKey } from '../data/status'
import VisibleToPremera from './VisibleToPremera'
import OverdueTag from './OverdueTag'
import StatusLabel from './StatusLabel'
import { AddButton, EditButton, useEditor } from './Editor'
import { riskActionRequest } from '../lib/editRequests'
import DataGrid, { Clamp } from './DataGrid'
import { dateColumn, editColumn, renderColumn } from './gridColumns'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog'

// UST users edit actions here (Edit column / Add); everyone else sees them read-only.
const ACTION_STATUS: Record<ActionStatus, { label: string; color: string }> = {
  open:       { label: 'Open',        color: '#e0392b' },
  inProgress: { label: 'In Progress', color: '#f2b705' },
  closed:     { label: 'Closed',      color: '#1aa260' },
}

function ActionPill({ status }: { status: ActionStatus }) {
  const s = ACTION_STATUS[status] ?? ACTION_STATUS.open
  return <span className="inline-flex px-2.5 py-0.5 rounded-full text-white text-xs font-semibold whitespace-nowrap" style={{ background: s.color }}>{s.label}</span>
}

export default function RiskActionsModal({ issue, onClose }: { issue: IssueRow | null; onClose: () => void }) {
  const canEdit = !!useEditor()
  const issueId = issue?.id ?? ''

  const columns = useMemo<ColDef<RiskAction>[]>(() => [
    renderColumn<RiskAction>({ headerName: 'Action', flex: 1, minWidth: 220 }, (a) => (
      <Clamp title={a.action}>{a.action}<VisibleToPremera flagged={a.needsPremeraAttention} /></Clamp>
    )),
    renderColumn<RiskAction>({ headerName: 'Owner', width: 150 }, (a) => <Clamp title={a.owner}><span className="font-medium text-primary">{a.owner || '—'}</span></Clamp>),
    dateColumn<RiskAction>('Due Date', (a) => a.dueDate, (a) => a.actionStatus === 'closed', 120),
    renderColumn<RiskAction>({ headerName: 'Status', width: 120 }, (a) => <ActionPill status={a.actionStatus} />),
    ...editColumn<RiskAction>(canEdit, (a) => riskActionRequest(issueId, a), () => 'Edit action'),
  ], [canEdit, issueId])

  const actions = issue?.riskActions ?? []

  return (
    <Dialog open={!!issue} onOpenChange={(o) => { if (!o) onClose() }}>
      {issue && (
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <AlertTriangle size={15} className="text-amber-500 shrink-0" />
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Risks &amp; Issues</span>
              {issue.premeraActionRequired && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 uppercase tracking-wide">
                  Attention required from Premera
                </span>
              )}
            </div>
            <DialogTitle>{issue.issue}</DialogTitle>
            <DialogDescription>
              {issue.severity && <>Severity: <span className="font-semibold text-slate-700 capitalize">{issue.severity}</span></>}
              {issue.severity && issue.priority && ' · '}
              {issue.priority && <>Priority: <span className="font-semibold text-slate-700 capitalize">{issue.priority}</span></>}
            </DialogDescription>
          </DialogHeader>

          {issue.mitigations.length > 0 && (
            <div className="px-5 py-3 border-b border-border">
              <div className="text-xs font-semibold text-slate-500 mb-1.5">Mitigation Plan / Next Steps</div>
              <ul className="space-y-1">
                {issue.mitigations.map((m, i) => (
                  <li key={i} className="flex gap-2 text-sm text-[#0f7aa6]"><span>•</span><span>{m}</span></li>
                ))}
              </ul>
            </div>
          )}

          <div className="px-5 py-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Actions &amp; Ownership</div>
              {canEdit
                ? <AddButton request={() => riskActionRequest(issue.id)}>Add action</AddButton>
                : actions.length > 0 && <div className="text-[10px] text-slate-400">Read-only</div>}
            </div>

            {actions.length === 0 ? (
              <p className="text-sm text-slate-400 italic">No actions recorded yet.</p>
            ) : (
              <>
                <div className="hidden sm:block rounded-lg border border-border overflow-hidden">
                  <DataGrid<RiskAction>
                    label="Actions and ownership"
                    rows={actions}
                    columns={columns}
                    rowId={(a) => a.id}
                    rowHeight={52}
                    details={(a) => ({
                      title: a.action,
                      fields: [
                        { label: 'Owner', value: a.owner || '—' },
                        { label: 'Due date', value: <>{a.dueDate || '—'}<OverdueTag date={a.dueDate} done={a.actionStatus === 'closed'} /></> },
                        { label: 'Status', value: <ActionPill status={a.actionStatus} /> },
                        ...(canEdit ? [{ label: 'Premera can see it', value: a.needsPremeraAttention ? 'Yes' : 'No (UST only)' }] : []),
                      ],
                      actions: <EditButton title="Edit action" className="" request={() => riskActionRequest(issue.id, a)} />,
                    })}
                  />
                </div>

                {/* phone */}
                <div className="sm:hidden space-y-2">
                  {actions.map((a) => (
                    <div key={a.id} className="rounded-lg border border-border p-3">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <p className="text-sm text-slate-700">{a.action}<VisibleToPremera flagged={a.needsPremeraAttention} /></p>
                        <EditButton title="Edit action" className="shrink-0" request={() => riskActionRequest(issue.id, a)} />
                      </div>
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="text-xs">
                          <span className="font-semibold text-primary">{a.owner}</span>
                          {a.dueDate && <span className="ml-2 text-slate-400">· {a.dueDate}</span>}<OverdueTag date={a.dueDate} done={a.actionStatus === 'closed'} />
                        </div>
                        <ActionPill status={a.actionStatus} />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="flex items-center justify-between px-5 py-3 border-t border-border text-xs text-slate-400">
            {/* The issue's own due date and status, not an action's — labelled so the two aren't confused. */}
            <span>Issue due: {issue.date || '—'}<OverdueTag date={issue.date} done={issue.status === 'complete'} /></span>
            <div className="flex items-center gap-1.5">
              <span>Issue status:</span>
              <StatusLabel status={issue.status as StatusKey} />
            </div>
          </div>
        </DialogContent>
      )}
    </Dialog>
  )
}
