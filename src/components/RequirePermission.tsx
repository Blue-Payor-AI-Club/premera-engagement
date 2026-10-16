import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Lock } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import type { Permission } from '../lib/authApi'

/** Route guard. Renders an explicit "no access" page rather than silently redirecting, so
 * someone who follows a stale bookmark understands why they can't see it. */
export default function RequirePermission({ permission, children }: { permission: Permission; children: ReactNode }) {
  const { can } = useAuth()
  if (can(permission)) return <>{children}</>
  return (
    <div className="slide max-w-lg mx-auto text-center py-16">
      <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-500"><Lock size={22} /></div>
      <h1 className="text-xl font-bold text-slate-900">You don't have access to this page</h1>
      <p className="text-sm text-slate-500 mt-2">Your role doesn't include this area. If you think you need it, contact a UST Super Admin.</p>
      <Link to="/program" className="inline-block mt-5 text-sm font-semibold text-[#0067b1] hover:underline">Back to the portal</Link>
    </div>
  )
}
