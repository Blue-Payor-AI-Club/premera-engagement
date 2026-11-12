import { useMemo } from 'react'
import type { ColDef, ColGroupDef } from 'ag-grid-community'
import type { StatusKey } from '../../data/status'
import type { PhaseRow, TransitionData, TransitionWorkstream } from '../../data/transitionData'
import StatusDot from '../StatusDot'
import VisibleToPremera from '../VisibleToPremera'
import DataGrid, { Clamp } from '../DataGrid'
import { editColumn, renderColumn } from '../gridColumns'
import QuickFeedback from '../QuickFeedback'
import { useEditor } from '../Editor'
import { legacyRowRequest } from '../../lib/editRequests'

// The Transition Dashboard in the slide's pre-phase layout (Tower | Workstream | Discovery /
// Planning / Onboarding | Transition | Notes), rebuilt from the phase rows for the Transition
// Summary Report. Its pencil edits those phases (lib/editRequests legacyRowRequest); thumbs are
// per workstream (itemId "ws:<name>").

interface Row {
  id: string
  tower: string
  first: boolean
  groupSize: number
  w: TransitionWorkstream
  wi: number
  planning: PhaseRow | undefined
  onboarding: PhaseRow | undefined
  transition: PhaseRow | undefined
  sowSubmit: string
}

const find = (w: TransitionWorkstream, phase: string) => w.phases.find((p) => p.phase === phase)

function legacyRows(dashboard: TransitionWorkstream[]): Row[] {
  // Consecutive workstreams with the same tower form one group, as on the slide.
  const rows: Row[] = []
  let head: Row | undefined
  for (const [wi, w] of dashboard.entries()) {
    const tower = w.tower || '—'
    const planning = find(w, 'Discovery & Planning')
    const prev = rows[rows.length - 1]
    const first = !prev || prev.tower !== tower
    const row: Row = {
      id: w.workstream, tower, first, groupSize: 1, w, wi, planning,
      onboarding: find(w, 'Onboarding'),
      transition: find(w, 'Transition / KT'),
      sowSubmit: planning?.milestones.find((m) => m.label === 'SOW submitted')?.due ?? '',
    }
    rows.push(row)
    if (first) head = row
    else head!.groupSize++
  }
  return rows
}

const PhaseStatus = ({ status }: { status: StatusKey | null | undefined }) =>
  status ? <StatusDot status={status} size={11} /> : <span className="text-slate-500 text-xs">N/A</span>

export default function LegacyDashboard({ data }: { data: TransitionData }) {
  const canEdit = !!useEditor()
  const rows = useMemo(() => legacyRows(data.dashboard), [data.dashboard])
  const columns = useMemo<(ColDef<Row> | ColGroupDef<Row>)[]>(() => {
    const text = (headerName: string, get: (r: Row) => string | undefined, headerTooltip?: string, width = 86): ColDef<Row> =>
      ({ headerName, headerTooltip, width, cellClass: 'flex items-center !px-1.5 whitespace-nowrap text-[12px]', valueGetter: (p) => (p.data ? get(p.data) || '' : '') })
    return [
      renderColumn<Row>({
        headerName: 'Tower',
        width: 140,
        pinned: 'left',
        rowSpan: (p) => (p.data?.first ? p.data.groupSize : 1),
        cellClass: 'flex items-start bg-white font-bold text-[#10285c] !border-r !border-slate-200',
      }, (r) => r.first && <div className="py-2"><Clamp title={r.tower} lines={r.groupSize > 1 ? 3 : 2}>{r.tower}</Clamp></div>),
      renderColumn<Row>({ headerName: 'Workstream', width: 170, pinned: 'left' }, (r) => (
        <Clamp title={r.w.workstream}><span className="font-bold text-[#10285c]">{r.w.workstream}</span><VisibleToPremera flagged={r.planning?.needsPremeraAttention} /></Clamp>
      )),
      {
        headerName: 'Discovery / Planning / Onboarding',
        headerClass: 'bg-[#9dc3e6] text-[#0b2a4a]',
        children: [
          renderColumn<Row>({ headerName: 'Status', width: 62, cellClass: 'flex items-center justify-center' }, (r) => <PhaseStatus status={r.planning?.status} />),
          text('Start', (r) => r.planning?.start),
          text('SOW Submit', (r) => r.sowSubmit, 'SOW Planned Submit Date'),
          text('SOW Approval', (r) => r.planning?.end, 'SOW Target Approval Date'),
          text('Onboarding', (r) => r.onboarding?.end, 'Planned Onboarding Completion', 92),
        ],
      },
      {
        headerName: 'Transition',
        headerClass: 'bg-[#9dc3e6] text-[#0b2a4a]',
        children: [
          renderColumn<Row>({ headerName: 'Status', width: 62, cellClass: 'flex items-center justify-center' }, (r) => <PhaseStatus status={r.transition?.status} />),
          text('Start', (r) => r.transition?.start),
          text('Go-Live', (r) => r.transition?.end),
        ],
      },
      renderColumn<Row>({ headerName: 'Notes', flex: 1, minWidth: 180, cellClass: 'flex items-center text-[12px]' }, (r) => {
        const notes = r.w.phases.flatMap((p) => p.notes ?? [])
        return notes.length > 0 && (
          <Clamp title={notes.map((n) => n.text).join('\n')}>
            {notes.map((n, k) => <span key={k} className={n.alert ? 'text-red-600' : undefined}>• {n.text} </span>)}
          </Clamp>
        )
      }),
      renderColumn<Row>({ headerName: 'Feedback', width: 100 }, (r) => <QuickFeedback itemId={`ws:${r.w.workstream}`} itemLabel={r.w.workstream} />),
      ...editColumn<Row>(canEdit, (r) => legacyRowRequest(data, r.wi), (r) => `Edit ${r.w.workstream} dashboard row`),
    ]
  }, [canEdit, data])

  return (
    <DataGrid<Row>
      label="Transition program workstream dashboard"
      rows={rows}
      columns={columns}
      rowId={(r) => r.id}
      rowHeight={52}
      pageSize={500}
      emptyText="Nothing shared in this section yet."
    />
  )
}
