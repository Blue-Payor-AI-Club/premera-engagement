import { useState } from 'react'
import { Flag } from 'lucide-react'
import { usePortalData } from '../../context/PortalDataContext'
import { type IssueRow, type ProgramTab, type Workstream } from '../../data/portalData'
import { WORKSTREAM_ICON_COMPONENTS, WORKSTREAM_ICON_LABELS } from '../../data/workstreamIcons'
import StatusBadge from '../StatusBadge'
import MilestoneTable from '../MilestoneTable'

const SEVERITY_LABELS: Record<string, string> = { critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low' }

function PremeraFlag() {
  return (
    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 uppercase tracking-wide">
      <Flag size={9} /> Premera
    </span>
  )
}

function WorkstreamPreview({ w }: { w: Workstream }) {
  const [open, setOpen] = useState(false)
  const Icon = WORKSTREAM_ICON_COMPONENTS[w.icon]
  const hasMilestones = (w.milestones?.length ?? 0) > 0

  return (
    <div className="border-b border-slate-100 last:border-b-0">
      <button
        type="button"
        onClick={() => hasMilestones && setOpen((v) => !v)}
        className={`w-full flex items-center gap-3 px-4 py-3 text-left ${hasMilestones ? 'cursor-pointer hover:bg-slate-50' : 'cursor-default'}`}
      >
        <span title={WORKSTREAM_ICON_LABELS[w.icon]} className="shrink-0">
          <Icon size={16} className="text-slate-500" />
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-sm text-slate-800">{w.name}</span>
            <StatusBadge status={w.status} />
            {w.needsPremeraAttention && <PremeraFlag />}
          </div>
          {w.statusMessage && <p className="text-xs text-slate-500 mt-0.5">{w.statusMessage}</p>}
          <p className="text-[11px] text-slate-400 mt-0.5">
            {w.accomplishments.filter(Boolean).length} accomplishments · {w.activities.filter(Boolean).length} activities
            {hasMilestones ? ` · ${w.milestones!.length} milestone group${w.milestones!.length > 1 ? 's' : ''}` : ''}
          </p>
        </div>
      </button>
      {open && hasMilestones && (
        <div className="px-4 pb-3">
          <MilestoneTable headLabel="Milestone" sections={w.milestones!} showFeedback={false} />
        </div>
      )}
    </div>
  )
}

function IssuePreview({ issue }: { issue: IssueRow }) {
  return (
    <div className="border-b border-slate-100 last:border-b-0 px-4 py-3">
      <div className="flex flex-wrap items-center gap-1.5 mb-1">
        <StatusBadge status={issue.status} />
        {issue.needsPremeraAttention && <PremeraFlag />}
        {issue.severity && <span className="text-[10px] font-bold uppercase text-slate-500">Sev: {SEVERITY_LABELS[issue.severity]}</span>}
        {issue.priority && <span className="text-[10px] font-bold uppercase text-slate-500">Pri: {SEVERITY_LABELS[issue.priority]}</span>}
        {issue.date && <span className="text-[11px] text-slate-400">Due {issue.date}</span>}
      </div>
      <p className="text-sm text-slate-800">{issue.issue}</p>
      {issue.mitigations.length > 0 && (
        <ul className="mt-1 space-y-0.5">
          {issue.mitigations.map((m, i) => (
            <li key={i} className="text-xs text-[#0f7aa6] flex gap-1.5"><span>•</span><span>{m}</span></li>
          ))}
        </ul>
      )}
      {(issue.riskActions?.length ?? 0) > 0 && (
        <p className="text-[11px] text-slate-400 mt-1">{issue.riskActions!.length} risk action{issue.riskActions!.length > 1 ? 's' : ''}</p>
      )}
    </div>
  )
}

function DivisionPreview({ tab }: { tab: ProgramTab }) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">Workstreams</h3>
          <span className="text-xs text-slate-400">{tab.workstreams.length}</span>
        </div>
        {tab.workstreams.length === 0 ? (
          <p className="text-sm text-slate-400 italic text-center py-6">No workstreams in this workbook.</p>
        ) : (
          tab.workstreams.map((w) => <WorkstreamPreview key={w.id} w={w} />)
        )}
      </div>

      {tab.milestones.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden p-4">
          <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">Program Milestones</h3>
          <MilestoneTable headLabel="Milestone" sections={tab.milestones} showFeedback={false} />
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">Risks &amp; Issues</h3>
          <span className="text-xs text-slate-400">{tab.issues.length}</span>
        </div>
        {tab.issues.length === 0 ? (
          <p className="text-sm text-slate-400 italic text-center py-6">No issues in this workbook.</p>
        ) : (
          tab.issues.map((issue) => <IssuePreview key={issue.id} issue={issue} />)
        )}
      </div>
    </div>
  )
}

/**
 * Read-only render of the whole current document — lets an admin confirm a sync
 * actually landed the fields they expect (statusMessage, severity/priority, nested
 * workstream milestones, etc.) without leaving the Admin page. Deliberately does NOT
 * reuse IssuesTable/ProgramLevel — those mount QuickFeedback (a vote-fetch per row)
 * and RiskActionsModal, neither of which belongs on an admin overview.
 */
export default function PortalPreview() {
  const { data } = usePortalData()
  const [division, setDivision] = useState<'ito' | 'bpo'>('ito')

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="text-xs font-semibold text-slate-500">As of</span>{' '}
          <span className="text-sm font-medium text-slate-800">{data.asOf || '—'}</span>
        </div>
        <div className="text-xs text-slate-400">{data.program[division].levelLabel}</div>
      </div>

      <div className="flex gap-1 border-b border-slate-200">
        {(['ito', 'bpo'] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setDivision(k)}
            className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition ${
              division === k ? 'border-[#0067b1] text-[#0067b1]' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {k.toUpperCase()}
          </button>
        ))}
      </div>

      <DivisionPreview tab={data.program[division]} />
    </div>
  )
}
