import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { Pencil, Plus } from 'lucide-react'
import { PortalDataContext, useUstView } from '../context/PortalDataContext'
import type { PortalData } from '../data/portalData'
import { STATUS_OPTIONS, implausibleYear, normalizeDate, type EditRequest, type Field, type Values } from '../lib/editRequests'
import { ErrorBanner } from './ui'
import { Button } from './ui/button'
import { buttonVariants } from './ui/variants'
import { cn } from '../lib/utils'
import { Checkbox } from './ui/checkbox'
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog'
import { Input, Select, Textarea } from './ui/input'
import { Label } from './ui/label'

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
  return useUstView() ? open : null
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
      className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'h-7 w-7 align-middle text-slate-400 hover:text-primary', className)}
    >
      <Pencil size={13} aria-hidden />
    </button>
  )
}

/** `compact`: just a "+" (children become its tooltip and accessible name) — for tight cells. */
export function AddButton({ request, children, compact }: { request: () => EditRequest; children: ReactNode; compact?: boolean }) {
  const open = useEditor()
  if (!open) return null
  if (compact) {
    return (
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); open(request()) }}
        title={String(children)}
        aria-label={String(children)}
        className={cn(buttonVariants({ variant: 'outline', size: 'icon' }), 'h-6 w-6 shrink-0 border-dashed text-slate-500 hover:border-primary hover:text-primary')}
      >
        <Plus size={12} aria-hidden />
      </button>
    )
  }
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); open(request()) }}
      className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'h-7 border-dashed text-xs text-slate-600 hover:border-primary')}
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
    // Likely typos (2023 for 2026) are asked about, not refused: an old date can be real.
    const odd = request.fields.filter((f) => f.type === 'date' && implausibleYear(values[f.key] as string))
    if (odd.length && !window.confirm(
      `${odd.map((f) => `${f.label}: ${values[f.key]}`).join('\n')}\n\nThat year looks unusual (more than a year ago, or over three years ahead). Save anyway?`,
    )) return
    run(`${request.isNew ? 'Added' : 'Edited'} ${short(request.label)}`, (d) => request.save(d, values))
  }

  function remove() {
    if (!request.remove || !window.confirm(`Delete ${request.label}? You can undo this from Data Sync → version history.`)) return
    run(`Deleted ${short(request.label)}`, request.remove)
  }

  const title = `${request.isNew ? 'Add' : 'Edit'} ${request.label}`
  return (
    // Radix (shadcn Dialog) handles Esc, focus and stacking over another dialog (e.g. the actions window).
    <Dialog open onOpenChange={(o) => { if (!o && !busy) onClose() }}>
      <DialogContent aria-describedby={undefined}>
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>

          <DialogBody className="space-y-3.5">
            {request.fields.map((f, i) => {
              const id = `edit-${f.key}`
              const val = form[f.key]
              const set = (v: string | boolean) => setForm((s) => ({ ...s, [f.key]: v }))
              if (f.type === 'bool') {
                return (
                  <div key={f.key} className="flex items-center gap-2">
                    <Checkbox id={id} checked={val === true} onCheckedChange={(c) => set(c === true)} />
                    <Label htmlFor={id} className="text-sm font-normal text-slate-700">{f.label}</Label>
                  </div>
                )
              }
              const options = f.type === 'status' ? STATUS_OPTIONS : f.options
              const invalid = !!fieldErrors[f.key]
              return (
                <div key={f.key} className="space-y-1.5">
                  <Label htmlFor={id}>{f.label}{f.required && <span className="text-red-600"> *</span>}</Label>
                  {options ? (
                    <Select id={id} autoFocus={i === 0} value={String(val)} onChange={(e) => set(e.target.value)} aria-invalid={invalid}>
                      {!f.required && <option value="">{f.type === 'status' ? 'N/A' : '—'}</option>}
                      {f.required && !val && <option value="" disabled>Choose…</option>}
                      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </Select>
                  ) : f.type === 'textarea' || f.type === 'lines' ? (
                    <Textarea id={id} autoFocus={i === 0} rows={f.type === 'lines' ? 4 : 3} value={String(val)} onChange={(e) => set(e.target.value)} aria-invalid={invalid} />
                  ) : (
                    <Input
                      id={id}
                      autoFocus={i === 0}
                      value={String(val)}
                      onChange={(e) => set(e.target.value)}
                      placeholder={f.type === 'date' ? 'M/D/YYYY, TBD or N/A' : undefined}
                      aria-invalid={invalid}
                    />
                  )}
                  {f.type === 'lines' && <p className="text-[11px] text-slate-400">One item per line.</p>}
                  {invalid && <p className="text-xs text-red-600">{fieldErrors[f.key]}</p>}
                </div>
              )
            })}
            {error && <ErrorBanner>{error}</ErrorBanner>}
          </DialogBody>

          <DialogFooter className="justify-between">
            <div>
              {request.remove && <Button type="button" variant="destructive-outline" size="sm" onClick={remove} disabled={busy}>Delete</Button>}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={busy}>Cancel</Button>
              <Button type="submit" size="sm" disabled={busy}>{busy ? 'Saving…' : 'Save'}</Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
