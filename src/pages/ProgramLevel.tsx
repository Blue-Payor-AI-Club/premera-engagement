import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AgGridReact } from 'ag-grid-react'
import type {
  ColDef,
  GetRowIdParams,
  ICellRendererParams,
  IsFullWidthRowParams,
} from 'ag-grid-community'
import { AllCommunityModule, ModuleRegistry, themeQuartz } from 'ag-grid-community'
import Accordion from '@mui/material/Accordion'
import AccordionSummary from '@mui/material/AccordionSummary'
import AccordionDetails from '@mui/material/AccordionDetails'
import {
  Share2,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Flag,
} from 'lucide-react'
import MilestoneTable from '../components/MilestoneTable'
import SlideHeader from '../components/SlideHeader'
import Legend from '../components/Legend'
import TransitionTab from '../components/transition/TransitionTab'
import { TRANSITION_DATA } from '../data/transitionData'
import StatusDot from '../components/StatusDot'
import QuickFeedback from '../components/QuickFeedback'
import { usePortalData } from '../context/PortalDataContext'
import type { WorkstreamIcon, Workstream, IssueRow, MilestoneSection } from '../data/portalData'
import { WORKSTREAM_ICON_COMPONENTS } from '../data/workstreamIcons'
import { STATUS, type StatusKey } from '../data/status'

ModuleRegistry.registerModules([AllCommunityModule])

// ─── Types ────────────────────────────────────────────────────────────────────

type WorkstreamRow = Workstream & { _expanded: boolean }

interface DetailRow {
  _rowType: 'detail'
  _parentId: string
  milestones: MilestoneSection[]
  name: string
  icon: WorkstreamIcon
}

type GridRow = WorkstreamRow | DetailRow

const isDetailRow = (row: unknown): row is DetailRow =>
  !!row && typeof row === 'object' && '_rowType' in row && (row as DetailRow)._rowType === 'detail'

// ─── React context — propagates into AG-Grid cell renderers ───────────────────

const ExpandContext = createContext<(id: string) => void>(() => {})

// ─── Constants ────────────────────────────────────────────────────────────────

const ICONS = WORKSTREAM_ICON_COMPONENTS

const isAtRisk = (s: string) => s === 'atRisk' || s === 'delayed'

type ProgramTab = 'ito' | 'bpo' | 'transition'
const PROGRAM_TABS: ProgramTab[] = ['ito', 'bpo', 'transition']

const TAB_META: Record<ProgramTab, { short: string; full: string }> = {
  ito: { short: 'ITO', full: 'Infrastructure & Technology Operations' },
  bpo: { short: 'BPO', full: 'Business Process Operations' },
  transition: { short: 'Transition', full: 'Executive Summary & Dashboard' },
}

const portalTheme = themeQuartz.withParams({
  headerBackgroundColor: '#dfe3e6',
  headerTextColor: '#374151',
  headerFontSize: 13,
  headerFontWeight: 600,
  fontFamily: 'inherit',
  fontSize: 13,
  cellTextColor: '#334155',
  borderColor: '#f1f5f9',
  rowHoverColor: '#f8fafc',
  selectedRowBackgroundColor: '#e7f1fa',
})

// ─── Cell renderers ───────────────────────────────────────────────────────────

function OperationalAreaRenderer({ data }: ICellRendererParams) {
  const toggleExpand = useContext(ExpandContext)
  if (!data || isDetailRow(data)) return null
  const ws = data as WorkstreamRow
  const Icon = ICONS[ws.icon] ?? Share2
  return (
    <div className="flex items-center gap-2 h-full py-1">
      <button
        onClick={e => { e.stopPropagation(); toggleExpand(ws.id) }}
        className="shrink-0 text-slate-400 hover:text-[#0067b1] transition"
        title={ws._expanded ? 'Collapse milestones' : 'Expand milestones'}
      >
        {ws._expanded
          ? <ChevronDown size={15} />
          : <ChevronRight size={15} />}
      </button>
      <Icon size={18} className="text-slate-500 shrink-0" />
      <span className="font-semibold text-[#0067b1] text-sm leading-snug">{ws.name}</span>
    </div>
  )
}

