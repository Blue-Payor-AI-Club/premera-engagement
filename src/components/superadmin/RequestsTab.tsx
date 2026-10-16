import { useState } from 'react'
import { Badge, ErrorBanner, btnDanger, btnPrimary } from '../ui'
import { adminApi, type AccessRequest } from '../../lib/adminApi'
import { ROLES, ROLE_LABELS, type Role } from '../../lib/authApi'
import { errorMessage, formatDateTime } from '../../lib/format'

function PendingCard({ request, onDone }: { request: AccessRequest; onDone: () => void }) {
  // No default privilege: the least-privileged role is pre-selected, and approving is an
  // explicit choice of role.
  const [role, setRole] = useState<Role>('premera_stakeholder')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function decide(action: () => Promise<unknown>) {
    setBusy(true)
    setError(null)
    try {
      await action()
      onDone()
    } catch (err) {
      setError(errorMessage(err))
      setBusy(false)
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <div className="font-semibold text-slate-800">{request.name || request.email}</div>
          {request.name && <div className="text-sm text-slate-500">{request.email}</div>}
        </div>
        <div className="text-xs text-slate-400">{formatDateTime(request.requestedAt)}</div>
      </div>
      <blockquote className="text-sm text-slate-700 bg-slate-50 border-l-4 border-[#0067b1] px-3 py-2 whitespace-pre-wrap">
        {request.message}
      </blockquote>
      {error && <ErrorBanner>{error}</ErrorBanner>}
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-xs font-medium text-slate-500">
          Grant access as
          <select
            aria-label={`Role for ${request.email}`}
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            className="mt-1 block rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-800"
          >
            {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
          </select>
        </label>
        <label className="text-xs font-medium text-slate-500 flex-1 min-w-[10rem]">
          Note (optional, included in the email)
          <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} className="mt-1 block w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-800" />
        </label>
        <button type="button" disabled={busy} onClick={() => void decide(() => adminApi.approveRequest(request.id, role, note.trim() || undefined))} className={btnPrimary}>
          Approve
        </button>
        <button type="button" disabled={busy} onClick={() => void decide(() => adminApi.rejectRequest(request.id, note.trim() || undefined))} className={btnDanger}>
          Reject
        </button>
      </div>
    </div>
  )
}

export default function RequestsTab({ requests, error, onChanged }: { requests: AccessRequest[]; error?: string; onChanged: () => void }) {
  const pending = requests.filter((r) => r.status === 'pending')
  const decided = requests.filter((r) => r.status !== 'pending')

  return (
    <div className="space-y-6">
      {error && <ErrorBanner>{error}</ErrorBanner>}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-700">Waiting for a decision ({pending.length})</h3>
        {pending.length === 0 && <p className="text-sm text-slate-500 bg-white border border-slate-200 rounded-xl px-4 py-6 text-center">No pending requests.</p>}
        {pending.map((r) => <PendingCard key={r.id} request={r} onDone={onChanged} />)}
      </section>

      {decided.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-slate-700">History</h3>
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr><th className="px-4 py-2.5">Requester</th><th className="px-4 py-2.5">Decision</th><th className="px-4 py-2.5">By</th><th className="px-4 py-2.5">When</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {decided.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-2.5 text-slate-800">{r.email}</td>
                    <td className="px-4 py-2.5">
                      <Badge tone={r.status === 'approved' ? 'green' : 'red'}>{r.status === 'approved' ? `Approved · ${r.assignedRole ? ROLE_LABELS[r.assignedRole] : ''}` : 'Rejected'}</Badge>
                      {r.decisionNote && <div className="text-xs text-slate-500 mt-0.5">{r.decisionNote}</div>}
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">{r.decidedBy}</td>
                    <td className="px-4 py-2.5 text-slate-600">{formatDateTime(r.decidedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}
