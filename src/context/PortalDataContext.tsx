import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { DEFAULT_PORTAL_DATA, type PortalData } from '../data/portalData'
import { apiFetch } from '../lib/api'
import { useAuth } from './AuthContext'

// Bumped from _v6: the document shape gained statusMessage/needsPremeraAttention/
// milestones (Workstream) and severity/priority (IssueRow) fields, and — separately —
// portal data is now Excel-sourced rather than admin-edited, so a stale pre-sync cache
// from before this change shouldn't silently reappear on first load.
const STORAGE_KEY = 'ustpremera_portaldata_v8'

interface Ctx {
  data: PortalData
  loading: boolean
  error: string | null
  /** Re-runs the GET /portal fetch — used after a successful Excel sync/rollback
   * (the import endpoint returns a change report, not the document itself, so the
   * SPA re-fetches to pick up the new data + ETag) and by a manual "reload" action. */
  refresh: () => void
  /**
   * Whole-document PUT. Not part of the normal Excel-sync workflow (nothing in the UI
   * calls this on the happy path) — kept only as a "break glass" restore-from-JSON-backup
   * path in Admin, since a backup you can't restore isn't a backup.
   */
  replaceDocument: (next: PortalData) => void
  reset: () => void
}

const PortalDataContext = createContext<Ctx | null>(null)

// Exported (not just the hook) so tests can inject a value directly instead of
// mocking apiFetch and fighting the mount effect — see PortalDataContext.test.tsx.
export { PortalDataContext }

function loadCache(): PortalData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return { ...DEFAULT_PORTAL_DATA, ...(JSON.parse(raw) as PortalData) }
  } catch { /* ignore corrupt storage */ }
  return DEFAULT_PORTAL_DATA
}

function persist(d: PortalData): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch { /* ignore */ }
}

export function PortalDataProvider({ children }: { children: ReactNode }) {
  const { loading: authLoading, token } = useAuth()
  const [data, setData]   = useState<PortalData>(loadCache)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [etag, setEtag]   = useState<string | null>(null)

  const fetchDocument = useCallback(() => {
    setLoading(true)
    apiFetch('/portal')
      .then(async res => {
        const et = res.headers.get('ETag')
        if (et) setEtag(et)
        const json = await res.json() as PortalData
        setData(json)
        persist(json)
        setError(null)
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  // Fetch from API once auth is resolved; re-fetch if token changes
  useEffect(() => {
    if (authLoading || !token) return
    fetchDocument()
  }, [authLoading, token, fetchDocument])

  // Optimistically update local state; persist to API in background. Break-glass
  // only — see the Ctx.replaceDocument doc comment.
  const replaceDocument = useCallback((next: PortalData) => {
    setData(next)
    persist(next)
    const headers: Record<string, string> = {}
    if (etag) headers['If-Match'] = etag
    apiFetch('/portal', { method: 'PUT', body: JSON.stringify(next), headers })
      .then(async res => {
        const et = res.headers.get('ETag')
        if (et) setEtag(et)
        const json = await res.json() as PortalData
        setData(json)
        persist(json)
      })
      .catch((err: Error) => setError(err.message))
  }, [etag])

  const reset = useCallback(() => {
    apiFetch('/portal/reset', { method: 'POST' })
      .then(async res => {
        const json = await res.json() as PortalData
        setData(json)
        setEtag(null)
        persist(json)
        setError(null)
      })
      .catch((err: Error) => {
        // Previously this claimed success locally (setting DEFAULT_PORTAL_DATA) even
        // when the server call failed, which lies to the admin about what actually
        // happened server-side. Surface the failure instead; local state is untouched.
        setError(err.message)
      })
  }, [])

  const value = useMemo(
    () => ({ data, loading, error, refresh: fetchDocument, replaceDocument, reset }),
    [data, loading, error, fetchDocument, replaceDocument, reset],
  )
  return <PortalDataContext.Provider value={value}>{children}</PortalDataContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePortalData(): Ctx {
  const ctx = useContext(PortalDataContext)
  if (!ctx) throw new Error('usePortalData must be used within a PortalDataProvider')
  return ctx
}
