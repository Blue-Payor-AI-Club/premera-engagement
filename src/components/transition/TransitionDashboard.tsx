import { useMemo, useState } from 'react'
import useMediaQuery from '@mui/material/useMediaQuery'
import type { ColDef } from 'ag-grid-community'
import { TRANSITION_PHASES, type PhaseRow, type RaidItem, type TransitionData, type TransitionWorkstream } from '../../data/transitionData'
import StatusLabel from '../StatusLabel'
import StatusChip from './StatusChip'
import VisibleToPremera from '../VisibleToPremera'
import QuickFeedback from '../QuickFeedback'
import MilestoneTable from '../MilestoneTable'
import { AddButton, EditButton, useEditor } from '../Editor'
import { phaseMilestones, phaseRequest, raidRequest, transitionHeaderRequest, transitionWorkstreamRequest } from '../../lib/editRequests'
import OverdueTag from '../OverdueTag'
import DataGrid, { Clamp, FullList } from '../DataGrid'
import LegacyDashboard from './LegacyDashboard'
import { ReplyButton, ReplyDialog, type ReplyTarget } from '../RaidReplies'
import { useReplyCounts } from '../../lib/replies'
import { raidDone, sameName } from '../../lib/programTabs'
import { dateColumn, editColumn, renderColumn, statusColumn } from '../gridColumns'

// The Transition Dashboard (Neeta's review, 2026-11-11): each workstream is a heading, its rows
// are the phases it moves through, and each phase carries its own milestones and thumbs feedback.
// Below it, the RAID log. A click on a row shows everything, milestones included.

type DashRow =
  | { kind: 'workstream'; id: string; w: TransitionWorkstream; wi: number }
  | { kind: 'phase'; id: string; w: TransitionWorkstream; wi: number; p: PhaseRow }
type Shown = { w: TransitionWorkstream; wi: number }[]

const NoteLines = ({ p }: { p: PhaseRow }) =>
  p.notes?.length ? (
    <ul className="list-disc pl-4 space-y-1">
      {p.notes.map((n, k) => <li key={k} className={n.alert ? 'text-red-600' : undefined}>{n.text}</li>)}
    </ul>
  ) : <span className="text-slate-400">—</span>

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`
const phaseDone = (p: PhaseRow) => p.status === 'complete'
const voteLabel = (w: TransitionWorkstream, p: PhaseRow) => `${w.workstream} — ${p.phase}`
const alertText = (p: PhaseRow) => (p.notes ?? []).filter((n) => n.alert).map((n) => n.text)

function PhaseMilestones({ w, p }: { w: TransitionWorkstream; p: PhaseRow }) {
  const canEdit = !!useEditor()
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <MilestoneTable
        headLabel={`${p.phase} milestones`}
        sections={p.milestones.length || canEdit ? [{ id: p.id, title: p.phase, rows: p.milestones }] : []}
        headColor="#dfe3e6"
        headTextColor="#374151"
        sectionColor="#f1f5f9"
        sectionTextColor="#475569"
        locate={phaseMilestones(p.id, p.phase)}
        where={`Transition / ${w.workstream} / ${p.phase}`}
        fixedSections
      />
    </div>
  )
}

/** A workstream's heading: its name, rename, and add a phase it doesn't have yet. */
function WorkstreamHeading({ data, w, wi, className }: { data: TransitionData; w: TransitionWorkstream; wi: number; className: string }) {
  return (
    <div className={`flex items-center gap-2 px-3 bg-[#e8f1f8] text-[#10285c] ${className}`}>
      <span className="font-bold text-[14px] min-w-0 truncate" title={w.workstream}>{w.workstream}</span>
      <EditButton title={`Edit workstream ${w.workstream}`} request={() => transitionWorkstreamRequest(data, wi)} />
      {w.phases.length < TRANSITION_PHASES.length && (
        <span className="ml-auto font-normal"><AddButton compact request={() => phaseRequest(data, wi)}>{`Add a phase to ${w.workstream}`}</AddButton></span>
      )}
    </div>
  )
}

