import { useEffect, useState, type FormEvent } from 'react'
import { ShieldAlert, MailCheck } from 'lucide-react'
import AuthShell from '../components/AuthShell'
import { ErrorBanner, btnPrimary, btnSecondary, inputCls } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { requestCode, submitAccessRequest, verifyCode } from '../lib/authApi'
import { errorMessage } from '../lib/format'

type Step =
  | { name: 'email' }
  | { name: 'code'; email: string }
  | { name: 'no-access'; email: string; requestToken: string }
  | { name: 'requested'; email: string; alreadyPending: boolean }

const RESEND_SECONDS = 60

export default function Login() {
  const { completeLogin } = useAuth()
  const [step, setStep] = useState<Step>({ name: 'email' })
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  async function run(action: () => Promise<void>) {
    setError(null)
    setBusy(true)
    try {
      await action()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  function sendCode(e?: FormEvent) {
    e?.preventDefault()
    const address = (step.name === 'code' ? step.email : email).trim()
    if (!address) return
    void run(async () => {
      await requestCode(address)
      setCode('')
      setCooldown(RESEND_SECONDS)
      setStep({ name: 'code', email: address })
    })
  }

  function verify(e: FormEvent) {
    e.preventDefault()
    if (step.name !== 'code') return
    const current = step
    void run(async () => {
      const result = await verifyCode(current.email, code.trim())
      if (result.status === 'authenticated') {
        completeLogin({ token: result.token, user: result.user })
      } else if (result.pendingRequest) {
        setStep({ name: 'requested', email: result.email, alreadyPending: true })
      } else {
        setStep({ name: 'no-access', email: result.email, requestToken: result.requestToken })
      }
    })
  }

  function requestAccess(e: FormEvent) {
    e.preventDefault()
    if (step.name !== 'no-access') return
    const current = step
    void run(async () => {
      await submitAccessRequest(current.requestToken, { name: name.trim() || undefined, message: message.trim() })
      setStep({ name: 'requested', email: current.email, alreadyPending: false })
    })
  }

  function startOver() {
    setError(null)
    setCode('')
    setStep({ name: 'email' })
  }

  if (step.name === 'email') {
    return (
      <AuthShell title="Sign in" subtitle="Enter your work email. We'll send you a one-time code — no password needed.">
        <form onSubmit={sendCode} className="space-y-4">
          <label className="block text-sm font-medium text-slate-700">
            Email address
            <input
              type="email"
              autoComplete="email"
              autoFocus
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className={`${inputCls} mt-1`}
            />
          </label>
          {error && <ErrorBanner>{error}</ErrorBanner>}
          <button type="submit" disabled={busy || !email.trim()} className={`${btnPrimary} w-full`}>
            {busy ? 'Sending…' : 'Send sign-in code'}
          </button>
        </form>
      </AuthShell>
    )
  }

  if (step.name === 'code') {
    return (
      <AuthShell title="Check your email" subtitle={`We sent a 6-digit code to ${step.email}. It expires in 10 minutes.`}>
        <form onSubmit={verify} className="space-y-4">
          <label className="block text-sm font-medium text-slate-700">
            Sign-in code
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              required
              maxLength={6}
              pattern="\d{6}"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="123456"
              className={`${inputCls} mt-1 text-center text-lg tracking-[0.4em] font-mono`}
            />
          </label>
          {error && <ErrorBanner>{error}</ErrorBanner>}
          <button type="submit" disabled={busy || code.length !== 6} className={`${btnPrimary} w-full`}>
            {busy ? 'Verifying…' : 'Verify and sign in'}
          </button>
          <div className="flex items-center justify-between text-sm">
            <button type="button" onClick={startOver} className="text-slate-500 hover:text-slate-700">
              Use a different email
            </button>
            <button
              type="button"
              onClick={() => sendCode()}
              disabled={busy || cooldown > 0}
              className="text-[#0067b1] hover:underline disabled:text-slate-400 disabled:no-underline"
            >
              {cooldown > 0 ? `Resend code (${cooldown}s)` : 'Resend code'}
            </button>
          </div>
        </form>
      </AuthShell>
    )
  }

  if (step.name === 'no-access') {
    return (
      <AuthShell
        title="You don't have access to this portal"
        subtitle={`${step.email} isn't registered yet. Tell us why you need access and a UST administrator will review your request.`}
      >
        <form onSubmit={requestAccess} className="space-y-4">
          <div className="flex items-start gap-2 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            <ShieldAlert size={15} className="shrink-0 mt-0.5" />
            <span>Your email address is verified. This request will be reviewed by a UST Super Admin.</span>
          </div>
          <label className="block text-sm font-medium text-slate-700">
            Your name <span className="text-slate-400 font-normal">(optional)</span>
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} className={`${inputCls} mt-1`} />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Message
            <textarea
              required
              rows={4}
              maxLength={1000}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Which team are you on, and what do you need access for?"
              className={`${inputCls} mt-1 resize-y`}
            />
          </label>
          {error && <ErrorBanner>{error}</ErrorBanner>}
          <div className="flex gap-2">
            <button type="button" onClick={startOver} className={btnSecondary}>Cancel</button>
            <button type="submit" disabled={busy || !message.trim()} className={`${btnPrimary} flex-1`}>
              {busy ? 'Sending…' : 'Request access'}
            </button>
          </div>
        </form>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      title={step.alreadyPending ? 'Your request is pending' : 'Request sent'}
      subtitle={
        step.alreadyPending
          ? `You've already asked for access with ${step.email}. A UST administrator hasn't reviewed it yet.`
          : `Thanks — a UST administrator will review your request for ${step.email}.`
      }
    >
      <div className="flex items-start gap-2 text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3 py-3">
        <MailCheck size={16} className="shrink-0 mt-0.5 text-[#0067b1]" />
        <span>You'll get an email as soon as there's a decision. Once approved, come back here and sign in with the same address.</span>
      </div>
      <button type="button" onClick={startOver} className={`${btnSecondary} mt-4 w-full`}>Back to sign in</button>
    </AuthShell>
  )
}