function StatusRenderer({ data }: ICellRendererParams) {
  if (!data || isDetailRow(data)) return null
  const ws = data as WorkstreamRow
  const meta = STATUS[ws.status as StatusKey]
  return (
    <div className="flex items-center gap-1.5 h-full px-1">
      <StatusDot status={ws.status} title={ws.statusMessage} />
      <span className="text-xs font-semibold" style={{ color: meta?.color }}>
        {meta?.label ?? ws.status}
      </span>
    </div>
  )
}

function FeedbackRenderer({ data }: ICellRendererParams) {
  if (!data || isDetailRow(data)) return null
  const ws = data as WorkstreamRow
  return (
    <div className="flex items-center justify-center h-full w-full" onClick={e => e.stopPropagation()}>
      <QuickFeedback itemId={ws.id} itemLabel={ws.name} />
    </div>
  )
}

function ActionRequiredRenderer({ data, context }: ICellRendererParams) {
  if (!data || isDetailRow(data)) return null
  const ws = data as WorkstreamRow
  // Backend strips needsPremeraAttention from Workstream; derive from status instead
  if (!ws.needsPremeraAttention && ws.status !== 'atRisk' && ws.status !== 'delayed') return null
  // Use AG-Grid context prop — the only mechanism that crosses the separate React root boundary
  const nav = (context as { navigate?: (to: string) => void })?.navigate
  return (
    <div className="flex items-center justify-center h-full w-full">
      <button
        title="View risks & issues requiring Premera attention"
        onClick={(e) => { e.stopPropagation(); nav?.('/risks') }}
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 transition"
      >
        <Flag size={12} className="text-red-500" />
        <span>View</span>
      </button>
    </div>
  )
}

function BulletsRenderer({ value }: ICellRendererParams) {
  const items = value as string[] | undefined
  if (!items?.length) return null
  return (
    <ul className="space-y-1 py-2">
      {items.map((t, i) => (
        <li key={i} className="flex gap-2 text-sm text-slate-700 leading-snug">
          <span className="text-slate-400 shrink-0">•</span>
          <span>{t}</span>
        </li>
      ))}
    </ul>
  )
}

function MilestoneDetailRenderer({ data }: ICellRendererParams) {
  const row = data as DetailRow
  if (!row) return null
  return (
    <div className="px-6 py-4 bg-[#f8fafc] border-l-4 border-[#0067b1]">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
          Key Milestones — {row.name}
        </span>
      </div>
      <MilestoneTable
        headLabel="Key Milestones"
        statusLabel="Status"
        sections={row.milestones}
        headColor="#dfe3e6"
        headTextColor="#374151"
        sectionColor="#f1f5f9"
        sectionTextColor="#475569"
      />
    </div>
  )
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function ExpandMoreIcon({ sx }: { sx?: { color?: string; fontSize?: number } }) {
  return <ChevronDown size={sx?.fontSize ?? 18} color={sx?.color ?? '#94a3b8'} />
}

function WsIcon({ icon }: { icon: WorkstreamIcon }) {
  const Icon = ICONS[icon] ?? Share2
  return <Icon size={18} className="text-slate-500 shrink-0" />
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1 text-sm text-slate-700">
      {items.map((t, i) => (
        <li key={i} className="flex gap-2">
          <span className="text-slate-400">•</span>
          <span>{t}</span>
        </li>
      ))}
    </ul>
  )
}

