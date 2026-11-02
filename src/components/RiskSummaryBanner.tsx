import { AlertTriangle, ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { type IssueRow } from '../data/portalData'

export default function RiskSummaryBanner({ issues }: { issues: IssueRow[] }) {
  const navigate = useNavigate()
  const isOpen = (s: string) => s === 'atRisk' || s === 'delayed'
  const atRiskCount = issues.filter((i) => isOpen(i.status)).length
  const premeraCount = issues.filter((i) => isOpen(i.status) && i.premeraActionRequired).length

  if (atRiskCount === 0) return null

  return (
    <button
      onClick={() => navigate('/risks')}
      className="w-full flex items-center justify-between gap-3 mb-6 px-4 py-3 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 transition text-left group"
    >
      <div className="flex items-center gap-3 min-w-0">
        <AlertTriangle size={17} className="text-amber-500 shrink-0" />
        <span className="text-sm font-semibold text-amber-800">
          Risks &amp; Issues:{' '}
          <span className="text-amber-600">{atRiskCount}</span>
          {premeraCount > 0 && (
            <>
              <span className="mx-2 text-amber-400">·</span>
              Attention required from Premera:{' '}
              <span className="text-red-600">{premeraCount}</span>
            </>
          )}
        </span>
      </div>
      <div className="flex items-center gap-1 text-xs font-medium text-amber-600 group-hover:text-amber-800 shrink-0 transition">
        View all <ChevronRight size={14} />
      </div>
    </button>
  )
}
