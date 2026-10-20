import { useEffect, useRef, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { ChevronDown, FileSpreadsheet, History, LogOut, ShieldCheck } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { visibleUtilityNav } from '../lib/navigation'

const ICONS: Record<string, typeof ShieldCheck> = {
  '/activity': History,
  '/admin': FileSpreadsheet,
  '/superadmin': ShieldCheck,
}

const DESCRIPTIONS: Record<string, string> = {
  '/activity': 'Who changed what, and when',
  '/admin': 'Upload and back up the Excel workbook',
  '/superadmin': 'Users, access requests and notifications',
}

/** "neeta.kuriakose@ust.com" -> "NK"; a display name works too. */
function initials(label: string): string {
  const parts = label.split('@')[0].split(/[\s._-]+/).filter(Boolean)
  const letters = (parts.length > 1 ? parts[0][0] + parts[1][0] : (parts[0] ?? '?').slice(0, 2))
  return letters.toUpperCase()
}

/** One account control instead of a row of icons: identity, management links and sign-out. */
export default function UserMenu() {
  const { user, can, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const links = visibleUtilityNav(can)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (!user) return null
  const label = user.name || user.email

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Account menu"
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full border border-slate-200 bg-white py-1 pl-1 pr-2 hover:bg-slate-50 transition lg:pr-3"
      >
        <span className="h-8 w-8 rounded-full bg-[#e7f1fa] text-[#0067b1] text-xs font-bold flex items-center justify-center">
          {initials(label)}
        </span>
        <span className="hidden lg:block text-left leading-tight">
          <span className="block text-xs font-semibold text-slate-700 max-w-[150px] truncate">{label}</span>
          <span className="block text-[11px] text-slate-400">{user.roleLabel}</span>
        </span>
        <ChevronDown size={14} className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div role="menu" className="absolute right-0 mt-2 w-72 rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <div className="text-sm font-semibold text-slate-800 truncate">
              {user.name ? `Hi, ${user.name.trim().split(/\s+/)[0]}` : label}
            </div>
            {user.name && <div className="text-xs text-slate-500 truncate">{user.email}</div>}
            <span className="mt-2 inline-block rounded-full bg-[#e7f1fa] px-2 py-0.5 text-[11px] font-medium text-[#0067b1]">
              {user.roleLabel}
            </span>
          </div>

          {links.length > 0 && (
            <div className="p-1.5 border-b border-slate-100">
              <div className="px-2.5 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Manage</div>
              {links.map((n) => {
                const Icon = ICONS[n.to] ?? ShieldCheck
                return (
                  <NavLink
                    key={n.to}
                    to={n.to}
                    role="menuitem"
                    onClick={() => setOpen(false)}
                    className={({ isActive }) =>
                      `flex items-start gap-3 rounded-lg px-2.5 py-2 transition ${
                        isActive ? 'bg-[#e7f1fa]' : 'hover:bg-slate-50'
                      }`
                    }
                  >
                    <Icon size={16} className="mt-0.5 shrink-0 text-[#0067b1]" />
                    <span>
                      <span className="block text-sm font-medium text-slate-700">{n.label}</span>
                      <span className="block text-xs text-slate-400">{DESCRIPTIONS[n.to]}</span>
                    </span>
                  </NavLink>
                )
              })}
            </div>
          )}

          <div className="p-1.5">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false)
                logout()
              }}
              className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition"
            >
              <LogOut size={16} className="shrink-0 text-slate-400" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
