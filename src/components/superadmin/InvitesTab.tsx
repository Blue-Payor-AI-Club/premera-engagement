import { useState, type FormEvent } from 'react'
import { Send } from 'lucide-react'
import { Badge, ErrorBanner, Notice, Spinner, btnDanger, btnPrimary, btnSecondary, inputCls } from '../ui'
import { useResource } from '../../hooks/useResource'
import { adminApi, type Invite } from '../../lib/adminApi'
import { ROLES, ROLE_LABELS, type Role } from '../../lib/authApi'
import { errorMessage, formatDateTime } from '../../lib/format'

function statusBadge(i: Invite) {
  if (i.status === 'accepted') return <Badge tone="green">Accepted</Badge>
  if (i.status === 'revoked') return <Badge tone="slate">Revoked</Badge>
  if (i.expired) return <Badge tone="amber">Expired</Badge>
  return <Badge tone="blue">Pending</Badge>
}

export default function InvitesTab() {
  const { data: invites, error, loading, reload } = useResource(adminApi.listInvites)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<Role>('premera_stakeholder')
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  async function act(action: () => Promise<Invite | void>, success: (r: Invite | void) => string) {
    setBusy(true)
    setActionError(null)
    setNotice(null)
    try {
      const result = await action()
      setNotice(success(result))
      reload()
    } catch (err) {
      setActionError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  function send(e: FormEvent) {
    e.preventDefault()
    const address = email.trim()
    if (!address) return
    void act(
      () => adminApi.createInvite(address, role),
      (r) => {
        setEmail('')
        return r && (r as Invite).emailSent === false
          ? `Invite created for ${address}, but the email could not be delivered. Use Resend once mail is working.`
          : `Invitation sent to ${address}.`
      },
    )
  }

  return (
    <div className="space-y-5">
      <form onSubmit={send} className="rounded-xl border border-slate-200 bg-white p-4 flex flex-wrap items-end gap-3">
        <label className="text-xs font-medium text-slate-500 flex-1 min-w-[14rem]">
          Email address
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" className={`${inputCls} mt-1`} />
        </label>
        <label className="text-xs font-medium text-slate-500">
          Access level
          <select aria-label="Invite role" value={role} onChange={(e) => setRole(e.target.value as Role)} className="mt-1 block rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800">
            {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
          </select>
        </label>
        <button type="submit" disabled={busy || !email.trim()} className={btnPrimary}><Send size={14} /> Send invite</button>
      </form>

      {notice && <Notice>{notice}</Notice>}
      {(error || actionError) && <ErrorBanner>{actionError ?? error}</ErrorBanner>}
      {loading && !invites ? <Spinner /> : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr><th className="px-4 py-2.5">Invitee</th><th className="px-4 py-2.5">Access level</th><th className="px-4 py-2.5">Status</th><th className="px-4 py-2.5">Invited by</th><th className="px-4 py-2.5">Expires</th><th className="px-4 py-2.5 text-right">Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(invites ?? []).map((i) => (
                <tr key={i.id}>
                  <td className="px-4 py-2.5 font-medium text-slate-800">{i.email}</td>
                  <td className="px-4 py-2.5 text-slate-600">{i.roleLabel}</td>
                  <td className="px-4 py-2.5">{statusBadge(i)}</td>
                  <td className="px-4 py-2.5 text-slate-600">{i.invitedBy}</td>
                  <td className="px-4 py-2.5 text-slate-600">{i.status === 'accepted' ? `Accepted ${formatDateTime(i.acceptedAt)}` : formatDateTime(i.expiresAt)}</td>
                  <td className="px-4 py-2.5">
                    {i.status === 'pending' && (
                      <div className="flex justify-end gap-2">
                        <button type="button" disabled={busy} onClick={() => void act(() => adminApi.resendInvite(i.id), () => `Invitation re-sent to ${i.email}.`)} className={btnSecondary}>Resend</button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => { if (window.confirm(`Revoke the invitation for ${i.email}?`)) void act(() => adminApi.revokeInvite(i.id), () => `Invitation for ${i.email} revoked.`) }}
                          className={btnDanger}
                        >
                          Revoke
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {invites?.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">No invitations yet.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
