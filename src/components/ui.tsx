import type { ReactNode } from 'react'
import { AlertTriangle, Loader2 } from 'lucide-react'

export const btnPrimary =
  'inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed transition hover:opacity-90 bg-[#0067b1]'
export const btnSecondary =
  'inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed'
export const btnDanger =
  'inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border border-red-300 text-red-700 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed'
export const inputCls =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00a0df] focus:border-[#00a0df]'

export function ErrorBanner({ children }: { children: ReactNode }) {
  return (
    <div role="alert" className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
      <AlertTriangle size={15} className="shrink-0 mt-0.5" />
      <span>{children}</span>
    </div>
  )
}

export function Notice({ children }: { children: ReactNode }) {
  return <div role="status" className="text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">{children}</div>
}

export function Spinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-slate-500 py-6" role="status">
      <Loader2 size={16} className="animate-spin" /> {label}
    </div>
  )
}

const BADGE_TONES = {
  green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  amber: 'bg-amber-50 text-amber-800 border-amber-200',
  red: 'bg-red-50 text-red-700 border-red-200',
  blue: 'bg-sky-50 text-sky-800 border-sky-200',
  slate: 'bg-slate-100 text-slate-600 border-slate-200',
}

export function Badge({ tone = 'slate', children }: { tone?: keyof typeof BADGE_TONES; children: ReactNode }) {
  return <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold border ${BADGE_TONES[tone]}`}>{children}</span>
}
