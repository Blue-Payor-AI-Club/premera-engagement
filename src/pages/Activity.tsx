import { RefreshCw } from 'lucide-react'
import { Badge, ErrorBanner, Spinner, btnSecondary } from '../components/ui'
import { useResource } from '../hooks/useResource'
import { adminApi } from '../lib/adminApi'
import { formatDateTime } from '../lib/format'

const ACTION_TONE: Record<string, 'green' | 'red' | 'amber' | 'blue' | 'slate'> = {
  import: 'blue', rollback: 'amber', reset: 'red', remove: 'red', disable: 'red', reject: 'red',
  approve: 'green', accept_invite: 'green', enable: 'green', role_change: 'amber', invite: 'blue',
}

/** Read-only trail of who did what — visible to UST Stakeholders and Super Admins. */
export default function Activity() {
  const { data, error, loading, reload } = useResource(adminApi.listAudit)

  return (
    <div className="slide">
      <header className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">Activity</h1>
          <p className="text-slate-500 text-sm mt-1">Every important action — uploads, access decisions, role changes, resets — with who did it and when.</p>
        </div>
        <button type="button" onClick={reload} className={btnSecondary}><RefreshCw size={14} /> Refresh</button>
      </header>
      {error && <div className="mb-3"><ErrorBanner>{error}</ErrorBanner></div>}
      {loading && !data ? <Spinner /> : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr><th className="px-4 py-2.5">When</th><th className="px-4 py-2.5">Who</th><th className="px-4 py-2.5">Action</th><th className="px-4 py-2.5">What</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(data ?? []).map((a) => (
                <tr key={a.id}>
                  <td className="px-4 py-2.5 text-slate-600 whitespace-nowrap">{formatDateTime(a.timestamp)}</td>
                  <td className="px-4 py-2.5 text-slate-800">{a.actor}</td>
                  <td className="px-4 py-2.5"><Badge tone={ACTION_TONE[a.action] ?? 'slate'}>{a.action.replace('_', ' ')}</Badge></td>
                  <td className="px-4 py-2.5 text-slate-600 font-mono text-xs break-all">{a.resource}</td>
                </tr>
              ))}
              {data?.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500">Nothing recorded yet.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
