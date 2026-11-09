import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { AgGridReact } from 'ag-grid-react'
import {
  AllCommunityModule, ModuleRegistry, themeQuartz,
  type CellClickedEvent, type ColDef, type ColGroupDef, type GetRowIdParams, type ICellRendererParams, type IsFullWidthRowParams, type RowHeightParams,
} from 'ag-grid-community'
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog'

ModuleRegistry.registerModules([AllCommunityModule])

// The one grid used for every table of portal data on desktop. Rows have a fixed height and long
// text is cut off after two lines with "…"; clicking a row opens its full details in a popup.
// Phone layouts keep their own stacked cards (a wide grid is hard to use on a small screen).

const gridTheme = themeQuartz.withParams({
  headerBackgroundColor: '#dfe3e6',
  headerTextColor: '#374151',
  headerFontSize: 12,
  headerFontWeight: 600,
  fontFamily: 'inherit',
  fontSize: 13,
  cellTextColor: '#334155',
  borderColor: '#e2e8f0',
  rowHoverColor: '#f1f7fc',
  oddRowBackgroundColor: '#fafbfc',
  wrapperBorderRadius: 0,
  cellHorizontalPadding: 12,
})

export interface DetailField {
  label: string
  value: ReactNode
}

export interface RowDetails {
  title: ReactNode
  subtitle?: ReactNode
  fields: DetailField[]
  /** Extra content under the fields (e.g. a workstream's milestones). */
  extra?: ReactNode
  /** Buttons in the popup's footer (e.g. Edit, Open actions). */
  actions?: ReactNode
}

/** Up to two lines, then "…"; the full text is in the tooltip and the row's details popup. */
export function Clamp({ children, title, lines = 2 }: { children: ReactNode; title?: string; lines?: 1 | 2 | 3 }) {
  const clamp = lines === 1 ? 'line-clamp-1' : lines === 3 ? 'line-clamp-3' : 'line-clamp-2'
  return <div className={`${clamp} whitespace-normal break-words leading-snug`} title={title}>{children}</div>
}

/** Bullet lists in a fixed-height cell: one run of text, clamped. */
export function ClampList({ items }: { items?: string[] }) {
  if (!items?.length) return <span className="text-slate-300">—</span>
  const text = items.map((t) => `• ${t}`).join('  ')
  return <Clamp title={items.join('\n')}>{text}</Clamp>
}

/** Full list for the details popup. */
export function FullList({ items }: { items?: string[] }) {
  if (!items?.length) return <span className="text-slate-400">—</span>
  return (
    <ul className="list-disc pl-4 space-y-1">
      {items.map((t, i) => <li key={i}>{t}</li>)}
    </ul>
  )
}

/** A plain-text cell renderer (strings and string lists), clamped. */
export function TextCell({ value }: ICellRendererParams) {
  if (Array.isArray(value)) return <ClampList items={value as string[]} />
  if (value === undefined || value === null || value === '') return <span className="text-slate-300">—</span>
  return <Clamp title={String(value)}>{String(value)}</Clamp>
}

interface Props<T> {
  rows: T[]
  columns: (ColDef<T> | ColGroupDef<T>)[]
  rowId: (row: T) => string
  /** What the details popup shows for a row; omit for no popup. */
  details?: (row: T) => RowDetails
  /** Full-width rows (e.g. milestone section headers). */
  fullWidth?: { is: (row: T) => boolean; render: (row: T) => ReactNode; height?: number }
  rowHeight?: number
  /** Accessible name for the grid. */
  label: string
  emptyText?: string
  /** Page the grid when it has more rows than this. */
  pageSize?: number
  context?: unknown
  getRowClass?: (row: T) => string | undefined
}

const INTERACTIVE = 'button, a, input, select, textarea, [role="button"], [data-no-details]'

