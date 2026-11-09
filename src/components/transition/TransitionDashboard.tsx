import { useMemo } from 'react'
import type { ColDef, ColGroupDef } from 'ag-grid-community'
import type { StatusKey } from '../../data/status'
import type { DashboardRow, RaidItem, TransitionData } from '../../data/transitionData'
import StatusDot from '../StatusDot'
import StatusLabel from '../StatusLabel'
import StatusChip from './StatusChip'
import VisibleToPremera from '../VisibleToPremera'
import { AddButton, EditButton, useEditor } from '../Editor'
import { dashboardRowRequest, raidRequest, transitionHeaderRequest } from '../../lib/editRequests'
import OverdueTag from '../OverdueTag'
import DataGrid, { Clamp, FullList } from '../DataGrid'
import { flattenDashboard, type DashRow } from './dashboardRows'
import { dateColumn, editColumn, renderColumn } from '../gridColumns'

// The Transition Dashboard and RAID log as grids: fixed-height rows, long text cut with "…",
// a click on a row shows all of it. Tower and Notes keep the slide's merged cells.

const NoteLines = ({ row }: { row: DashboardRow }) =>
  row.notes?.length ? (
    <ul className="list-disc pl-4 space-y-1">
      {row.notes.map((n, k) => <li key={k} className={n.alert ? 'text-red-600' : undefined}>{n.text}</li>)}
    </ul>
  ) : <span className="text-slate-400">—</span>

/** A status dot (word in the tooltip); "N/A" when the phase doesn't apply, blank when the slide leaves it empty. */
function PhaseStatus({ status, blank = false }: { status: StatusKey | null; blank?: boolean }) {
  if (status) return <StatusDot status={status} size={11} />
  return blank ? null : <span className="text-slate-500 text-xs">N/A</span>
}

function WorkstreamGrid({ data }: { data: TransitionData }) {
  const canEdit = !!useEditor()
  const rows = useMemo(() => flattenDashboard(data.dashboard), [data.dashboard])
  const columns = useMemo<(ColDef<DashRow> | ColGroupDef<DashRow>)[]>(() => {
    const text = (headerName: string, get: (r: DashboardRow) => string, headerTooltip?: string, width = 82): ColDef<DashRow> =>
      ({ headerName, headerTooltip, width, cellClass: 'flex items-center !px-1.5 whitespace-nowrap text-[12px]', valueGetter: (p) => (p.data ? get(p.data.row) || '' : '') })
    return [
      renderColumn<DashRow>({
        headerName: 'Tower',
        width: 130,
        pinned: 'left',
        rowSpan: (p) => (p.data && p.data.i === 0 ? p.data.groupSize : 1),
        cellClass: 'flex items-start bg-white font-bold text-[#10285c] !border-r !border-slate-200',
      }, (r) => r.i === 0 && (
        <div className="py-2 flex items-start gap-1.5 w-full">
          <Clamp title={r.tower} lines={r.groupSize > 1 ? 3 : 2}>{r.tower}</Clamp>
          <span className="ml-auto font-normal" data-no-details><AddButton compact request={() => dashboardRowRequest(data, r.g)}>{`Add a row to ${r.tower}`}</AddButton></span>
        </div>
      )),
      renderColumn<DashRow>({ headerName: 'Workstream', width: 160, pinned: 'left' }, (r) => (
        <Clamp title={r.row.workstream}><span className="font-bold text-[#10285c]">{r.row.workstream}</span><VisibleToPremera flagged={r.row.needsPremeraAttention} /></Clamp>
      )),
      {
        headerName: 'Discovery / Planning / Onboarding',
        headerClass: 'bg-[#9dc3e6] text-[#0b2a4a]',
        children: [
          renderColumn<DashRow>({ headerName: 'Status', width: 62, cellClass: 'flex items-center justify-center' }, (r) => <PhaseStatus status={r.row.planning.status} />),
          text('Start', (r) => r.planning.start),
          text('SOW Submit', (r) => r.planning.sowSubmit, 'SOW Planned Submit Date'),
          text('SOW Approval', (r) => r.planning.sowApproval, 'SOW Target Approval Date'),
          text('Onboarding', (r) => r.planning.onboardingComplete, 'Planned Onboarding Completion', 92),
        ],
      },
      {
        headerName: 'Transition',
        headerClass: 'bg-[#9dc3e6] text-[#0b2a4a]',
        children: [
          renderColumn<DashRow>({ headerName: 'Status', width: 62, cellClass: 'flex items-center justify-center' }, (r) => (
            <PhaseStatus status={r.row.transition.status} blank={r.row.transition.start === '' && r.row.transition.goLive === ''} />
          )),
          text('Start', (r) => r.transition.start),
          text('Go-Live', (r) => r.transition.goLive),
        ],
      },
      renderColumn<DashRow>({
        headerName: 'Notes',
        flex: 1,
        minWidth: 160,
        rowSpan: (p) => (p.data && p.data.notesSpan > 1 ? p.data.notesSpan : 1),
        cellClass: 'flex items-start bg-white text-[12px] !border-l !border-slate-200',
      }, (r) => (r.notesSpan > 0 && r.row.notes?.length ? (
        <div className="py-2">
          <Clamp lines={r.notesSpan > 1 ? 3 : 2} title={r.row.notes.map((n) => n.text).join('\n')}>
            {r.row.notes.map((n, k) => <span key={k} className={n.alert ? 'text-red-600' : undefined}>• {n.text} </span>)}
          </Clamp>
        </div>
      ) : null)),
      ...editColumn<DashRow>(canEdit, (r) => dashboardRowRequest(data, r.g, r.i), (r) => `Edit ${r.row.workstream}`),
    ]
  }, [canEdit, data])

  return (
    <>
      <DataGrid<DashRow>
        label="Transition program workstream dashboard"
        rows={rows}
        columns={columns}
        rowId={(r) => r.id}
        rowHeight={52}
        pageSize={500}
        emptyText="Nothing shared in this section yet."
        details={(r) => ({
          title: r.row.workstream,
          subtitle: r.tower,
          fields: [
            { label: 'Planning status', value: <StatusLabel status={r.row.planning.status} /> },
            { label: 'Planning start', value: r.row.planning.start || '—' },
            { label: 'SOW planned submit', value: r.row.planning.sowSubmit || '—' },
            { label: 'SOW target approval', value: r.row.planning.sowApproval || '—' },
            { label: 'Planned onboarding completion', value: r.row.planning.onboardingComplete || '—' },
            { label: 'Transition status', value: <StatusLabel status={r.row.transition.status} /> },
            { label: 'Transition start', value: r.row.transition.start || '—' },
            { label: 'Go-live', value: r.row.transition.goLive || '—' },
            { label: 'Notes', value: <NoteLines row={r.row} /> },
            ...(canEdit ? [{ label: 'Premera can see it', value: r.row.needsPremeraAttention ? 'Yes' : 'No (UST only)' }] : []),
          ],
          actions: <EditButton className="" title={`Edit ${r.row.workstream}`} request={() => dashboardRowRequest(data, r.g, r.i)} />,
        })}
      />
      <div className="p-2"><AddButton request={() => dashboardRowRequest(data)}>Add tower / workstream</AddButton></div>
    </>
  )
}