function HealthScorecard({ workstreams }: { workstreams: Workstream[] }) {
  const total = workstreams.length
  const counts = workstreams.reduce<Record<string, number>>((acc, ws) => {
    acc[ws.status] = (acc[ws.status] ?? 0) + 1
    return acc
  }, {})
  const onTrack = counts['onTrack'] ?? 0
  const atRisk = (counts['atRisk'] ?? 0) + (counts['delayed'] ?? 0)
  const complete = counts['complete'] ?? 0

  return (
    <div data-tour="scorecard" className="flex flex-wrap items-center gap-3 mb-4 px-4 py-3 rounded-lg border border-slate-200 bg-white shadow-sm">
      <span className="text-lg font-bold text-slate-500 tracking-wide">
        Program Scorecard : {total} Operational Areas
      </span>
      <div className="flex flex-wrap gap-2 ml-auto">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-green-50 border border-green-200">
          <span className="h-2 w-2 rounded-full shrink-0" style={{ background: '#1aa260' }} />
          <span className="text-xs font-semibold text-green-800">On Track: {onTrack}</span>
        </div>
        {atRisk > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-50 border border-amber-200">
            <span className="h-2 w-2 rounded-full shrink-0" style={{ background: '#f2b705' }} />
            <span className="text-xs font-semibold text-amber-800">At Risk / Delayed: {atRisk}</span>
          </div>
        )}
        {complete > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-purple-50 border border-purple-200">
            <span className="h-2 w-2 rounded-full shrink-0" style={{ background: '#8e44ad' }} />
            <span className="text-xs font-semibold text-purple-800">Complete: {complete}</span>
          </div>
        )}
      </div>
    </div>
  )
}

