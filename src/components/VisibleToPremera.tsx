import { Eye, EyeOff } from 'lucide-react'
import { useContext } from 'react'
import { AuthContext } from '../context/AuthContext'

/**
 * Shown to UST users only: whether Premera stakeholders can see this row (its "Premera
 * Attention" cell is Yes). Premera users only ever receive visible rows, so for them it
 * renders nothing.
 */
export default function VisibleToPremera({ flagged }: { flagged?: boolean }) {
  // Read the context directly: outside an AuthProvider (e.g. isolated component tests) this is just not a UST view.
  const canEdit = useContext(AuthContext)?.canEdit ?? false
  if (!canEdit) return null
  return flagged ? (
    <span className="inline-flex items-center gap-1 ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 whitespace-nowrap">
      <Eye size={10} aria-hidden /> Visible to Premera
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-500 whitespace-nowrap">
      <EyeOff size={10} aria-hidden /> UST only
    </span>
  )
}
