import { useState } from 'react'
import { ErrorBanner, Notice, Spinner, btnPrimary } from '../ui'
import { useResource } from '../../hooks/useResource'
import { adminApi } from '../../lib/adminApi'
import { errorMessage } from '../../lib/format'

function parseDomains(text: string): string[] {
  return [...new Set(text.split(/[\s,;]+/).map((d) => d.trim().toLowerCase().replace(/^@/, '')).filter(Boolean))]
}

function DomainsForm({ domains, onSaved }: { domains: string[]; onSaved: () => void }) {
  const [text, setText] = useState(domains.join('\n'))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const next = parseDomains(text)
  const dirty = next.join() !== domains.join()

  async function save() {
    setBusy(true)
    setError(null)
    try {
      await adminApi.saveAllowedDomains(next)
      setSaved(true)
      onSaved()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3 max-w-xl">
      <label className="block text-xs font-medium text-slate-500">
        Allowed email domains (one per line)
        <textarea
          aria-label="Allowed email domains"
          rows={4}
          value={text}
          onChange={(e) => { setText(e.target.value); setSaved(false) }}
          placeholder="ust.com"
          className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 font-mono resize-y"
        />
      </label>
      {error && <ErrorBanner>{error}</ErrorBanner>}
      <div className="flex items-center gap-3">
        <button type="button" disabled={busy || !dirty} onClick={() => void save()} className={btnPrimary}>
          {busy ? 'Saving…' : 'Save'}
        </button>
        {saved && !dirty && <span className="text-sm text-emerald-700">Saved</span>}
      </div>
    </div>
  )
}

export default function SignInTab() {
  const { data, error, loading, reload } = useResource(adminApi.getAllowedDomains)

  if (loading && !data) return <Spinner />
  return (
    <div className="space-y-4">
      <Notice>
        Only people whose email is on one of these domains can request a sign-in code, on the web and in the mobile app.
        The exact domain must match, so <code>mail.ust.com</code> is not covered by <code>ust.com</code>. Changes take
        effect immediately, and people already signed in stay signed in until their session ends.
      </Notice>
      {error && <ErrorBanner>{error}</ErrorBanner>}
      {data && <DomainsForm domains={data.domains} onSaved={reload} />}
    </div>
  )
}
