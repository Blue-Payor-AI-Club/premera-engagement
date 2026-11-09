import { useCallback, useLayoutEffect, useMemo, useRef } from 'react'
import type { ColDef } from 'ag-grid-community'
import { type MilestoneRow, type MilestoneSection, type PortalData } from '../data/portalData'
import DataGrid, { Clamp } from './DataGrid'
import { dateColumn, editColumn, renderColumn, statusColumn } from './gridColumns'
import StatusLabel from './StatusLabel'
import { milestoneRowRequest, milestoneSectionRequest } from '../lib/editRequests'
import StatusDot from './StatusDot'
import QuickFeedback from './QuickFeedback'
import VisibleToPremera from './VisibleToPremera'
import { AddButton, EditButton, useEditor } from './Editor'
import OverdueTag from './OverdueTag'

type GridRow =
  | { kind: 'section'; id: string; section: MilestoneSection }
  | { kind: 'row'; id: string; section: MilestoneSection; row: MilestoneRow }

interface Props {
  headLabel: string
  statusLabel?: string
  sections: MilestoneSection[]
  headColor?: string
  headTextColor?: string
  sectionColor?: string
  sectionTextColor?: string
  /** Set false to hide the Feedback column/vote control — used by the Admin preview,
   * which renders the whole document at once and shouldn't fire a vote-fetch per row
   * or let an admin cast votes from a read-only preview. */
  showFeedback?: boolean
  /** Makes the table editable for UST: finds these same sections in a copy of the document. */
  locate?: (d: PortalData) => MilestoneSection[]
  /** Where these milestones live, for the Activity log (e.g. "ITO program"). */
  where?: string
}

