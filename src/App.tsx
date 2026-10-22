import { useEffect, useRef, useState } from 'react'
import { NavLink, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import UstViewNotice from './components/UstViewNotice'
import { Menu, X, BarChart3, AlertTriangle, MessageSquareText, ChevronRight, LayoutGrid } from 'lucide-react'
import './index.css'
import ProgramLevel from './pages/ProgramLevel'
import Feedback from './pages/Feedback'
import Admin from './pages/Admin'
import Risks from './pages/Risks'
import SuperAdmin from './pages/SuperAdmin'
import Activity from './pages/Activity'
import Login from './pages/Login'
import InviteAccept from './pages/InviteAccept'
import RequirePermission from './components/RequirePermission'
import { Spinner } from './components/ui'
import { useAuth } from './context/AuthContext'
import UserMenu from './components/UserMenu'
import { PRIMARY_NAV } from './lib/navigation'

// ─── Tour ─────────────────────────────────────────────────────────────────────

const TOUR_KEY = 'ustpremera_tour_v2'
const CARD_W = 360
const GAP = 14

const TOUR_STEPS = [
  {
    page: '/program',
    selector: '[data-tour="topbar"]',
    placement: 'bottom' as const,
    icon: <LayoutGrid size={20} className="text-[#0067b1]" />,
    label: 'Navigation',
    title: 'Your Navigation',
    body: 'Move between the three main sections of the portal using the menu above.',
    highlights: [
      { color: '#0067b1', text: 'Program Level — delivery health across all workstreams' },
      { color: '#f2b705', text: 'Risks & Issues — active blockers and escalations' },
      { color: '#1aa260', text: 'Feedback to UST — structured stakeholder input channel' },
    ],
  },
  {
    page: '/program',
    selector: '[data-tour="scorecard"]',
    placement: 'bottom' as const,
    icon: <BarChart3 size={20} className="text-[#0067b1]" />,
    label: 'Scorecard',
    title: 'Program Scorecard',
    body: 'A live summary of workstream health. Numbers update whenever UST pushes new data.',
    highlights: [
      { color: '#1aa260', text: 'On Track — workstreams progressing as planned' },
      { color: '#f2b705', text: 'At Risk / Delayed — workstreams needing immediate attention' },
      { color: '#8e44ad', text: 'Complete — workstreams that have fully delivered' },
    ],
  },
  {
    page: '/program',
    selector: '[data-tour="tab-switcher"]',
    placement: 'bottom' as const,
    icon: <LayoutGrid size={20} className="text-[#0067b1]" />,
    label: 'ITO, BPO & Transition',
    title: 'ITO, BPO & Transition',
    body: 'The engagement is split into two program divisions, plus a Transition view. Click a tab to switch your view.',
    highlights: [
      { color: '#0067b1', text: 'ITO — Infrastructure & Technology Operations workstreams' },
      { color: '#0067b1', text: 'BPO — Business Process Operations workstreams' },
      { color: '#1aa260', text: 'Each division has its own workstreams, milestones, and issues' },
      { color: '#0067b1', text: 'Transition — executive summary and dashboard for the transition program' },
    ],
  },
  {
    page: '/program',
    selector: '[data-tour="workstream-grid"]',
    placement: 'top' as const,
    icon: <BarChart3 size={20} className="text-[#0067b1]" />,
    label: 'Workstreams',
    title: 'Workstream Table',
    body: 'Each row is a workstream. Expand it to see milestones. Flag concerns inline with thumbs up / down.',
    highlights: [
      { color: '#0067b1', text: 'Click ▸ on any row to expand key milestones with dates and RAG status' },
      { color: '#ef4444', text: '"View" button appears on rows needing Premera action — links to Risks page' },
      { color: '#f2b705', text: 'Thumbs down — capture a concern inline; it goes straight to the team' },
    ],
  },
  {
    page: '/risks',
    selector: '[data-tour="risks-summary"]',
    placement: 'bottom' as const,
    icon: <AlertTriangle size={20} className="text-amber-500" />,
    label: 'Risks',
    title: 'Risks & Issues',
    body: 'A focused view of every active blocker and escalation across both program divisions.',
    highlights: [
      { color: '#ef4444', text: '"Premera Action Required" — items waiting for your input or sign-off' },
      { color: '#f2b705', text: 'Priority badges — Critical, High, Medium, Low at a glance' },
      { color: '#0067b1', text: 'Click any row — see the full risk action log and owner history' },
    ],
  },
  {
    page: '/feedback',
    selector: '[data-tour="feedback-form"]',
    placement: 'right' as const,
    icon: <MessageSquareText size={20} className="text-[#0067b1]" />,
    label: 'Feedback',
    title: 'Feedback to UST',
    body: 'Submit structured feedback here at any time. Every submission is logged and visible to both teams.',
    highlights: [
      { color: '#0067b1', text: 'Star rating + priority — rate experience and set urgency (Low → Critical)' },
      { color: '#1aa260', text: 'Area tagging — tie feedback to a specific workstream or service area' },
      { color: '#f2b705', text: 'Feedback log on the right — full history with average satisfaction score' },
    ],
  },
]

function clamp(val: number, min: number, max: number) { return Math.max(min, Math.min(val, max)) }

function getCardStyle(rect: DOMRect, placement: 'top' | 'bottom' | 'left' | 'right') {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const cx = rect.left + rect.width / 2
  switch (placement) {
    case 'bottom':
      return { top: rect.bottom + GAP, left: clamp(cx - CARD_W / 2, 12, vw - CARD_W - 12) }
    case 'top':
      return { bottom: vh - rect.top + GAP, left: clamp(cx - CARD_W / 2, 12, vw - CARD_W - 12) }
    case 'right':
      return { top: clamp(rect.top, 12, vh - 320), left: Math.min(rect.right + GAP, vw - CARD_W - 12) }
    case 'left':
      return { top: clamp(rect.top, 12, vh - 320), right: vw - rect.left + GAP }
  }
}

function TourGuide() {
  const [step, setStep] = useState(0)
  const [visible, setVisible] = useState(false)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const navigate = useNavigate()
  const location = useLocation()
  const findRef = useRef(0)

  useEffect(() => {
    if (!localStorage.getItem(TOUR_KEY)) setVisible(true)
  }, [])

  // Find target element — runs when step or pathname changes
  useEffect(() => {
    if (!visible) return
    const cur = TOUR_STEPS[step]

    // Navigate to the right page first
    if (location.pathname !== cur.page) {
      navigate(cur.page)
      return
    }

    // Give the page DOM time to settle
    const id = ++findRef.current
    const t = setTimeout(() => {
      if (id !== findRef.current) return
      const el = document.querySelector(cur.selector) as HTMLElement | null
      if (!el) return
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      // Re-read rect after scroll settles
      setTimeout(() => {
        if (id !== findRef.current) return
        setRect(el.getBoundingClientRect())
      }, 350)
    }, 180)
    return () => clearTimeout(t)
  }, [visible, step, location.pathname]) // eslint-disable-line react-hooks/exhaustive-deps

  // Keep rect fresh on scroll / resize
  useEffect(() => {
    if (!visible) return
    const cur = TOUR_STEPS[step]
    const update = () => {
      const el = document.querySelector(cur.selector) as HTMLElement | null
      if (el) setRect(el.getBoundingClientRect())
    }
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
  }, [visible, step])

  function dismiss() {
    localStorage.setItem(TOUR_KEY, 'done')
    setVisible(false)
    setRect(null)
  }

  function goStep(n: number) {
    setRect(null)
    setStep(n)
  }

  function next() {
    if (step < TOUR_STEPS.length - 1) goStep(step + 1)
    else dismiss()
  }

  if (!visible) return null

  const cur = TOUR_STEPS[step]
  const isLast = step === TOUR_STEPS.length - 1
  const cardStyle = rect ? getCardStyle(rect, cur.placement) : undefined

  return (
    <>
      {/* Spotlight overlay — box-shadow creates the dim surround; border frames the target */}
      {rect && (
        <div
          className="fixed z-[9997] pointer-events-none rounded-xl"
          style={{
            top: rect.top - 6,
            left: rect.left - 6,
            width: rect.width + 12,
            height: rect.height + 12,
            boxShadow: '0 0 0 9999px rgba(15,23,42,0.62)',
            border: '2px solid #00a0df',
          }}
        />
      )}

      {/* Fallback dim when rect not yet found */}
      {!rect && (
        <div className="fixed inset-0 z-[9997] pointer-events-none" style={{ background: 'rgba(15,23,42,0.55)' }} />
      )}

      {/* Tooltip card */}
      {(rect || !rect) && (
        <div
          className="fixed z-[9998] bg-white rounded-2xl shadow-2xl overflow-hidden"
          style={{ width: CARD_W, ...(cardStyle ?? { bottom: 24, right: 24 }) }}
        >
          {/* Progress bar */}
          <div className="h-1 bg-slate-100">
            <div
              className="h-full transition-all duration-400"
              style={{ width: `${((step + 1) / TOUR_STEPS.length) * 100}%`, background: 'linear-gradient(90deg,#00a0df,#0067b1)' }}
            />
          </div>

          <div className="p-5">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-slate-50 border border-slate-100 shrink-0">{cur.icon}</div>
                <div>
                  <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    Step {step + 1} of {TOUR_STEPS.length}
                  </div>
                  <div className="flex gap-1 mt-0.5">
                    {TOUR_STEPS.map((s, i) => (
                      <button
                        key={i}
                        onClick={() => goStep(i)}
                        title={s.label}
                        className="rounded-full transition-all duration-200"
                        style={{
                          width: i === step ? 20 : 7,
                          height: 7,
                          background: i < step ? '#0067b1' : i === step ? '#00a0df' : '#e2e8f0',
                        }}
                        aria-label={`Step ${i + 1}: ${s.label}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <button
                onClick={dismiss}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition shrink-0"
                aria-label="Close tour"
              >
                <X size={15} />
              </button>
            </div>

            {/* Content */}
            <h3 className="text-base font-bold text-slate-900 mb-1.5">{cur.title}</h3>
            <p className="text-[13px] text-slate-500 leading-relaxed mb-4">{cur.body}</p>

            {/* Highlights */}
            <div className="rounded-xl bg-slate-50 border border-slate-100 px-3.5 py-3 space-y-2">
              {cur.highlights.map((h, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="mt-[5px] h-1.5 w-1.5 rounded-full shrink-0" style={{ background: h.color }} />
                  <span className="text-[12px] text-slate-600 leading-snug">{h.text}</span>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between mt-4">
              <button onClick={dismiss} className="text-[12px] text-slate-400 hover:text-slate-600 transition">
                Skip tour
              </button>
              <div className="flex items-center gap-1.5">
                {step > 0 && (
                  <button
                    onClick={() => goStep(step - 1)}
                    className="px-3 py-1.5 text-[13px] text-slate-500 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition"
                  >
                    Back
                  </button>
                )}
                <button
                  onClick={next}
                  className="flex items-center gap-1 px-4 py-1.5 text-[13px] font-semibold text-white rounded-lg transition hover:opacity-90"
                  style={{ background: 'linear-gradient(150deg,#00a0df,#0067b1)' }}
                >
                  {isLast ? 'Finish' : 'Next'}
                  {!isLast && <ChevronRight size={13} />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

const NAV = PRIMARY_NAV

function LiveClock() {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const date = now.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
  const time = now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
      <div className="leading-tight text-right">
        <div className="font-semibold text-slate-700 tabular-nums">{time}</div>
        <div className="text-[11px] text-slate-400">{date}</div>
      </div>
    </div>
  )
}

function TopBar() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <nav data-tour="topbar" className="sticky top-0 z-[9996] bg-white/90 backdrop-blur border-b border-slate-200">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
        {/* co-brand */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="h-9 px-3 rounded-md flex items-center justify-center" style={{ background: 'linear-gradient(150deg,#16263b,#0b2440)' }}>
            <img src="/logo-main-white.svg" alt="UST" className="h-5 w-auto max-w-[72px] object-contain" />
          </div>
          <span className="text-slate-300">×</span>
          <div className="h-9 px-2 flex items-center justify-center">
            <img src="/pbc_logo.svg" alt="Premera Blue Cross" className="h-6 w-auto max-w-[110px] object-contain" />
          </div>
          <div className="ml-1 leading-tight hidden lg:block">
            <div className="text-sm font-bold text-slate-800">Engagement Portal</div>
            <div className="text-[11px] text-slate-400">UST · Premera Blue Cross</div>
          </div>
        </div>

        {/* desktop nav */}
        <div className="hidden md:flex gap-1">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) =>
                `whitespace-nowrap px-3 py-2 rounded-md text-sm font-medium transition ${
                  isActive ? 'bg-[#e7f1fa] text-[#0067b1]' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`
              }
            >
              {n.label}
            </NavLink>
          ))}
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="hidden xl:block pr-1">
            <LiveClock />
          </div>
          <UserMenu />
          {/* mobile hamburger */}
          <button
            className="md:hidden p-2 rounded-md text-slate-600 hover:bg-slate-100 transition"
            onClick={() => setMenuOpen(v => !v)}
            aria-label="Toggle menu"
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* mobile dropdown nav */}
      {menuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white/95 backdrop-blur px-4 py-3 flex flex-col gap-1">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) =>
                `block px-3 py-2.5 rounded-md text-sm font-medium transition ${
                  isActive ? 'bg-[#e7f1fa] text-[#0067b1]' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`
              }
            >
              {n.label}
            </NavLink>
          ))}
        </div>
      )}
    </nav>
  )
}

function AuthenticatedApp() {
  return (
    <div className="min-h-screen">
      <TourGuide />
      <TopBar />
      <main className="max-w-[1400px] mx-auto px-3 sm:px-6 py-6 sm:py-8">
        <UstViewNotice />
        <Routes>
          <Route path="/" element={<Navigate to="/program" replace />} />
          <Route path="/program" element={<ProgramLevel />} />
          <Route path="/risks" element={<Risks />} />
          <Route path="/feedback" element={<Feedback />} />
          <Route path="/activity" element={<RequirePermission permission="audit:read"><Activity /></RequirePermission>} />
          <Route path="/admin" element={<RequirePermission permission="portal:write"><Admin /></RequirePermission>} />
          <Route path="/superadmin" element={<RequirePermission permission="admin:manage"><SuperAdmin /></RequirePermission>} />
          <Route path="*" element={<Navigate to="/program" replace />} />
        </Routes>
      </main>
    </div>
  )
}

/** Sign-in gate. Nothing in the portal renders (or fetches) until there is a validated session. */
export default function App() {
  const { token, user, loading } = useAuth()
  const location = useLocation()

  // The invite page is reachable signed-out (that's its whole purpose).
  if (location.pathname === '/invite') return <InviteAccept />
  if (loading || (token && !user)) {
    return <div className="min-h-screen flex items-center justify-center"><Spinner label="Loading…" /></div>
  }
  if (!token || !user) return <Login />
  return <AuthenticatedApp />
}
