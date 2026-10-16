import { useState } from 'react'
import { Badge, ErrorBanner, Notice, Spinner, btnPrimary } from '../ui'
import { useResource } from '../../hooks/useResource'
import { adminApi, type NotifiableRole, type NotificationSetting } from '../../lib/adminApi'
import { ROLE_LABELS } from '../../lib/authApi'
import { errorMessage } from '../../lib/format'

// Only UST roles can be subscribed by role: internal notifications must never reach
// Premera stakeholders automatically. (The API enforces this too.)
const NOTIFIABLE_ROLES: NotifiableRole[] = ['super_admin', 'ust_stakeholder']

function parseEmails(text: string): string[] {
  return [...new Set(text.split(/[\s,;]+/).map((e) => e.trim().toLowerCase()).filter(Boolean))]
}

function CategoryCard({ setting, onSaved }: { setting: NotificationSetting; onSaved: () => void }) {
  const [enabled, setEnabled] = useState(setting.enabled)
  const [roles, setRoles] = useState<NotifiableRole[]>(setting.roles)
  const [emailText, setEmailText] = useState(setting.emails.join('\n'))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const emails = parseEmails(emailText)
  const dirty =
    enabled !== setting.enabled ||
    [...roles].sort().join() !== [...setting.roles].sort().join() ||
    emails.join() !== setting.emails.join()

  function toggleRole(role: NotifiableRole) {
    setSaved(false)
    setRoles((r) => (r.includes(role) ? r.filter((x) => x !== role) : [...r, role]))
  }

  async function save() {
    setBusy(true)
    setError(null)
    try {
      await adminApi.saveNotificationSetting(setting.category, { enabled, roles, emails })
      setSaved(true)
      onSaved()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3" data-category={setting.category}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-slate-800">{setting.label}</h3>
          <p className="text-sm text-slate-500">{setting.description}</p>
        </div>
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700 shrink-0">
          <input type="checkbox" checked={enabled} onChange={(e) => { setEnabled(e.target.checked); setSaved(false) }} aria-label={`${setting.label} enabled`} />
          Enabled
        </label>
      </div>

      <fieldset disabled={!enabled} className="space-y-3 disabled:opacity-50">
        <div>
          <legend className="text-xs font-medium text-slate-500 mb-1">Everyone with these roles</legend>
          <div className="flex flex-wrap gap-4">
            {NOTIFIABLE_ROLES.map((r) => (
              <label key={r} className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={roles.includes(r)} onChange={() => toggleRole(r)} aria-label={`${ROLE_LABELS[r]} for ${setting.label}`} />
                {ROLE_LABELS[r]}
              </label>
            ))}
          </div>
        </div>
        <label className="block text-xs font-medium text-slate-500">
          Additional recipients (one per line, e.g. a shared mailbox)
          <textarea
            aria-label={`Additional recipients for ${setting.label}`}
            rows={2}
            value={emailText}
            onChange={(e) => { setEmailText(e.target.value); setSaved(false) }}
            placeholder="team@ust.com"
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 font-mono resize-y"
          />
        </label>
      </fieldset>

      {enabled && roles.length === 0 && emails.length === 0 && (
        <p className="text-xs text-amber-700"><Badge tone="amber">Nobody selected</Badge> This category is enabled but has no recipients, so nothing will be sent.</p>
      )}
      {error && <ErrorBanner>{error}</ErrorBanner>}
      <div className="flex items-center gap-3">
        <button type="button" disabled={busy || !dirty} onClick={() => void save()} className={btnPrimary} aria-label={`Save ${setting.label}`}>
          {busy ? 'Saving…' : 'Save'}
        </button>
        {saved && !dirty && <span className="text-sm text-emerald-700">Saved</span>}
      </div>
    </div>
  )
}

export default function NotificationsTab() {
  const { data, error, loading, reload } = useResource(adminApi.listNotificationSettings)

  if (loading && !data) return <Spinner />
  return (
    <div className="space-y-4">
      <Notice>Each person gets their own copy. Changes here are recorded in the activity log and announced to the "Other important actions" recipients.</Notice>
      {error && <ErrorBanner>{error}</ErrorBanner>}
      <div className="grid gap-4 lg:grid-cols-2">
        {(data ?? []).map((s) => (
          // `updatedAt` in the key remounts the card with fresh server state after each save.
          <CategoryCard key={`${s.category}:${s.updatedAt ?? ''}`} setting={s} onSaved={reload} />
        ))}
      </div>
    </div>
  )
}