type RaidRow = RaidItem & { id: string; index: number }
const raidDone = (r: RaidItem) => r.status === 'Closed' || r.status === 'Mitigated'

function RaidGrid({ data }: { data: TransitionData }) {
  const canEdit = !!useEditor()
  const rows = useMemo<RaidRow[]>(() => data.raid.map((r, index) => ({ ...r, id: String(index), index })), [data.raid])
  const columns = useMemo<ColDef<RaidRow>[]>(() => [
    renderColumn<RaidRow>({ headerName: 'RAID', width: 80, cellClass: 'flex items-center justify-center font-semibold' }, (r) => r.type),
    renderColumn<RaidRow>({ headerName: 'Description', flex: 2, minWidth: 190 }, (r) => (
      <Clamp title={r.description}>{r.description}<VisibleToPremera flagged={r.needsPremeraAttention} /></Clamp>
    )),
    { headerName: 'Mitigation Plan / Next Steps', flex: 2, minWidth: 190, valueGetter: (p) => p.data?.mitigation },
    { headerName: 'Owner', width: 140, valueGetter: (p) => p.data?.owner },
    dateColumn<RaidRow>('Due Date', (r) => r.dueDate, raidDone, 120),
    { headerName: 'Status', width: 120, valueGetter: (p) => p.data?.status },
    ...editColumn<RaidRow>(canEdit, (r) => raidRequest(data, r.index), () => 'Edit RAID item'),
  ], [canEdit, data])

  return (
    <>
      <DataGrid<RaidRow>
        label="RAID log"
        rows={rows}
        columns={columns}
        rowId={(r) => r.id}
        rowHeight={56}
        emptyText="Nothing shared in this section yet."
        details={(r) => ({
          title: r.description,
          subtitle: `RAID: ${r.type}`,
          fields: [
            { label: 'Mitigation plan / next steps', value: <FullList items={r.mitigation} /> },
            { label: 'Owner', value: r.owner || '—' },
            { label: 'Due date', value: <>{r.dueDate || '—'}<OverdueTag date={r.dueDate} done={raidDone(r)} /></> },
            { label: 'Status', value: r.status || '—' },
            ...(canEdit ? [{ label: 'Premera can see it', value: r.needsPremeraAttention ? 'Yes' : 'No (UST only)' }] : []),
          ],
          actions: <EditButton className="" title="Edit RAID item" request={() => raidRequest(data, r.index)} />,
        })}
      />
      <div className="p-2"><AddButton request={() => raidRequest(data)}>Add RAID item</AddButton></div>
    </>
  )
}

export default function TransitionDashboard({ data }: { data: TransitionData }) {
  return (
    <section className="space-y-4" aria-label="Transition Program Dashboard">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#0b3a53] text-white px-4 sm:px-6 py-4">
        <h2 className="text-lg sm:text-xl font-semibold tracking-tight">Transition Program Dashboard</h2>
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-[#0ea5e9] px-4 py-1 text-right leading-tight">
            <span className="block text-[10px] tracking-widest font-semibold text-white/90">AS OF:</span>
            <span className="block text-sm font-semibold">{data.asOf}</span>
          </span>
          <StatusChip status={data.overallStatus} />
          <span className="[&_button]:text-white/80 [&_button:hover]:text-[#0b3a53]">
            <EditButton title="Edit transition header" request={() => transitionHeaderRequest(data)} />
          </span>
        </div>
      </div>

      <div className="card overflow-hidden">
        <WorkstreamGrid data={data} />
      </div>
      <div className="card overflow-hidden">
        <RaidGrid data={data} />
      </div>
    </section>
  )
}
