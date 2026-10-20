import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import AuthShell from '../components/AuthShell'
import { ErrorBanner, Spinner, btnPrimary, btnSecondary } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { acceptInvite, getInvite, type InviteInfo } from '../lib/authApi'
import { errorMessage, formatDateTime } from '../lib/format'

export default function InviteAccept() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const navigate = useNavigate()
  const { completeLogin } = useAuth()

  const [invite, setInvite] = useState<InviteInfo | null>(null)
  const [error, setError] = useState<string | null>(token ? null : 'This invitation link is incomplete.')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!token) return
    let cancelled = false
    getInvite(token)
      .then((info) => { if (!cancelled) setInvite(info) })
      .catch((err) => { if (!cancelled) setError(errorMessage(err)) })
    return () => { cancelled = true }
  }, [token])

  const accept = useCallback(async () => {
    setBusy(true)
    setError(null)
    try {
      const session = await acceptInvite(token)
      completeLogin({ token: session.token, user: session.user })
      navigate('/program', { replace: true })
    } catch (err) {
      setError(errorMessage(err))
      setBusy(false)
    }
  }, [token, completeLogin, navigate])

  if (!invite && !error) {
    return <AuthShell title="Checking your invitation…"><Spinner label="One moment…" /></AuthShell>
  }

  if (!invite) {
    return (
      <AuthShell title="Invitation unavailable">
        <ErrorBanner>{error}</ErrorBanner>
        <button type="button" onClick={() => navigate('/', { replace: true })} className={`${btnSecondary} mt-4 w-full`}>
          Go to sign in
        </button>
      </AuthShell>
    )
  }

  return (
    <AuthShell title="You've been invited" subtitle={`${invite.invitedBy} invited you to the UST × Premera Engagement Portal.`}>
      <dl className="text-sm space-y-2 mb-5">
        <div className="flex justify-between gap-4"><dt className="text-slate-500">Email</dt><dd className="font-medium text-slate-800">{invite.email}</dd></div>
        <div className="flex justify-between gap-4"><dt className="text-slate-500">Access level</dt><dd className="font-medium text-slate-800">{invite.roleLabel}</dd></div>
        <div className="flex justify-between gap-4"><dt className="text-slate-500">Invitation expires</dt><dd className="text-slate-800">{formatDateTime(invite.expiresAt)}</dd></div>
      </dl>
      {error && <div className="mb-3"><ErrorBanner>{error}</ErrorBanner></div>}
      <button type="button" onClick={() => void accept()} disabled={busy} className={`${btnPrimary} w-full`}>
        {busy ? 'Setting up your account…' : 'Accept invitation'}
      </button>
    </AuthShell>
  )
}
