import { useState, useEffect, type FormEvent } from 'react'
import { Button } from '../components/ui/button'
import { Input, Select, Textarea } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../components/ui/dialog'
import { Star, Send, MessageSquareText, CheckCircle2 } from 'lucide-react'
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
            <Label className="block text-sm font-medium mb-1.5">Overall experience</Label>
            <Stars value={rating} onChange={setRating} />
          </div>

          <div>
            <Label htmlFor="feedback-area" className="block text-sm font-medium mb-1.5">Area</Label>
            <Select
              id="feedback-area"
              value={area}
              onChange={(e) => setArea(e.target.value)}
              required
            >
              <option value="" disabled>Select an area…</option>
              {areas.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </Select>
          </div>

          <div>
            <Label htmlFor="feedback-priority" className="block text-sm font-medium mb-1.5">Priority</Label>
            <Select
              id="feedback-priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            >
              <option>Low</option>
              <option>Medium</option>
              <option>High</option>
              <option>Critical</option>
            </Select>
          </div>

          <div>
            <Label htmlFor="feedback-subject" className="block text-sm font-medium mb-1.5">Subject</Label>
            <Input
              id="feedback-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Brief summary of your feedback"
              required
            />
          </div>

          <div>
            <Label htmlFor="feedback-details" className="block text-sm font-medium mb-1.5">
              Details{area === 'Other' && <span className="text-red-600"> (required for Other — what is it about?)</span>}
            </Label>
            <Textarea
              id="feedback-details"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              required={area === 'Other'}
              className="h-32"
              placeholder="Share what's working well or what UST should improve..."
            />
          </div>

          <Button type="submit" size="lg" disabled={submitting || !rating} className="w-full">
            <Send size={16} /> {submitting ? 'Sending…' : 'Send to UST'}
          </Button>
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

      <Dialog open={toast} onOpenChange={setToast}>
        <DialogContent className="max-w-sm">
          <div className="p-8 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mb-5" style={{ background: 'rgba(26,162,96,0.1)' }}>
              <CheckCircle2 size={36} className="text-emerald-600" />
            </div>
            <DialogTitle className="text-xl font-bold text-slate-900 mb-2">Feedback Received!</DialogTitle>
            <DialogDescription className="text-sm text-slate-600 leading-relaxed">
              Your feedback has been captured and the Premera-UST engagement team will review it and take the necessary action.
            </DialogDescription>
            <Button className="mt-6" onClick={() => setToast(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
