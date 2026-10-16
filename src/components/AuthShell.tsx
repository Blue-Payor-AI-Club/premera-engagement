import type { ReactNode } from 'react'

/** Centered card with the UST × Premera co-brand, shared by sign-in and invite screens. */
export default function AuthShell({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 bg-slate-50">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="h-9 px-3 rounded-md flex items-center justify-center" style={{ background: 'linear-gradient(150deg,#16263b,#0b2440)' }}>
            <img src="/logo-main-white.svg" alt="UST" className="h-5 w-auto max-w-[72px] object-contain" />
          </div>
          <span className="text-slate-300">×</span>
          <img src="/pbc_logo.svg" alt="Premera Blue Cross" className="h-6 w-auto max-w-[110px] object-contain" />
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
          <h1 className="text-xl font-bold text-slate-900">{title}</h1>
          {subtitle && <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">{subtitle}</p>}
          <div className="mt-5">{children}</div>
        </div>
        <p className="text-center text-[11px] text-slate-400 mt-4">Engagement Portal · UST · Premera Blue Cross</p>
      </div>
    </div>
  )
}
