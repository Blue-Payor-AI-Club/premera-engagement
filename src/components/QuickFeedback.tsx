import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { ThumbsUp, ThumbsDown, X } from 'lucide-react'
import { Popover, PopoverAnchor, PopoverContent } from './ui/popover'
import { Textarea } from './ui/input'
import { Button } from './ui/button'
import { apiFetch } from '../lib/api'
import { useAuth } from '../context/AuthContext'

type Vote = 'up' | 'down'

// Matches the API's quick-feedback comment limit.
export const MAX_COMMENT = 1000
interface QfEntry {
  vote: Vote
  comment?: string
}

export default function QuickFeedback({ itemId, itemLabel }: { itemId: string; itemLabel: string }) {
  const { loading: authLoading, token } = useAuth()
  const [vote, setVote] = useState<Vote | undefined>(undefined)
  const [savedComment, setSavedComment] = useState('')
  const [showComment, setShowComment] = useState(false)
  const [draft, setDraft] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [needsText, setNeedsText] = useState(false)
  const [saveFailed, setSaveFailed] = useState(false)
  const path = `/quick-feedback/${encodeURIComponent(itemId)}`

  // Hydrate vote from API on mount
  useEffect(() => {
    if (authLoading || !token) return
    // no-store: a remounted control must not be handed the cached pre-vote answer (the vote would look lost).
    apiFetch(path, { cache: 'no-store' })
      .then(async res => {
        const entry = await res.json() as QfEntry | null
        if (entry) {
          setVote(entry.vote)
          setSavedComment(entry.comment ?? '')
        }
      })
      .catch(() => { /* API unavailable — start with no vote */ })
  }, [authLoading, path, token])

  function handleUp() {
    if (vote === 'up') {
      setVote(undefined)
      apiFetch(path, { method: 'DELETE' }).catch(() => setVote('up'))
    } else {
      setVote('up')
      setShowComment(false)
      apiFetch(path, { method: 'PUT', body: JSON.stringify({ vote: 'up' }) })
        .catch(() => setVote(undefined))
    }
  }

  function handleDown() {
    if (vote === 'down') {
      setVote(undefined)
      setShowComment(false)
      apiFetch(path, { method: 'DELETE' }).catch(() => setVote('down'))
      return
    }
    setDraft(savedComment)
    setNeedsText(false)
    setSaveFailed(false)
    setVote('down')
    setShowComment(true)
    apiFetch(path, { method: 'PUT', body: JSON.stringify({ vote: 'down', comment: savedComment }) })
      .catch(() => { setVote(undefined); setShowComment(false) })
  }

  function submitComment() {
    // Submit means "here's my concern"; Skip is the way to keep the vote without one.
    if (!draft.trim()) {
      setNeedsText(true)
      return
    }
    setSaveFailed(false)
    apiFetch(path, { method: 'PUT', body: JSON.stringify({ vote: 'down', comment: draft }) })
      .then(() => {
        setSavedComment(draft)
        setShowComment(false)
        setConfirming(true)
        setTimeout(() => setConfirming(false), 3500)
      })
      .catch(() => setSaveFailed(true)) // keep the popup (and the typed text) open
  }

  const confirmToast = confirming
    ? createPortal(
        <div
          className="fixed bottom-6 right-6 z-[9999] flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-xl text-sm font-medium text-white"
          style={{ background: 'linear-gradient(150deg,#1aa260,#15803d)', maxWidth: 340 }}
        >
          <span className="shrink-0">✓</span>
          Your concern has been captured and the team will work on it.
        </div>,
        document.body
      )
    : null

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
          className={`p-1 rounded transition ${
            vote === 'down'
              ? 'text-red-500 bg-red-50'
              : 'text-slate-300 hover:text-red-400 hover:bg-red-50'
          }`}
        >
          <ThumbsDown size={12} />
        </button>
        </PopoverAnchor>
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
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus
        />
        <p className="text-right text-[10px] text-slate-400">{draft.length} / {MAX_COMMENT}</p>
        {saveFailed && <p role="alert" className="mt-1 text-xs text-red-600">Couldn't save your concern. Please try again.</p>}
        {needsText && <p role="alert" className="mt-1 text-xs text-red-600">Please describe your concern, or choose Skip.</p>}
        <div className="flex justify-end gap-2 mt-2">
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowComment(false)}>Skip</Button>
          <Button size="sm" className="h-7 text-xs" onClick={submitComment}>Submit</Button>
        </div>
      </PopoverContent>
      </Popover>
      {confirmToast}
    </>
  )
}
