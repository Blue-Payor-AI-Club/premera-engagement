import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { Pencil, Plus, X } from 'lucide-react'
import { AuthContext } from '../context/AuthContext'
import { PortalDataContext } from '../context/PortalDataContext'
import type { PortalData } from '../data/portalData'
import { STATUS_OPTIONS, normalizeDate, type EditRequest, type Field, type Values } from '../lib/editRequests'
import { ErrorBanner, btnDanger, btnPrimary, btnSecondary, inputCls } from './ui'

// In-app editing for UST users. Every editable thing on screen opens this one form, driven by a
// field list that mirrors that row's workbook columns, so the app and Excel accept the same values.

const toLines = (s: string) => s.split('\n').map((l) => l.trim()).filter(Boolean)
const short = (s: string) => (s.length > 120 ? `${s.slice(0, 117)}…` : s)

const EditorContext = createContext<((r: EditRequest) => void) | null>(null)

export function EditorProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<EditRequest | null>(null)
  return (
    <EditorContext.Provider value={setRequest}>
      {children}
      {request && <EditDialog request={request} onClose={() => setRequest(null)} />}
    </EditorContext.Provider>
  )
}

/** `open` is null for anyone who may not edit (Premera), so callers render nothing. */
// eslint-disable-next-line react-refresh/only-export-components
export function useEditor(): ((r: EditRequest) => void) | null {
  const open = useContext(EditorContext)
  const canEdit = useContext(AuthContext)?.canEdit ?? false
  return canEdit ? open : null
}

export function EditButton({ request, title = 'Edit', className = 'ml-1.5' }: { request: () => EditRequest; title?: string; className?: string }) {
  const open = useEditor()
  if (!open) return null
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); open(request()) }}
      title={title}
      aria-label={title}
      className={`inline-flex items-center justify-center align-middle p-1 rounded text-slate-400 hover:text-[#0067b1] hover:bg-slate-100 transition ${className}`}
    >
      <Pencil size={12} aria-hidden />
    </button>
  )
}

/** The "Edit" column header of a table — rendered for UST users only, like the cells below it. */
export function EditHeader({ className = '', rowSpan }: { className?: string; rowSpan?: number }) {
  if (!useEditor()) return null
  return <th scope="col" rowSpan={rowSpan} className={`text-center font-semibold px-2 py-2 w-14 ${className}`}>Edit</th>
}

/** One row's cell in the "Edit" column. */
export function EditCell({ request, title, className = '' }: { request: () => EditRequest; title?: string; className?: string }) {
  if (!useEditor()) return null
  return <td className={`px-2 py-1.5 text-center ${className}`}><EditButton request={request} title={title} className="" /></td>
}

export function AddButton({ request, children }: { request: () => EditRequest; children: ReactNode }) {
  const open = useEditor()
  if (!open) return null
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); open(request()) }}
      className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold border border-dashed border-slate-300 text-slate-600 bg-white hover:border-[#0067b1] hover:text-[#0067b1] transition"
    >
      <Plus size={12} aria-hidden /> {children}
    </button>
  )
}

function initialText(f: Field, v: unknown): string | boolean {
  if (f.type === 'bool') return !!v
  if (f.type === 'lines') return ((v as string[] | undefined) ?? []).join('\n')
  return v == null ? '' : String(v)
}

