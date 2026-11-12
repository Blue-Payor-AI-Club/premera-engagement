import { useState } from 'react'
import { Textarea } from '../ui/input'
import { ErrorBanner, Notice, Spinner, btnPrimary } from '../ui'
import { useResource } from '../../hooks/useResource'
import { adminApi, type TabAccess, type TabPerson } from '../../lib/adminApi'
import { errorMessage } from '../../lib/format'

// One person per line: "Name <email>" (or just the email).
const format = (list: TabPerson[]) => list.map((p) => (p.name ? `${p.name} <${p.email}>` : p.email)).join('\n')

function parsePeople(text: string): TabPerson[] {
  return text.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => {
    const m = l.match(/^(.*?)\s*<([^>]+)>$/)
    return m ? { name: m[1].trim(), email: m[2].trim() } : { name: '', email: l }
  })
}

type Draft = { tab: string; executives: string; leads: string }

function TabAccessForm({ tabs, onSaved }: { tabs: TabAccess[]; onSaved: () => void }) {
  const initial = tabs.map((t) => ({ tab: t.tab, executives: format(t.executives), leads: format(t.leads) }))
  const [draft, setDraft] = useState<Draft[]>(initial)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial)

  const set = (i: number, field: 'executives' | 'leads', value: string) => {
    setDraft((d) => d.map((t, j) => (j === i ? { ...t, [field]: value } : t)))
    setSaved(false)
  }

  async function save() {
    setBusy(true)
    setError(null)
    try {
      await adminApi.saveTabAccess(draft.map((t) => ({ tab: t.tab, executives: parsePeople(t.executives), leads: parsePeople(t.leads) })))
      setSaved(true)
      onSaved()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">
        {draft.map((t, i) => (
          <div key={t.tab} className="grid gap-3 p-4 md:grid-cols-[14rem_1fr_1fr]">
            <div className="text-sm font-semibold text-slate-800">{t.tab}</div>
            {(['executives', 'leads'] as const).map((field) => (
              <label key={field} className="block text-xs font-medium text-slate-500">
                {field === 'executives' ? 'Executives' : 'Leads'}
                <Textarea
                  aria-label={`${t.tab} ${field === 'executives' ? 'Executives' : 'Leads'}`}
                  rows={2}
                  value={t[field]}
                  onChange={(e) => set(i, field, e.target.value)}
                  placeholder="Name <name@premera.com>"
                  className="mt-1 block w-full font-mono text-xs resize-y" />
              </label>
            ))}
          </div>
        ))}
      </div>
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

export default function TabAccessTab() {
  const { data, error, loading, reload } = useResource(adminApi.getTabAccess)

  if (loading && !data) return <Spinner />
  return (
    <div className="space-y-4">
      <Notice>
        A Premera Stakeholder listed here as an Executive or Lead sees only the Program Level tabs they are listed on.
        Executive and Lead give the same access. Premera Stakeholders not listed on any tab see every tab, and UST sees
        everything. People still need portal access (an invitation or an approved request) to sign in. Changes apply on
        their next page load.
      </Notice>
      {error && <ErrorBanner>{error}</ErrorBanner>}
      {data && <TabAccessForm key={data.updatedAt ?? ''} tabs={data.tabs} onSaved={reload} />}
    </div>
  )
}
