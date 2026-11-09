import { useMemo } from 'react'
import { RefreshCw } from 'lucide-react'
import type { ColDef } from 'ag-grid-community'
import { Badge, ErrorBanner, Spinner } from '../components/ui'
import { Button } from '../components/ui/button'
import DataGrid, { Clamp } from '../components/DataGrid'
import { renderColumn } from '../components/gridColumns'
import { useResource } from '../hooks/useResource'
import { adminApi, type AuditEntry } from '../lib/adminApi'
import { formatDateTime } from '../lib/format'

const ACTION_TONE: Record<string, 'green' | 'red' | 'amber' | 'blue' | 'slate'> = {
  import: 'blue', rollback: 'amber', reset: 'red', remove: 'red', disable: 'red', reject: 'red',
  approve: 'green', accept_invite: 'green', enable: 'green', role_change: 'amber', invite: 'blue',
}

const ActionBadge = ({ action }: { action: string }) => <Badge tone={ACTION_TONE[action] ?? 'slate'}>{action.replace('_', ' ')}</Badge>

/** Read-only trail of who did what — visible to UST Stakeholders and Super Admins. */
export default function Activity() {
  const { data, error, loading, reload } = useResource(adminApi.listAudit)

  const columns = useMemo<ColDef<AuditEntry>[]>(() => [
    { headerName: 'When', width: 190, sortable: true, valueGetter: (p) => p.data?.timestamp, valueFormatter: (p) => formatDateTime(p.value) },
    { headerName: 'Who', width: 240, sortable: true, valueGetter: (p) => p.data?.actor },
    renderColumn<AuditEntry>({ headerName: 'Action', width: 140 }, (a) => <ActionBadge action={a.action} />),
    renderColumn<AuditEntry>({ headerName: 'What', flex: 1, minWidth: 260 }, (a) => <Clamp title={a.resource}><span className="font-mono text-xs">{a.resource}</span></Clamp>),
  ], [])

  return (
    <div className="slide">
      <header className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">Activity</h1>
          <p className="text-slate-500 text-sm mt-1">Every important action — uploads, edits, access decisions, role changes, resets — with who did it and when.</p>
        </div>
        <Button variant="outline" size="sm" onClick={reload}><RefreshCw size={14} /> Refresh</Button>
      </header>
      {error && <div className="mb-3"><ErrorBanner>{error}</ErrorBanner></div>}
      {loading && !data ? <Spinner /> : (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <DataGrid<AuditEntry>
            label="Activity log"
            rows={data ?? []}
            columns={columns}
            rowId={(a) => a.id}
            rowHeight={48}
            pageSize={50}
            emptyText="Nothing recorded yet."
            details={(a) => ({
              title: a.resource,
              fields: [
                { label: 'When', value: formatDateTime(a.timestamp) },
                { label: 'Who', value: a.actor },
                { label: 'Action', value: <ActionBadge action={a.action} /> },
                ...(a.diff ? [{ label: 'Details', value: <pre className="text-xs whitespace-pre-wrap break-all bg-slate-50 rounded p-2">{JSON.stringify(a.diff, null, 2)}</pre> }] : []),
              ],
            })}
          />
        </div>
      )}
    </div>
  )
}