function EditDialog({ request, onClose }: { request: EditRequest; onClose: () => void }) {
  const portal = useContext(PortalDataContext)!
  const [form, setForm] = useState<Record<string, string | boolean>>(() =>
    Object.fromEntries(request.fields.map((f) => [f.key, initialText(f, request.value[f.key])])))
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const run = useCallback(async (summary: string, mutate: (d: PortalData) => void) => {
    setBusy(true)
    setError(null)
    try {
      await portal.edit(summary, mutate)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save. Please try again.')
    } finally {
      setBusy(false)
    }
  }, [portal, onClose])

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const errs: Record<string, string> = {}
    const values: Values = {}
    for (const f of request.fields) {
      const raw = form[f.key]
      if (f.type === 'bool') { values[f.key] = raw === true; continue }
      const text = String(raw ?? '').trim()
      if (f.required && !text) { errs[f.key] = `${f.label} is required.`; continue }
      if (f.type === 'lines') values[f.key] = toLines(text)
      else if (f.type === 'date') {
        const d = normalizeDate(text, !f.strictDate)
        if (d === undefined) errs[f.key] = 'Enter a date as M/D/YYYY (e.g. 3/15/2026), or TBD / N/A.'
        values[f.key] = d
      } else values[f.key] = text
    }
    setFieldErrors(errs)
    if (Object.keys(errs).length) return
    run(`${request.isNew ? 'Added' : 'Edited'} ${short(request.label)}`, (d) => request.save(d, values))
  }

  function remove() {
    if (!request.remove || !window.confirm(`Delete ${request.label}? You can undo this from Data Sync → version history.`)) return
    run(`Deleted ${short(request.label)}`, request.remove)
  }

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/50 px-4"
      onClick={() => !busy && onClose()}
      onKeyDown={(e) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); if (!busy) onClose() } }}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-label={`${request.isNew ? 'Add' : 'Edit'} ${request.label}`}
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-start justify-between gap-4 px-5 py-3 border-b border-slate-200">
          <h2 className="text-sm font-semibold text-slate-800 min-w-0 break-words">
            {request.isNew ? 'Add' : 'Edit'} {request.label}
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" className="shrink-0 p-1 rounded hover:bg-slate-100">
            <X size={16} className="text-slate-500" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-3">
          {request.fields.map((f, i) => {
            const id = `edit-${f.key}`
            const val = form[f.key]
            const set = (v: string | boolean) => setForm((s) => ({ ...s, [f.key]: v }))
            if (f.type === 'bool') {
              return (
                <label key={f.key} className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" checked={val === true} onChange={(e) => set(e.target.checked)} />
                  {f.label}
                </label>
              )
            }
            const options = f.type === 'status' ? STATUS_OPTIONS : f.options
            return (
              <div key={f.key}>
                <label htmlFor={id} className="block text-xs font-semibold text-slate-600 mb-1">
                  {f.label}{f.required && <span className="text-red-600"> *</span>}
                </label>
                {options ? (
                  <select id={id} autoFocus={i === 0} value={String(val)} onChange={(e) => set(e.target.value)} className={inputCls}>
                    {!f.required && <option value="">{f.type === 'status' ? 'N/A' : '—'}</option>}
                    {f.required && !val && <option value="" disabled>Choose…</option>}
                    {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                ) : f.type === 'textarea' || f.type === 'lines' ? (
                  <textarea id={id} autoFocus={i === 0} rows={f.type === 'lines' ? 4 : 3} value={String(val)} onChange={(e) => set(e.target.value)} className={inputCls} />
                ) : (
                  <input
                    id={id}
                    autoFocus={i === 0}
                    value={String(val)}
                    onChange={(e) => set(e.target.value)}
                    placeholder={f.type === 'date' ? 'M/D/YYYY, TBD or N/A' : undefined}
                    className={inputCls}
                  />
                )}
                {f.type === 'lines' && <p className="text-[11px] text-slate-400 mt-0.5">One item per line.</p>}
                {fieldErrors[f.key] && <p className="text-xs text-red-600 mt-0.5">{fieldErrors[f.key]}</p>}
              </div>
            )
          })}
          {error && <ErrorBanner>{error}</ErrorBanner>}
        </div>

        <div className="flex items-center justify-between gap-2 px-5 py-3 border-t border-slate-100">
          <div>
            {request.remove && <button type="button" onClick={remove} disabled={busy} className={btnDanger}>Delete</button>}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} disabled={busy} className={btnSecondary}>Cancel</button>
            <button type="submit" disabled={busy} className={btnPrimary}>{busy ? 'Saving…' : 'Save'}</button>
          </div>
        </div>
      </form>
    </div>
  )
}
