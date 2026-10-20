import { useRef, useState } from 'react'
import { Download, Upload, RotateCcw, ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react'
import { usePortalData } from '../context/PortalDataContext'
import { useAuth } from '../context/AuthContext'
import { saveBlobAs } from '../lib/api'
import { type PortalData } from '../data/portalData'
import ExcelSyncPanel from '../components/admin/ExcelSyncPanel'
import PortalPreview from '../components/admin/PortalPreview'

/** JSON restore is a "break glass" escape hatch only — Excel is the source of truth,
 * so this exists purely so the exportJson backup below is actually restorable, and as
 * a last resort if a bad sync needs an immediate hand-authored fix. It is NOT part of
 * the normal workflow and the next Excel sync will overwrite whatever it restores. */
function BreakGlassRestore() {
  const { replaceDocument } = usePortalData()
  const fileRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)

  function restoreFromJson(file: File) {
    const reader = new FileReader()
    reader.onload = () => {
      let parsed: PortalData
      try {
        parsed = JSON.parse(String(reader.result)) as PortalData
      } catch {
        alert('Invalid JSON file')
        return
      }
      const confirmed = window.confirm(
        'Restore from this JSON backup? This replaces the ENTIRE portal document immediately, ' +
        'and will itself be overwritten by the next Excel sync.'
      )
      if (confirmed) replaceDocument(parsed)
    }
    reader.readAsText(file)
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-slate-50 transition"
      >
        {open ? <ChevronDown size={15} className="text-slate-400" /> : <ChevronRight size={15} className="text-slate-400" />}
        <span className="text-sm font-semibold text-slate-600">Break glass — restore from JSON backup</span>
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-3">
          <div className="flex items-start gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            <AlertTriangle size={13} className="shrink-0 mt-0.5" />
            <span>
              Only for emergencies (a bad sync you need to undo immediately). This does not touch the workbook in
              Teams — the next Excel sync will overwrite this again.
            </span>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && restoreFromJson(e.target.files[0])}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-slate-300 text-slate-700 hover:bg-slate-50"
          >
            <Upload size={14} /> Restore from JSON file
          </button>
        </div>
      )}
    </div>
  )
}

export default function Admin() {
  const { canEdit, isSuperAdmin } = useAuth()
  const { data, error, reset } = usePortalData()

  function exportJson() {
    saveBlobAs(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), 'portal-data.json')
  }

  function restoreDefaults() {
    if (!window.confirm('Restore demo defaults — replaces ALL portal content. This cannot be undone.')) return
    reset()
  }

  return (
    <div className="slide">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Data Sync · Excel
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Portal data is maintained in an Excel workbook. Sync it here to update the portal.
          </p>
        </div>
        {canEdit && (
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <button
              onClick={exportJson}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              <Download size={15} /> Export JSON backup
            </button>
            {/* Wiping the portal back to seed data is Super Admin only (the API enforces it too). */}
            {isSuperAdmin && (
              <button
                onClick={restoreDefaults}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                <RotateCcw size={15} /> Reset to defaults
              </button>
            )}
          </div>
        )}
      </header>

      {error && (
        <div className="mb-4 flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <AlertTriangle size={15} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {!canEdit ? (
        <PortalPreview />
      ) : (
        <div className="space-y-6">
          <ExcelSyncPanel />
          <PortalPreview />
          <BreakGlassRestore />
        </div>
      )}
    </div>
  )
}
