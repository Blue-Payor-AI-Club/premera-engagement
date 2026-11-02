import { useState, useEffect, type FormEvent } from 'react'
import { Star, Send, MessageSquareText, CheckCircle2, X } from 'lucide-react'
import { apiFetch } from '../lib/api'

const FALLBACK_AREAS = [
  'Application Support',
  'Application Development',
  'Claims Operations',
  'Provider Data Management',
  'Database Administration',
  'End-to-End Testing',
  'Enrollment & Billing',
  'Product Configuration',
  'Microsoft 365 Support',
  'Provider Appeals & Grievances (Appian)',
  'Provider Contact Center',
  'Service Desk / IT Operations Center',
  'Other',
]

const PRIORITY_COLORS: Record<string, string> = {
  Low: '#64748b',
  Medium: '#b45309',
  High: '#c2410c',
  Critical: '#b91c1c',
}

interface Entry {
  id: string
  rating: number
  area: string
  priority: string
  subject: string
  details?: string
  createdAt?: string
}

function Stars({ value, onChange }: { value: number; onChange?: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange?.(n)}
          className={onChange ? 'cursor-pointer' : 'cursor-default'}
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
        >
          <Star size={onChange ? 26 : 16} fill={n <= value ? '#f2b705' : 'none'} stroke={n <= value ? '#f2b705' : '#cbd5e1'} />
        </button>
      ))}
    </div>
  )
}

export default function Feedback() {
  const [rating, setRating]     = useState(0)
  const [area, setArea]         = useState('')
  const [priority, setPriority] = useState('Medium')
  const [subject, setSubject]   = useState('')
  const [details, setDetails]   = useState('')
  const [log, setLog]           = useState<Entry[]>([])
  const [avg, setAvg]           = useState<string | null>(null)
  const [areas, setAreas]       = useState<string[]>(FALLBACK_AREAS)
  const [toast, setToast]       = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Load entries, summary, and valid areas on mount
  useEffect(() => {
    apiFetch('/feedback')
      .then(async res => {
        const data = await res.json() as { entries: Entry[] }
        setLog(data.entries ?? [])
      })
      .catch(() => { /* API unavailable — log stays empty */ })

    apiFetch('/feedback/summary')
      .then(async res => {
        const data = await res.json() as { count: number; average: number }
        if (data.count > 0) setAvg(data.average.toFixed(1))
      })
      .catch(() => { /* ignore */ })

    apiFetch('/feedback/areas')
      .then(async res => {
        const data = await res.json() as string[]
        if (data.length > 0) setAreas(data)
      })
      .catch(() => { /* fall back to FALLBACK_AREAS */ })
  }, [])

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!subject.trim() || !rating || submitting) return
    setSubmitting(true)
    try {
      const res = await apiFetch('/feedback', {
        method: 'POST',
        body: JSON.stringify({ rating, area, priority, subject, details }),
      })
      const entry = await res.json() as Entry
      const newLog = [entry, ...log]
      setLog(newLog)
      setAvg((newLog.reduce((s, e) => s + e.rating, 0) / newLog.length).toFixed(1))
      setSubject('')
      setDetails('')
      setArea('')
      setRating(0)
      setPriority('Medium')
      setToast(true)
    } catch {
      /* could surface an error toast here */
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="slide">
      <header className="mb-6">
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900">Feedback to UST</h1>
        <p className="mt-1 text-slate-600">Premera stakeholders share what's working well and where UST should improve.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Form */}
        <form data-tour="feedback-form" onSubmit={submit} className="card p-6 space-y-5">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <MessageSquareText size={18} style={{ color: '#0067b1' }} /> New Feedback
          </h2>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">Overall experience</label>
            <Stars value={rating} onChange={setRating} />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">Area</label>
            <select
              value={area}
              onChange={(e) => setArea(e.target.value)}
              className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0067b1]/40"
              required
            >
              <option value="" disabled>Select an area…</option>
              {areas.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0067b1]/40"
            >
              <option>Low</option>
              <option>Medium</option>
              <option>High</option>
              <option>Critical</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">Subject</label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0067b1]/40"
              placeholder="Brief summary of your feedback"
              required
            />
          </div>

          <div>
            <label htmlFor="feedback-details" className="block text-sm font-medium text-slate-600 mb-1.5">
              Details{area === 'Other' && <span className="text-red-600"> (required for Other — what is it about?)</span>}
            </label>
            <textarea
              id="feedback-details"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              required={area === 'Other'}
              className="w-full border border-slate-300 rounded-lg p-2.5 text-sm h-32 focus:outline-none focus:ring-2 focus:ring-[#0067b1]/40"
              placeholder="Share what's working well or what UST should improve..."
            />
          </div>

          <button
            type="submit"
            disabled={submitting || !rating}
            className="w-full inline-flex items-center justify-center gap-2 text-white px-5 py-2.5 rounded-lg font-semibold shadow-sm disabled:opacity-50"
            style={{ background: 'linear-gradient(150deg,#00a0df,#0067b1)' }}
          >
            <Send size={16} /> {submitting ? 'Sending…' : 'Send to UST'}
          </button>
        </form>

        {/* Log */}
        <aside className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-800">Feedback Log</h3>
            <div className="text-sm text-slate-400">{log.length} submissions</div>
          </div>

          {avg && (
            <div className="rounded-lg p-4 mb-4 flex items-center gap-3" style={{ background: 'rgba(0,103,177,.06)' }}>
              <div className="text-3xl font-extrabold text-slate-800">{avg}</div>
              <div>
                <Stars value={Math.round(Number(avg))} />
                <div className="text-xs text-slate-500 mt-1">Average rating</div>
              </div>
            </div>
          )}

          <div className="space-y-3 max-h-[28rem] overflow-auto pr-1">
            {log.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-8">No feedback submitted yet.</p>
            )}
            {log.map((e) => (
              <div key={e.id} className="p-3 rounded-lg border border-slate-100 bg-slate-50">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-slate-800">{e.subject}</div>
                  <Stars value={e.rating} />
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs font-medium" style={{ color: '#0067b1' }}>{e.area}</span>
                  {e.priority && (
                    <span
                      className="text-[10px] font-bold uppercase"
                      style={{ color: PRIORITY_COLORS[e.priority] ?? '#64748b' }}
                    >
                      {e.priority}
                    </span>
                  )}
                </div>
                {e.details && <div className="text-sm text-slate-600 mt-1">{e.details}</div>}
              </div>
            ))}
          </div>
        </aside>
      </div>

      {toast && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ background: 'rgba(15,23,42,0.55)' }}>
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mb-5" style={{ background: 'rgba(26,162,96,0.1)' }}>
              <CheckCircle2 size={36} className="text-emerald-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Feedback Received!</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Your feedback has been captured and the Premera-UST engagement team will review it and take the necessary action.
            </p>
            <button
              onClick={() => setToast(false)}
              className="mt-6 px-6 py-2.5 text-sm font-semibold text-white rounded-lg transition hover:opacity-90"
              style={{ background: 'linear-gradient(150deg,#00a0df,#0067b1)' }}
            >
              Close
            </button>
            <button
              onClick={() => setToast(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
