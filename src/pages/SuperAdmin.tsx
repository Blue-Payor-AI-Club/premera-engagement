import { useState } from 'react'
import { Bell, Mail, Send, ShieldCheck, UserCheck, Users } from 'lucide-react'
import { Spinner } from '../components/ui'
import UsersTab from '../components/superadmin/UsersTab'
import RequestsTab from '../components/superadmin/RequestsTab'
import InvitesTab from '../components/superadmin/InvitesTab'
import NotificationsTab from '../components/superadmin/NotificationsTab'
import SignInTab from '../components/superadmin/SignInTab'
import EmailLogTab from '../components/superadmin/EmailLogTab'
import { useResource } from '../hooks/useResource'
import { adminApi } from '../lib/adminApi'

const TABS = [
  { key: 'users', label: 'Users', icon: Users },
  { key: 'requests', label: 'Access requests', icon: UserCheck },
  { key: 'invites', label: 'Invitations', icon: Send },
  { key: 'notifications', label: 'Email notifications', icon: Bell },
  { key: 'signin', label: 'Sign-in', icon: ShieldCheck },
  { key: 'emails', label: 'Email log', icon: Mail },
] as const
type TabKey = (typeof TABS)[number]['key']

export default function SuperAdmin() {
  const [tab, setTab] = useState<TabKey>('requests')
  const requests = useResource(adminApi.listAccessRequests)
  const pendingCount = (requests.data ?? []).filter((r) => r.status === 'pending').length

  return (
    <div className="slide">
      <header className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
          <ShieldCheck className="text-[#0067b1]" size={26} /> Super Admin
        </h1>
        <p className="text-slate-500 text-sm mt-1">Manage who can use the portal, and who is told when things happen.</p>
      </header>

      <div role="tablist" aria-label="Super Admin sections" className="mb-5 p-1 rounded-xl bg-slate-100 flex gap-1 overflow-x-auto">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            role="tab"
            type="button"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`whitespace-nowrap inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition ${
              tab === key ? 'bg-white text-[#0067b1] shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Icon size={15} /> {label}
            {key === 'requests' && pendingCount > 0 && (
              <span className="ml-0.5 min-w-5 px-1.5 rounded-full bg-red-600 text-white text-[11px] font-bold text-center" aria-label={`${pendingCount} pending`}>
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      <div role="tabpanel">
        {tab === 'users' && <UsersTab />}
        {tab === 'requests' &&
          (requests.loading && !requests.data ? (
            <Spinner />
          ) : (
            <RequestsTab requests={requests.data ?? []} error={requests.error} onChanged={requests.reload} />
          ))}
        {tab === 'invites' && <InvitesTab />}
        {tab === 'notifications' && <NotificationsTab />}
        {tab === 'signin' && <SignInTab />}
        {tab === 'emails' && <EmailLogTab />}
      </div>
    </div>
  )
}