function PhaseGrid({ data, workstreams }: { data: TransitionData; workstreams: Shown }) {
  const canEdit = !!useEditor()
  const rows = useMemo<DashRow[]>(() => workstreams.flatMap(({ w, wi }) => [
    { kind: 'workstream' as const, id: `ws:${wi}`, w, wi },
    ...w.phases.map((p) => ({ kind: 'phase' as const, id: p.id, w, wi, p })),
  ]), [workstreams])
  const columns = useMemo<ColDef<DashRow>[]>(() => {
    const phase = (r: DashRow) => (r.kind === 'phase' ? r.p : undefined)
    return [
      renderColumn<DashRow>({ headerName: 'Phase', flex: 1, minWidth: 190 }, (r) => r.kind === 'phase' && (
        <div className="min-w-0 py-1">
          <Clamp title={r.p.phase} lines={1}><span className="font-semibold text-[#10285c]">{r.p.phase}</span><VisibleToPremera flagged={r.p.needsPremeraAttention} /></Clamp>
          {alertText(r.p).length > 0 && (
            <Clamp lines={1} title={alertText(r.p).join('\n')}><span className="text-[11px] text-red-600">{alertText(r.p).join(' · ')}</span></Clamp>
          )}
        </div>
      )),
      statusColumn<DashRow>('Status', (r) => phase(r)?.status ?? null, 130),
      { headerName: 'Start', width: 110, valueGetter: (v) => (v.data && phase(v.data)?.start) || '' },
      dateColumn<DashRow>('End', (r) => phase(r)?.end, (r) => !phase(r) || phaseDone(phase(r)!), 120),
      // A dash, not "0 milestones ›", where there are none: less to read for Premera.
      renderColumn<DashRow>({ headerName: 'Milestones', width: 120 }, (r) => r.kind === 'phase' && (r.p.milestones.length ? (
        <span className="text-xs font-semibold text-primary whitespace-nowrap" title="Click the row to see its milestones">
          {plural(r.p.milestones.length, 'milestone')} ›
        </span>
      ) : <span className="text-slate-300">—</span>)),
      renderColumn<DashRow>({ headerName: 'Feedback', width: 100 }, (r) => r.kind === 'phase' && <QuickFeedback itemId={r.p.id} itemLabel={voteLabel(r.w, r.p)} />),
      ...editColumn<DashRow>(canEdit, (r) => phaseRequest(data, r.wi, phase(r)), (r) => `Edit ${phase(r)?.phase ?? ''}`),
    ]
  }, [canEdit, data])
  const fullWidth = useMemo(() => ({
    is: (r: DashRow) => r.kind === 'workstream',
    height: 40,
    render: (r: DashRow) => <WorkstreamHeading data={data} w={r.w} wi={r.wi} className="h-full" />,
  }), [data])

  return (
    <DataGrid<DashRow>
      label="Workstream dashboard"
      rows={rows}
      columns={columns}
      rowId={(r) => r.id}
      rowHeight={48}
      pageSize={1000}
      fullWidth={fullWidth}
      emptyText="Nothing shared in this section yet."
      details={(r) => r.kind === 'phase' ? {
        title: r.p.phase,
        subtitle: r.w.workstream,
        fields: [
          { label: 'Status', value: <StatusLabel status={r.p.status} /> },
          { label: 'Start', value: r.p.start || '—' },
          { label: 'End', value: <>{r.p.end || '—'}<OverdueTag date={r.p.end} done={phaseDone(r.p)} /></> },
          { label: 'Notes', value: <NoteLines p={r.p} /> },
          ...(canEdit ? [{ label: 'Premera can see it', value: r.p.needsPremeraAttention ? 'Yes' : 'No (UST only)' }] : []),
        ],
        extra: <PhaseMilestones w={r.w} p={r.p} />,
        actions: <EditButton className="" title={`Edit ${r.p.phase}`} request={() => phaseRequest(data, r.wi, r.p)} />,
      } : { title: r.w.workstream, fields: [] }}
    />
  )
}

