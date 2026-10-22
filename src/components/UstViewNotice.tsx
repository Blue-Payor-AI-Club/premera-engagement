import { Eye } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { useContext } from 'react'
import { AuthContext } from '../context/AuthContext'

/** Tells UST users that Premera stakeholders only see the rows marked "Premera Attention = Yes". */
export default function UstViewNotice() {
  // Read the context directly: outside an AuthProvider (e.g. isolated component tests) this is just not a UST view.
  const canEdit = useContext(AuthContext)?.canEdit ?? false
  const { pathname } = useLocation()
  if (!canEdit || !(pathname.startsWith('/program') || pathname.startsWith('/risks'))) return null
  return (
    <div role="note" className="mb-4 flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
      <Eye size={14} className="mt-0.5 shrink-0 text-slate-500" aria-hidden />
      <span>
        You&apos;re seeing everything. Premera stakeholders only see rows marked <strong>Visible to Premera</strong>; rows
        tagged <strong>UST only</strong> are hidden from them. Set <em>Premera Attention</em> to Yes in the workbook to share a row.
      </span>
    </div>
  )
}