export default function DataGrid<T>({
  rows, columns, rowId, details, fullWidth, rowHeight = 56, label, emptyText = 'Nothing to show.', pageSize = 25, context, getRowClass,
}: Props<T>) {
  // By id, so the popup shows the live row (e.g. right after editing it from the popup).
  const [openId, setOpenId] = useState<string | null>(null)
  const gridRef = useRef<AgGridReact<T>>(null)
  // Cells that render a whole row (badges, buttons) have no value for AG-Grid to compare, so it
  // would keep showing the old row after an edit. Redraw every cell when the rows change.
  useEffect(() => { gridRef.current?.api?.refreshCells({ force: true }) }, [rows])
  const open = openId === null ? undefined : rows.find((r) => rowId(r) === openId)

  const defaultColDef = useMemo<ColDef<T>>(() => ({
    resizable: true,
    sortable: false,
    cellRenderer: TextCell,
    cellClass: 'flex items-center',
    suppressMovable: true,
  }), [])

  const getRowId = useCallback((p: GetRowIdParams<T>) => rowId(p.data), [rowId])
  const isFullWidthRow = useCallback((p: IsFullWidthRowParams<T>) => !!fullWidth && !!p.rowNode.data && fullWidth.is(p.rowNode.data), [fullWidth])
  const getRowHeight = useCallback((p: RowHeightParams<T>) =>
    (fullWidth && p.data && fullWidth.is(p.data) ? fullWidth.height ?? 34 : rowHeight), [fullWidth, rowHeight])
  const FullWidthRenderer = useCallback((p: ICellRendererParams<T>) => (p.data && fullWidth ? <>{fullWidth.render(p.data)}</> : null), [fullWidth])

  const onCellClicked = useCallback((e: CellClickedEvent<T>) => {
    // Buttons, links and fields inside a cell do their own thing; only a plain click opens details.
    const target = e.event?.target
    if (!details || !e.data || (target instanceof Element && target.closest(INTERACTIVE))) return
    setOpenId(rowId(e.data))
  }, [details, rowId])

  const d = open && details ? details(open) : null
  const paged = rows.length > pageSize

  return (
    <>
      <div className={details ? '[&_.ag-row]:cursor-pointer' : undefined} aria-label={label} role="region">
        <AgGridReact<T>
          ref={gridRef}
          theme={gridTheme}
          rowData={rows}
          columnDefs={columns}
          defaultColDef={defaultColDef}
          getRowId={getRowId}
          domLayout="autoHeight"
          getRowHeight={getRowHeight}
          headerHeight={40}
          suppressCellFocus
          suppressRowTransform
          suppressColumnVirtualisation
          suppressRowVirtualisation
          isFullWidthRow={fullWidth ? isFullWidthRow : undefined}
          fullWidthCellRenderer={fullWidth ? FullWidthRenderer : undefined}
          onCellClicked={onCellClicked}
          overlayNoRowsTemplate={`<span class="text-sm text-slate-400">${emptyText}</span>`}
          pagination={paged}
          paginationPageSize={pageSize}
          paginationPageSizeSelector={paged ? [pageSize, 50, 100] : false}
          context={context}
          getRowClass={getRowClass ? (p) => (p.data ? getRowClass(p.data) : undefined) : undefined}
          animateRows={false}
        />
      </div>

      <Dialog open={!!d} onOpenChange={(o) => { if (!o) setOpenId(null) }}>
        {d && (
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{d.title}</DialogTitle>
              {d.subtitle ? <DialogDescription>{d.subtitle}</DialogDescription> : <DialogDescription className="sr-only">Full details of this row</DialogDescription>}
            </DialogHeader>
            <DialogBody className="space-y-4">
              <dl className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-x-4 gap-y-3 text-sm">
                {d.fields.map((f) => (
                  <div key={f.label} className="contents">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500 sm:pt-0.5">{f.label}</dt>
                    <dd className="text-slate-800 break-words whitespace-pre-line">{f.value ?? <span className="text-slate-400">—</span>}</dd>
                  </div>
                ))}
              </dl>
              {d.extra}
            </DialogBody>
            {d.actions && <DialogFooter>{d.actions}</DialogFooter>}
          </DialogContent>
        )}
      </Dialog>
    </>
  )
}
