import { useState, useEffect } from 'react'
import { ThumbsUp, ThumbsDown, X } from 'lucide-react'
import { Popover, PopoverAnchor, PopoverContent } from './ui/popover'
import { Textarea } from './ui/input'
import { Button } from './ui/button'
import { apiFetch } from '../lib/api'
import { myUpVotes } from '../lib/myVotes'
import { useAuth } from '../context/AuthContext'

type Vote = 'up' | 'down'

// Matches the API's quick-feedback comment limit.
export const MAX_COMMENT = 1000


export default function QuickFeedback({ itemId, itemLabel }: { itemId: string; itemLabel: string }) {
  const { loading: authLoading, token } = useAuth()
  const [vote, setVote] = useState<Vote | undefined>(undefined)
  const [showComment, setShowComment] = useState(false)
  const [draft, setDraft] = useState('')
  // A concern is a one-off message, not a lasting state: a "Concern sent" badge shows for a few seconds,
  // then the thumbs go back to neutral.
  const [sent, setSent] = useState(false)
  const [needsText, setNeedsText] = useState(false)
  const [saveFailed, setSaveFailed] = useState(false)
  const path = `/quick-feedback/${encodeURIComponent(itemId)}`

  useEffect(() => {
    if (authLoading || !token) return
    let live = true
    myUpVotes(token).then((ids) => { if (live && ids.has(itemId)) setVote('up') })
    return () => { live = false }
  }, [authLoading, itemId, token])
  const remember = (up: boolean) => { if (token) void myUpVotes(token).then((ids) => (up ? ids.add(itemId) : ids.delete(itemId))) }

  function handleUp() {
    if (vote === 'up') {
      setVote(undefined)
      remember(false)
      apiFetch(path, { method: 'DELETE' }).catch(() => { setVote('up'); remember(true) })
    } else {
      setVote('up')
      setShowComment(false)
      remember(true)
      apiFetch(path, { method: 'PUT', body: JSON.stringify({ vote: 'up' }) })
        .catch(() => { setVote(undefined); remember(false) })
    }
  }

  function handleDown() {
    // Opening the box records nothing; Submit (with text) or Skip (without) sends the concern, Esc cancels.
    setDraft('')
    setNeedsText(false)
    setSaveFailed(false)
    setShowComment(true)
  }

  function send(comment?: string) {
    setSaveFailed(false)
    apiFetch(path, { method: 'PUT', body: JSON.stringify(comment ? { vote: 'down', comment } : { vote: 'down' }) })
      .then(() => {
        setVote(undefined) // the concern replaces any thumbs-up from this user
        remember(false)
        setShowComment(false)
        setSent(true)
        setTimeout(() => setSent(false), 4000)
      })
      .catch(() => setSaveFailed(true)) // keep the popup (and the typed text) open
  }

  function submitComment() {
    if (!draft.trim()) { setNeedsText(true); return }
    send(draft)
  }

  return (
    <>
      {/* shadcn Popover: Radix keeps it anchored to the button and on screen while the page scrolls,
          and closes it on Esc or a click elsewhere. */}
      <Popover open={showComment} onOpenChange={(o) => { if (!o) setShowComment(false) }}>
      <div className="inline-flex items-center gap-0.5" data-qf-pop>
        <button
          onClick={handleUp}
          title="Good"
          className={`p-1 rounded transition ${
            vote === 'up'
              ? 'text-emerald-600 bg-emerald-50'
              : 'text-slate-300 hover:text-emerald-500 hover:bg-emerald-50'
          }`}
        >
          <ThumbsUp size={12} />
        </button>
        <PopoverAnchor asChild>
        <button
          onClick={handleDown}
          title="Needs attention"
          className={`p-1 rounded transition ${showComment ? 'text-red-500 bg-red-50' : 'text-slate-300 hover:text-red-400 hover:bg-red-50'}`}
        >
          <ThumbsDown size={12} />
        </button>
        </PopoverAnchor>
        {sent && <span role="status" className="ml-1 rounded-full bg-emerald-50 border border-emerald-200 px-1.5 py-px text-[10px] font-semibold text-emerald-700 whitespace-nowrap" title="Your concern was sent to the team">Sent ✓</span>}
      </div>
      <PopoverContent data-qf-pop onClick={(e) => e.stopPropagation()} aria-label="What's your concern?">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-semibold text-slate-700">What's your concern?</span>
          <button onClick={() => setShowComment(false)} aria-label="Close" className="p-0.5 rounded hover:bg-slate-100 transition">
            <X size={12} className="text-slate-400" />
          </button>
        </div>
        <p className="text-xs text-slate-400 truncate mb-2">{itemLabel}</p>
        <Textarea
          className="text-xs resize-none min-h-0"
          rows={3}
          placeholder="Describe the concern..."
          value={draft}
          maxLength={MAX_COMMENT}
          onChange={(e) => { setDraft(e.target.value); setNeedsText(false) }}
          aria-invalid={needsText}
          autoFocus
        />
        <p className="text-right text-[10px] text-slate-400">{draft.length} / {MAX_COMMENT}</p>
        {saveFailed && <p role="alert" className="mt-1 text-xs text-red-600">Couldn't save your concern. Please try again.</p>}
        {needsText && <p role="alert" className="mt-1 text-xs text-red-600">Please describe your concern, or choose Skip.</p>}
        <div className="flex justify-end gap-2 mt-2">
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => send()}>Skip</Button>
          <Button size="sm" className="h-7 text-xs" onClick={submitComment}>Submit</Button>
        </div>
      </PopoverContent>
      </Popover>
    </>
  )
}