export default function MilestoneTable({
  headLabel,
  statusLabel = 'Status',
  sections,
  headColor = '#1f9bb0',
  headTextColor = '#ffffff',
  sectionColor = '#eceadb',
  sectionTextColor = '#334155',
  showFeedback = true,
  locate,
  where = 'milestones',
}: Props) {
  const editable = !!useEditor() && !!locate
  const sectionReq = (s: MilestoneSection) => () => milestoneSectionRequest(locate!, where, s)
  const rowReq = (s: MilestoneSection, r: MilestoneSection['rows'][number]) => () => milestoneRowRequest(locate!, s.id, r)
  // Phone layout has no columns, so the pencil sits at the end of the line there.
  const editSection = (s: MilestoneSection) => editable && <EditButton title={`Edit section ${s.title}`} request={sectionReq(s)} />
  const editRow = (s: MilestoneSection, r: MilestoneSection['rows'][number]) =>
    editable && <EditButton title={`Edit milestone ${r.label}`} className="" request={rowReq(s, r)} />
  const addRow = (s: MilestoneSection) => editable && <AddButton request={() => milestoneRowRequest(locate!, s.id)}>Add milestone</AddButton>
  // locate is often a fresh function each render; reading it through a ref keeps the grid's
  // columns stable (the ref is only read when an Edit button is clicked).
  const locateRef = useRef(locate)
  useLayoutEffect(() => { locateRef.current = locate })
  const liveLocate = useCallback((d: PortalData) => locateRef.current!(d), [])
  const gridRows = useMemo<GridRow[]>(() => sections.flatMap((section) => [
    { kind: 'section' as const, id: `section:${section.id}`, section },
    ...section.rows.map((row) => ({ kind: 'row' as const, id: row.id, section, row })),
  ]), [sections])
  const columns = useMemo<ColDef<GridRow>[]>(() => {
    const row = (r: GridRow) => (r.kind === 'row' ? r.row : undefined)
    return [
      renderColumn<GridRow>({ headerName: 'Milestone', flex: 1, minWidth: 220 }, (r) => r.kind === 'row' && (
        <Clamp title={r.row.label}>{r.row.label}<VisibleToPremera flagged={r.row.needsPremeraAttention} /></Clamp>
      )),
      dateColumn<GridRow>('Due Date', (r) => row(r)?.due, (r) => !!row(r)?.revised || row(r)?.status === 'complete', 120),
      dateColumn<GridRow>('Revised Date', (r) => row(r)?.revised, (r) => row(r)?.status === 'complete', 120),
      statusColumn<GridRow>(statusLabel, (r) => row(r)?.status ?? null, 130),
      ...(showFeedback ? [renderColumn<GridRow>({ headerName: 'Feedback', width: 100 }, (r) => r.kind === 'row' && <QuickFeedback itemId={r.row.id} itemLabel={r.row.label} />)] : []),
      // eslint-disable-next-line react-hooks/refs -- editColumn calls this only when Edit is clicked, never during render
      ...editColumn<GridRow>(editable, (r) => milestoneRowRequest(liveLocate, r.section.id, row(r)), (r) => `Edit milestone ${row(r)?.label ?? ''}`),
    ]
  }, [editable, showFeedback, statusLabel, liveLocate])

  const addSection = editable && (
    <div className="px-3 py-2"><AddButton request={() => milestoneSectionRequest(locate!, where)}>Add milestone section</AddButton></div>
  )

  return (
    <div>
      {/* ---- Desktop / tablet: grid, section titles as full-width rows ---- */}
      <div className="hidden sm:block">
        <div style={{ background: headColor, color: headTextColor }} className="font-semibold px-3 py-2 text-sm">{headLabel}</div>
        {sections.length === 0 && !editable ? (
          <p className="px-3 py-4 text-center text-sm text-slate-400">No milestones shared yet.</p>
        ) : (
          <DataGrid<GridRow>
            label={headLabel}
            rows={gridRows}
            columns={columns}
            rowId={(r) => r.id}
            rowHeight={44}
            fullWidth={{
              is: (r) => r.kind === 'section',
              height: 38,
              render: (r) => (
                <div className="flex items-center gap-2 h-full px-3 font-semibold text-[13px]" style={{ background: sectionColor, color: sectionTextColor }}>
                  <span className="truncate" title={r.section.title}>{r.section.title}</span>
                  {editSection(r.section)}
                  <span className="ml-auto">{addRow(r.section)}</span>
                </div>
              ),
            }}
            details={(r) => r.kind === 'row' ? {
              title: r.row.label,
              subtitle: r.section.title,
              fields: [
                { label: 'Due date', value: <>{r.row.due || '—'}{!r.row.revised && <OverdueTag date={r.row.due} done={r.row.status === 'complete'} />}</> },
                { label: 'Revised date', value: <>{r.row.revised || '—'}<OverdueTag date={r.row.revised} done={r.row.status === 'complete'} /></> },
                { label: statusLabel, value: <StatusLabel status={r.row.status} /> },
                ...(editable ? [{ label: 'Premera can see it', value: r.row.needsPremeraAttention ? 'Yes' : 'No (UST only)' }] : []),
              ],
              actions: editable ? <EditButton className="" title={`Edit milestone ${r.row.label}`} request={rowReq(r.section, r.row)} /> : undefined,
            } : { title: r.section.title, fields: [] }}
          />
        )}
        {addSection}
      </div>

      {/* ---- Mobile stacked list ---- */}
      <div className="sm:hidden">
        <div style={{ background: headColor, color: headTextColor }} className="font-semibold px-3 py-2 text-sm">
          {headLabel}
        </div>
        {sections.length === 0 && !editable && <p className="px-3 py-4 text-center text-sm text-slate-400">No milestones shared yet.</p>}
        {sections.map((section) => (
          <div key={section.id}>
            <div style={{ background: sectionColor, color: sectionTextColor }} className="px-3 py-1.5 font-semibold text-[13px]">
              {section.title}{editSection(section)}
            </div>
            {section.rows.map((row) => (
              <div key={row.id} className="flex items-start justify-between gap-3 px-3 py-2 border-b border-slate-100">
                <div className="min-w-0">
                  <div className="text-sm text-slate-700">{row.label}<VisibleToPremera flagged={row.needsPremeraAttention} /></div>
                  {(row.due || row.revised) && (
                    <div className="text-xs text-slate-500 mt-0.5">
                      {row.due && <>Due {row.due}</>}
                      {row.revised && <> · Revised {row.revised}</>}
                      <OverdueTag date={row.revised || row.due} done={row.status === 'complete'} />
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0 pt-0.5">
                  <StatusDot status={row.status} />
                  {showFeedback && <QuickFeedback itemId={row.id} itemLabel={row.label} />}
                  {editRow(section, row)}
                </div>
              </div>
            ))}
            {editable && <div className="px-3 py-1.5">{addRow(section)}</div>}
          </div>
        ))}
        {addSection}
      </div>
    </div>
  )
}