function RisksSection({ issues }: { issues: IssueRow[] }) {
  const atRiskCount = issues.filter(r => isAtRisk(r.status)).length
  const premeraCount = issues.filter(r => r.needsPremeraAttention).length
  if (atRiskCount === 0) return null
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6 px-4 py-3 rounded-lg border border-slate-200 bg-slate-50">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-100 border border-amber-200 w-full sm:w-auto">
          <AlertTriangle size={13} className="text-amber-500 shrink-0" />
          <span className="text-xs font-semibold text-amber-800">
            Risks &amp; Issues: <span className="text-amber-600">{atRiskCount}</span>
          </span>
        </div>
        {premeraCount > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-red-100 border border-red-200 w-full sm:w-auto">
            <Flag size={13} className="text-red-500 shrink-0" />
            <span className="text-xs font-semibold text-red-800">
              Attention required from Premera: <span className="text-red-600">{premeraCount}</span>
            </span>
          </div>
        )}
      </div>
      <Link
        to="/risks"
        className="inline-flex items-center gap-1 text-xs font-semibold text-[#0067b1] hover:text-[#0056a0] transition self-end sm:self-auto"
      >
        View all <ChevronRight size={13} />
      </Link>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ProgramLevel() {
  const { data } = usePortalData()
  const navigate = useNavigate()
  const [tab, setTab] = useState<ProgramTab>('ito')
  // The ITO/BPO division whose data the grid/scorecard use. Stays put while the Transition
  // tab (which has its own content) is open, so switching back restores the same view.
  const [division, setDivision] = useState<'ito' | 'bpo'>('ito')
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const p = data.program[division]
  const isTransition = tab === 'transition'
  // Synced from the workbook; the bundled copy only covers an API that predates the block.
  const transition = data.transition ?? TRANSITION_DATA

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }, [])

  const handleTabChange = useCallback((k: ProgramTab) => {
    setTab(k)
    if (k !== 'transition') setDivision(k)
    setExpandedIds(new Set())
  }, [])

  // Build row data: workstream rows interleaved with full-width detail rows
  const rowData = useMemo<GridRow[]>(() => {
    const rows: GridRow[] = []
    for (const ws of p.workstreams) {
      const expanded = expandedIds.has(ws.id)
      rows.push({ ...ws, _expanded: expanded })
      if (expanded) {
        rows.push({
          _rowType: 'detail',
          _parentId: ws.id,
          milestones: ws.milestones ?? [],
          name: ws.name,
          icon: ws.icon,
        })
      }
    }
    return rows
  }, [p.workstreams, expandedIds])

  const columnDefs = useMemo<ColDef[]>(() => [
    {
      headerName: 'Operational Area',
      field: 'name',
      minWidth: 160,
      flex: 2,
      sortable: true,
      resizable: true,
      cellRenderer: OperationalAreaRenderer,
      autoHeight: true,
      wrapText: true,
    },
    {
      headerName: 'Status',
      field: 'status',
      width: 150,
      sortable: true,
      resizable: true,
      cellRenderer: StatusRenderer,
    },
    {
      headerName: 'Feedback',
      colId: 'feedback',
      width: 110,
      sortable: false,
      resizable: true,
      cellRenderer: FeedbackRenderer,
      headerClass: 'ag-center-aligned-header',
    },
    {
      headerName: 'Action Required',
      field: 'needsPremeraAttention',
      width: 145,
      sortable: true,
      resizable: true,
      cellRenderer: ActionRequiredRenderer,
      headerClass: 'ag-center-aligned-header',
    },
    {
      headerName: 'Key Accomplishments',
      field: 'accomplishments',
      minWidth: 200,
      flex: 3,
      sortable: false,
      resizable: true,
      cellRenderer: BulletsRenderer,
      autoHeight: true,
      wrapText: true,
    },
    {
      headerName: 'Planned Activities',
      field: 'activities',
      minWidth: 200,
      flex: 3,
      sortable: false,
      resizable: true,
      cellRenderer: BulletsRenderer,
      autoHeight: true,
      wrapText: true,
    },
  ], [])

  const defaultColDef = useMemo<ColDef>(() => ({ resizable: true }), [])

  const getRowId = useCallback((params: GetRowIdParams) => {
    const row = params.data as GridRow
    return isDetailRow(row) ? `detail-${row._parentId}` : row.id
  }, [])

  const isFullWidthRow = useCallback((params: IsFullWidthRowParams) =>
    isDetailRow(params.rowNode.data), [])

  // Estimate height for detail rows based on milestone content
  const getRowHeight = useCallback((params: { data: unknown }) => {
    const row = params.data as GridRow
    if (!isDetailRow(row)) return undefined
    const totalRows = row.milestones.reduce((sum, s) => sum + s.rows.length, 0)
    // header: 44 + section-headers × 32 + data-rows × 38 + chrome: 48
    return 44 + row.milestones.length * 32 + totalRows * 38 + 64
  }, [])

  return (
    <div className="slide">
      <SlideHeader
        title={isTransition ? 'Transition Program' : `${p.levelLabel} Highlights`}
        sampleLines={isTransition ? [] : ['Program Level Status Reporting Sample']}
        asOf={isTransition ? transition.asOf : data.asOf}
      />

      {/* Scorecard and risks summarise the selected ITO/BPO division — not applicable to Transition. */}
      {!isTransition && <HealthScorecard workstreams={p.workstreams} />}

      {!isTransition && <RisksSection issues={p.issues} />}

      {/* ITO / BPO segmented switcher */}
      <div data-tour="tab-switcher" className="mb-6 p-1 rounded-xl bg-slate-100 flex gap-1" role="tablist" aria-label="Program division">
        {PROGRAM_TABS.map((k) => (
          <button
            key={k}
            role="tab"
            aria-selected={tab === k}
            onClick={() => handleTabChange(k)}
            className={`flex-1 py-2.5 px-4 rounded-lg flex flex-col items-center gap-0.5 transition-all duration-200 ${
              tab === k
                ? 'bg-white shadow-sm text-[#0067b1] ring-1 ring-slate-200/80'
                : 'text-slate-500 hover:text-slate-700 hover:bg-white/60 cursor-pointer'
            }`}
          >
            <span className={`text-sm font-bold tracking-wide ${tab === k ? 'text-[#0067b1]' : 'text-slate-600'}`}>
              {TAB_META[k].short}
            </span>
            <span className={`text-[11px] leading-tight ${tab === k ? 'text-[#0067b1]/70' : 'text-slate-400'}`}>
              {TAB_META[k].full}
            </span>
          </button>
        ))}
      </div>

      {isTransition ? <TransitionTab data={transition} /> : (
      <div className="space-y-6">

        {/* ── AG-Grid (desktop md+) ── */}
        <div data-tour="workstream-grid" className="card overflow-hidden hidden md:block">
          <ExpandContext.Provider value={toggleExpand}>
            <AgGridReact
              theme={portalTheme}
              rowData={rowData as WorkstreamRow[]}
              columnDefs={columnDefs}
              defaultColDef={defaultColDef}
              getRowId={getRowId}
              domLayout="autoHeight"
              pagination={true}
              paginationPageSize={10}
              paginationPageSizeSelector={[10, 20, 50]}
              rowSelection={{ mode: 'singleRow', checkboxes: false, enableClickSelection: false }}
              headerHeight={40}
              suppressCellFocus={true}
              isFullWidthRow={isFullWidthRow}
              fullWidthCellRenderer={MilestoneDetailRenderer}
              getRowHeight={getRowHeight}
              context={{ navigate }}
            />
          </ExpandContext.Provider>
        </div>

        {/* ── Accordion (mobile <md) ── */}
        <div className="md:hidden card overflow-hidden">
          {p.workstreams.map((w) => (
            <Accordion
              key={w.id}
              disableGutters
              elevation={0}
              square
              sx={{
                borderBottom: '1px solid #f1f5f9',
                '&:before': { display: 'none' },
                '&.Mui-expanded': { margin: 0 },
              }}
            >
              {/* AccordionSummary renders as <button> — keep only non-interactive content here */}
              <AccordionSummary
                expandIcon={<ExpandMoreIcon sx={{ color: '#94a3b8' }} />}
                sx={{
                  padding: '0 8px 0 12px',
                  '& .MuiAccordionSummary-content': { margin: '10px 0' },
                  '&:hover': { background: '#f8fafc' },
                }}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <WsIcon icon={w.icon} />
                  <span className="font-semibold text-[#0067b1] text-sm leading-snug">{w.name}</span>
                  <StatusDot status={w.status} />
                </div>
              </AccordionSummary>

              <AccordionDetails
                sx={{ padding: '0 12px 12px', background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}
              >
                {/* Status + feedback + action row — interactive elements must be outside AccordionSummary <button> */}
                <div className="flex items-center justify-between gap-2 pt-2 pb-3">
                  <div className="flex items-center gap-2">
                    <StatusDot status={w.status} />
                    <span className="text-xs font-semibold" style={{ color: w.status === 'atRisk' || w.status === 'delayed' ? '#d97706' : '#16a34a' }}>
                      {w.status === 'atRisk' ? 'At Risk' : w.status === 'delayed' ? 'Delayed' : w.status === 'complete' ? 'Complete' : 'On Track'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {w.needsPremeraAttention && (
                      <button
                        onClick={() => navigate('/risks')}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 transition"
                      >
                        <Flag size={11} className="text-red-500" />
                        View Issues
                      </button>
                    )}
                    <QuickFeedback itemId={w.id} itemLabel={w.name} />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                  <div>
                    <div className="text-xs font-semibold text-slate-500 mb-1">Key Accomplishments</div>
                    <Bullets items={w.accomplishments} />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-500 mb-1">Planned Activities</div>
                    <Bullets items={w.activities} />
                  </div>
                </div>
                <MilestoneTable
                  headLabel="Key Milestones"
                  statusLabel="Status"
                  sections={w.milestones ?? []}
                />
              </AccordionDetails>
            </Accordion>
          ))}
        </div>

        <div className="card overflow-hidden">
          <MilestoneTable headLabel="Key Milestones" statusLabel="Status" sections={p.milestones} />
        </div>

      </div>
      )}

      <div className="mt-8 flex justify-center md:justify-end">
        <Legend />
      </div>
    </div>
  )
}
