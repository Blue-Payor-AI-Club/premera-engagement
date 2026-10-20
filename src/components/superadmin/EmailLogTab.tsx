import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { Badge, ErrorBanner, Spinner, btnSecondary } from '../ui'
import { useResource } from '../../hooks/useResource'
import { adminApi } from '../../lib/adminApi'
import { errorMessage, formatDateTime } from '../../lib/format'

const TONE = { sent: 'green', failed: 'red', pending: 'amber' } as const

export default function EmailLogTab() {
  const { data, error, loading, reload } = useResource(adminApi.listEmailLog)
  const [actionError, setActionError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  async function retry(id: string) {
    setBusy(id)
    setActionError(null)
    try {
      await adminApi.retryEmail(id)
      reload()
    } catch (err) {
      setActionError(errorMessage(err))
    } finally {
      setBusy(null)
    }
  }

  if (loading && !data) return <Spinner />
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">The 200 most recent emails. Sign-in codes and invite links are listed without their contents.</p>
        <button type="button" onClick={reload} className={btnSecondary}><RefreshCw size={14} /> Refresh</button>
      </div>
      {(error || actionError) && <ErrorBanner>{actionError ?? error}</ErrorBanner>}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr><th className="px-4 py-2.5">When</th><th className="px-4 py-2.5">To</th><th className="px-4 py-2.5">Subject</th><th className="px-4 py-2.5">Status</th><th className="px-4 py-2.5 text-right"> </th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(data ?? []).map((e) => (
              <tr key={e.id}>
                <td className="px-4 py-2.5 text-slate-600 whitespace-nowrap">{formatDateTime(e.createdAt)}</td>
                <td className="px-4 py-2.5 text-slate-800">{e.recipient}</td>
                <td className="px-4 py-2.5 text-slate-700">{e.subject}<div className="text-xs text-slate-400">{e.category}</div></td>
                <td className="px-4 py-2.5">
                  <Badge tone={TONE[e.status]}>{e.status}</Badge>
                  {e.lastError && <div className="text-xs text-red-600 mt-0.5 max-w-xs truncate" title={e.lastError}>{e.lastError}</div>}
                </td>
                <td className="px-4 py-2.5 text-right">
                  {e.status === 'failed' && e.retriable && (
                    <button type="button" disabled={busy === e.id} onClick={() => void retry(e.id)} className={btnSecondary}>Retry</button>
                  )}
                </td>
              </tr>
            ))}
            {data?.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">No emails sent yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
