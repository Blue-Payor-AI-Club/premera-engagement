import { Eye, EyeOff } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { useContext } from 'react'
import { AuthContext } from '../context/AuthContext'
import { PortalDataContext } from '../context/PortalDataContext'

/** UST users: what Premera can see, and a "View as Premera" preview that shows exactly that. */
export default function UstViewNotice() {
  // Read the contexts directly: outside the providers (isolated component tests) this is just not a UST view.
  const canEdit = useContext(AuthContext)?.canEdit ?? false
  const portal = useContext(PortalDataContext)
  const { pathname } = useLocation()
  if (!canEdit || !(pathname.startsWith('/program') || pathname.startsWith('/report'))) return null
  const toggle = (
    <button
      type="button"
      onClick={() => portal?.setPreview(!portal.preview)}
      className="ml-auto shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-current font-semibold hover:bg-white transition"
    >
      {portal?.preview ? <><EyeOff size={12} aria-hidden /> Exit preview</> : <><Eye size={12} aria-hidden /> View as Premera</>}
    </button>
  )
  if (portal?.preview) {
    return (
      <div role="status" className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
        <Eye size={14} className="shrink-0" aria-hidden />
        <span><strong>Previewing as Premera.</strong> This is exactly what Premera stakeholders see. Editing is off until you exit.</span>
        {toggle}
      </div>
    )
  }
  return (
    <div role="note" className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
      <Eye size={14} className="shrink-0 text-slate-500" aria-hidden />
      <span className="min-w-0 flex-1">
        You&apos;re seeing everything. Premera stakeholders only see rows marked <strong>Visible to Premera</strong>; rows
        tagged <strong>UST only</strong> are hidden from them. To share a row, tick <em>Premera Attention</em> when editing it (pencil) or set it to Yes in the workbook.
      </span>
      {toggle}
    </div>
  )
}