/** Phones: each workstream's phases as stacked cards; milestones open in place. */
function PhaseCards({ data, workstreams }: { data: TransitionData; workstreams: Shown }) {
  const canEdit = !!useEditor()
  if (!workstreams.length) return <p className="px-3 py-4 text-center text-sm text-slate-400">Nothing shared in this section yet.</p>
  return (
    <div>
      {workstreams.map(({ w, wi }) => (
        <div key={wi} role="group" aria-label={w.workstream}>
          <WorkstreamHeading data={data} w={w} wi={wi} className="py-2" />
          {w.phases.map((p) => (
            <div key={p.id} className="px-3 py-2.5 border-b border-slate-100 space-y-1.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-[#10285c]">{p.phase}<VisibleToPremera flagged={p.needsPremeraAttention} /></div>
                  <div className="text-xs text-slate-500">
                    {p.start || '—'} → {p.end || '—'}<OverdueTag date={p.end} done={phaseDone(p)} />
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <StatusLabel status={p.status} />
                  <EditButton title={`Edit ${p.phase}`} request={() => phaseRequest(data, wi, p)} />
                </div>
              </div>
              {p.notes?.length ? (
                <ul className="text-xs list-disc pl-4 space-y-0.5">
                  {p.notes.map((n, k) => <li key={k} className={n.alert ? 'text-red-600' : 'text-slate-600'}>{n.text}</li>)}
                </ul>
              ) : null}
              <div className="flex items-center justify-between gap-2">
                {p.milestones.length || canEdit ? (
                  <details className="min-w-0 flex-1">
                    <summary className="text-xs font-semibold text-primary cursor-pointer select-none">{plural(p.milestones.length, 'milestone')}</summary>
                    <div className="mt-2"><PhaseMilestones w={w} p={p} /></div>
                  </details>
                ) : <span className="flex-1" />}
                <QuickFeedback itemId={p.id} itemLabel={voteLabel(w, p)} />
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

/** All workstreams with a filter, or just `index` (a Program Level tab). */
export function WorkstreamDashboard({ data, index }: { data: TransitionData; index?: number }) {
  const [only, setOnly] = useState('')
  const all = useMemo<Shown>(() => data.dashboard.map((w, wi) => ({ w, wi })).filter(({ wi }) => index === undefined || wi === index), [data.dashboard, index])
  // A filter left on a workstream that was since renamed or removed shows everything again.
  const shown = useMemo(() => (all.some(({ w }) => w.workstream === only) ? all.filter(({ w }) => w.workstream === only) : all), [all, only])
  // Only one layout is mounted: every thumbs control fetches its vote, and the hidden phone cards
  // would otherwise fetch for all ~130 phase rows on a desktop.
  const phone = useMediaQuery('(max-width: 639.95px)')
  return (
    <>
      {index === undefined && data.dashboard.length > 1 && (
        <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100">
          <label htmlFor="ws-filter" className="text-xs font-semibold text-slate-500 shrink-0">Workstream</label>
          <select id="ws-filter" value={only} onChange={(e) => setOnly(e.target.value)} className="text-sm border border-slate-200 rounded px-2 py-1 min-w-0 max-w-full">
            <option value="">All workstreams</option>
            {data.dashboard.map((w, wi) => <option key={wi} value={w.workstream}>{w.workstream}</option>)}
          </select>
        </div>
      )}
      {phone ? <PhaseCards data={data} workstreams={shown} /> : <PhaseGrid data={data} workstreams={shown} />}
      {index === undefined && <div className="p-2"><AddButton request={() => transitionWorkstreamRequest(data)}>Add workstream</AddButton></div>}
    </>
  )
}

type RaidRow = RaidItem & { rowId: string; index: number }
type Replies = { counts: Record<string, number>; open: (t: ReplyTarget) => void }

/** Thumbs and the reply thread for a RAID item (only items with an id: the bundled sample has none). */
function RaidFeedback({ r, replies }: { r: RaidRow; replies: Replies }) {
  if (!r.id) return null
  return (
    <span className="flex items-center gap-2">
      <QuickFeedback itemId={r.id} itemLabel={r.description} />
      <ReplyButton target={{ id: r.id, label: r.description }} count={replies.counts[r.id] ?? 0} onOpen={replies.open} />
    </span>
  )
}

const RAID_WORD: Record<RaidItem['type'], string> = { R: 'Risk', A: 'Assumption', I: 'Issue', D: 'Dependency' }

/** Phones: one card per RAID item instead of a seven-column grid cut off at the side. */
function RaidCards({ data, rows, replies }: { data: TransitionData; rows: RaidRow[]; replies: Replies }) {
  if (!rows.length) return <p className="px-3 py-4 text-center text-sm text-slate-400">Nothing shared in this section yet.</p>
  return (
    <div aria-label="RAID log" role="group">
      <div className="px-3 py-2 bg-[#e8f1f8] text-[#10285c] font-bold text-sm">RAID log</div>
      {rows.map((r) => (
        <div key={r.rowId} className="px-3 py-2.5 border-b border-slate-100 space-y-1">
          <div className="flex items-start justify-between gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{RAID_WORD[r.type]}</span>
            <span className="flex items-center gap-1.5 text-xs text-slate-600">
              {r.status || '—'}
              <EditButton title="Edit RAID item" request={() => raidRequest(data, r.index)} />
            </span>
          </div>
          <div className="text-sm text-slate-800 break-words">{r.description}<VisibleToPremera flagged={r.needsPremeraAttention} /></div>
          {r.mitigation.length > 0 && <div className="text-xs text-slate-600"><FullList items={r.mitigation} /></div>}
          <div className="text-xs text-slate-500">
            {r.owner || '—'} · Due {r.dueDate || '—'}<OverdueTag date={r.dueDate} done={raidDone(r)} />
          </div>
          <RaidFeedback r={r} replies={replies} />
        </div>
      ))}
    </div>
  )
}

/** The RAID log: with `workstream`, that workstream's items (a Program Level tab); otherwise the
 * generic, program-wide items that belong to no workstream (the Transition Summary Report). */
export function RaidGrid({ data, workstream }: { data: TransitionData; workstream?: string }) {
  const canEdit = !!useEditor()
  const phone = useMediaQuery('(max-width: 639.95px)')
  const { counts, bump } = useReplyCounts()
  const [replyTo, setReplyTo] = useState<ReplyTarget | null>(null)
  const replies = useMemo<Replies>(() => ({ counts, open: setReplyTo }), [counts])
  const thread = <ReplyDialog target={replyTo} onClose={() => setReplyTo(null)} onPosted={bump} />
  const rows = useMemo<RaidRow[]>(() => data.raid.map((r, index) => ({ ...r, rowId: r.id ?? String(index), index }))
    .filter((r) => (workstream === undefined ? !r.workstream?.trim() : sameName(r.workstream, workstream))), [data.raid, workstream])
  const columns = useMemo<ColDef<RaidRow>[]>(() => [
    renderColumn<RaidRow>({ headerName: 'RAID', width: 80, cellClass: 'flex items-center justify-center font-semibold' }, (r) => r.type),
    renderColumn<RaidRow>({ headerName: 'Description', flex: 2, minWidth: 190 }, (r) => (
      <Clamp title={r.description}>{r.description}<VisibleToPremera flagged={r.needsPremeraAttention} /></Clamp>
    )),
    { headerName: 'Mitigation Plan / Next Steps', flex: 2, minWidth: 190, valueGetter: (p) => p.data?.mitigation },
    { headerName: 'Owner', width: 140, valueGetter: (p) => p.data?.owner },
    dateColumn<RaidRow>('Due Date', (r) => r.dueDate, raidDone, 120),
    { headerName: 'Status', width: 120, valueGetter: (p) => p.data?.status },
    renderColumn<RaidRow>({ headerName: 'Feedback', width: 200 }, (r) => <RaidFeedback r={r} replies={replies} />),
    ...editColumn<RaidRow>(canEdit, (r) => raidRequest(data, r.index), () => 'Edit RAID item'),
  ], [canEdit, data, replies])

  const add = <div className="p-2"><AddButton request={() => raidRequest(data, undefined, workstream)}>Add RAID item</AddButton></div>
  if (phone) return <><RaidCards data={data} rows={rows} replies={replies} />{add}{thread}</>
  return (
    <>
      <DataGrid<RaidRow>
        label="RAID log"
        rows={rows}
        columns={columns}
        rowId={(r) => r.rowId}
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
          extra: <RaidFeedback r={r} replies={replies} />,
          actions: <EditButton className="" title="Edit RAID item" request={() => raidRequest(data, r.index)} />,
        })}
      />
      {add}
      {thread}
    </>
  )
}

/** The Transition Summary Report's dashboard: the pre-phase slide layout, then the full RAID log. */
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
        <LegacyDashboard data={data} />
      </div>
      <div className="card overflow-hidden">
        <RaidGrid data={data} />
      </div>
    </section>
  )
}
