import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import type { ReactNode } from 'react'
import type { StatusKey } from '../data/status'
import type { EditRequest } from '../lib/editRequests'
import { EditButton } from './Editor'
import OverdueTag from './OverdueTag'
import StatusLabel from './StatusLabel'

// Column recipes shared by the portal's grids (components/DataGrid.tsx).

/** Status as a dot plus its word (colour alone isn't enough for every reader). */
export function statusColumn<T>(headerName: string, get: (row: T) => StatusKey | null, width = 130): ColDef<T> {
  return {
    headerName,
    width,
    valueGetter: (p) => (p.data ? get(p.data) : null),
    cellRenderer: (p: ICellRendererParams<T>) => (p.data ? <StatusLabel status={get(p.data)} /> : null),
  }
}

/** A date with a red Overdue tag once it has passed and the row isn't done. */
export function dateColumn<T>(headerName: string, get: (row: T) => string | undefined, done: (row: T) => boolean, width = 130): ColDef<T> {
  return {
    headerName,
    width,
    valueGetter: (p) => (p.data ? get(p.data) : ''),
    cellRenderer: (p: ICellRendererParams<T>) => {
      if (!p.data) return null
      const d = get(p.data)
      return (
        <span className="flex flex-col items-start gap-0.5 leading-tight">
          <span>{d || <span className="text-slate-300">—</span>}</span>
          <OverdueTag date={d} done={done(p.data)} className="ml-0" />
        </span>
      )
    },
  }
}

/** The UST-only Edit column; pass canEdit so the column is absent for Premera. */
export function editColumn<T>(canEdit: boolean, request: (row: T) => EditRequest, title?: (row: T) => string): ColDef<T>[] {
  if (!canEdit) return []
  return [{
    headerName: 'Edit',
    colId: 'edit',
    width: 64,
    resizable: false,
    pinned: 'right',
    cellClass: 'flex items-center justify-center',
    cellRenderer: (p: ICellRendererParams<T>) =>
      p.data ? <EditButton className="" title={title?.(p.data) ?? 'Edit'} request={() => request(p.data!)} /> : null,
  }]
}

/** A column that renders arbitrary content (badges, buttons) for a row. */
export function renderColumn<T>(def: Omit<ColDef<T>, 'cellRenderer'>, render: (row: T) => ReactNode): ColDef<T> {
  return { ...def, cellRenderer: (p: ICellRendererParams<T>) => (p.data ? <>{render(p.data)}</> : null) }
}

