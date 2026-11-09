import type { ReactNode } from 'react'
import { AlertTriangle, Loader2 } from 'lucide-react'

import { buttonVariants, fieldClass } from './variants'

// Class-string forms of the shadcn/ui Button and field styles, for places that style a plain element.
// Prefer the components themselves (./button, ./input) in new code.
export const btnPrimary = buttonVariants()
export const btnSecondary = buttonVariants({ variant: 'outline', size: 'sm' })
export const btnDanger = buttonVariants({ variant: 'destructive-outline', size: 'sm' })
export const inputCls = `${fieldClass} py-2`

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
