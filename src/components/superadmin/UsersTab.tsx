import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Badge, ErrorBanner, Spinner, btnDanger, btnSecondary } from '../ui'
import { useAuth } from '../../context/AuthContext'
import { useResource } from '../../hooks/useResource'
import { adminApi, type AppUser } from '../../lib/adminApi'
import { ROLES, ROLE_LABELS, type Role } from '../../lib/authApi'
import { errorMessage, formatDateTime } from '../../lib/format'

export default function UsersTab() {
  const { user: me } = useAuth()
  const { data: users, error, loading, reload } = useResource(adminApi.listUsers)
  const [actionError, setActionError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  async function act(email: string, action: () => Promise<unknown>) {
    setActionError(null)
    setBusy(email)
    try {
      await action()
      reload()
    } catch (err) {
      setActionError(errorMessage(err))
    } finally {
      setBusy(null)
    }
  }

  function changeRole(u: AppUser, role: Role) {
    if (role === u.role) return
    if (!window.confirm(`Change ${u.email} from ${ROLE_LABELS[u.role]} to ${ROLE_LABELS[role]}? This takes effect immediately.`)) return
    void act(u.email, () => adminApi.updateUser(u.email, { role }))
  }

  function toggleStatus(u: AppUser) {
    const disabling = u.status === 'active'
    if (disabling && !window.confirm(`Disable ${u.email}? They will be signed out immediately and notified.`)) return
    void act(u.email, () => adminApi.updateUser(u.email, { status: disabling ? 'disabled' : 'active' }))
  }

  function remove(u: AppUser) {
    if (!window.confirm(`Remove ${u.email} permanently? They will lose access immediately and be notified.`)) return
    void act(u.email, () => adminApi.removeUser(u.email))
  }

  if (loading && !users) return <Spinner />

  return (
    <div className="space-y-3">
      {(error || actionError) && <ErrorBanner>{actionError ?? error}</ErrorBanner>}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2.5">User</th>
              <th className="px-4 py-2.5">Role</th>
              <th className="px-4 py-2.5">Status</th>
              <th className="px-4 py-2.5">Added</th>
              <th className="px-4 py-2.5">Last sign-in</th>
              <th className="px-4 py-2.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(users ?? []).map((u) => {
              const isMe = u.email === me?.email
              return (
                <tr key={u.email}>
                  <td className="px-4 py-2.5">
                    <div className="font-medium text-slate-800">{u.name || u.email}</div>
                    {u.name && <div className="text-xs text-slate-500">{u.email}</div>}
                    {isMe && <Badge tone="blue">You</Badge>}
                  </td>
                  <td className="px-4 py-2.5">
                    <select
                      aria-label={`Role for ${u.email}`}
                      value={u.role}
                      disabled={isMe || busy === u.email}
                      onChange={(e) => changeRole(u, e.target.value as Role)}
                      className="rounded-md border border-slate-300 px-2 py-1 text-sm disabled:bg-slate-50 disabled:text-slate-500"
                      title={isMe ? "You can't change your own role" : undefined}
                    >
                      {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge tone={u.status === 'active' ? 'green' : 'red'}>{u.status === 'active' ? 'Active' : 'Disabled'}</Badge>
                  </td>
                  <td className="px-4 py-2.5 text-slate-600">
                    {formatDateTime(u.createdAt)}
                    <div className="text-xs text-slate-400">via {u.source.replace('_', ' ')}</div>
                  </td>
                  <td className="px-4 py-2.5 text-slate-600">{formatDateTime(u.lastLoginAt)}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex justify-end gap-2">
                      <button type="button" disabled={isMe || busy === u.email} onClick={() => toggleStatus(u)} className={btnSecondary}>
                        {u.status === 'active' ? 'Disable' : 'Enable'}
                      </button>
                      <button type="button" aria-label={`Remove ${u.email}`} disabled={isMe || busy === u.email} onClick={() => remove(u)} className={btnDanger}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
            {users?.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">No users yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
