import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { ThumbsUp, ThumbsDown, X } from 'lucide-react'
import { apiFetch } from '../lib/api'
import { useAuth } from '../context/AuthContext'

type Vote = 'up' | 'down'

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
  const [popPos, setPopPos] = useState<{ top: number; left: number } | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [needsText, setNeedsText] = useState(false)

  const path = `/quick-feedback/${encodeURIComponent(itemId)}`

  // Hydrate vote from API on mount
  useEffect(() => {
    if (authLoading || !token) return
    apiFetch(path)
      .then(async res => {
        const entry = await res.json() as QfEntry | null
        if (entry) {
          setVote(entry.vote)
          setSavedComment(entry.comment ?? '')
        }
      })
      .catch(() => { /* API unavailable — start with no vote */ })
  }, [authLoading, path, token])

  // Close popup on any scroll (capture phase) or resize
  useEffect(() => {
    if (!showComment) return
    const close = () => setShowComment(false)
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    return () => {
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
    }
  }, [showComment])

  // Close on Escape or outside click
  useEffect(() => {
    if (!showComment) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowComment(false) }
    const onOutside = (e: MouseEvent) => {
      const target = e.target as Element
      if (!target.closest('[data-qf-pop]')) setShowComment(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onOutside)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onOutside)
    }
  }, [showComment])

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

  function handleDown(e: React.MouseEvent<HTMLButtonElement>) {
    if (vote === 'down') {
      setVote(undefined)
      setShowComment(false)
      apiFetch(path, { method: 'DELETE' }).catch(() => setVote('down'))
      return
    }
    const rect = e.currentTarget.getBoundingClientRect()
    const popupWidth = 256
    const left = Math.max(8, Math.min(rect.right - popupWidth, window.innerWidth - popupWidth - 8))
    setPopPos({ top: rect.bottom + 6, left })
    setDraft(savedComment)
    setNeedsText(false)
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
    apiFetch(path, { method: 'PUT', body: JSON.stringify({ vote: 'down', comment: draft }) })
      .then(() => {
        setSavedComment(draft)
        setShowComment(false)
        setConfirming(true)
        setTimeout(() => setConfirming(false), 3500)
      })
      .catch(() => setShowComment(false))
  }

  // Portal renders outside any ancestor transform/overflow — fixes AG-Grid clip + scroll drift
  const popup = showComment && popPos
    ? createPortal(
        <div
          data-qf-pop
          className="fixed z-[9999] w-64 bg-white rounded-lg shadow-xl border border-slate-200 p-3"
          style={{ top: popPos.top, left: popPos.left }}
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-slate-700">What's your concern?</span>
            <button onClick={() => setShowComment(false)} className="p-0.5 rounded hover:bg-slate-100 transition">
              <X size={12} className="text-slate-400" />
            </button>
          </div>
          <p className="text-xs text-slate-400 truncate mb-2">{itemLabel}</p>
          <textarea
            className="w-full text-xs border border-slate-200 rounded px-2 py-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-[#0067b1] text-slate-700 placeholder:text-slate-300"
            rows={3}
            placeholder="Describe the concern..."
            value={draft}
            onChange={(e) => { setDraft(e.target.value); setNeedsText(false) }}
            aria-invalid={needsText}
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
          />
          {needsText && (
            <p role="alert" className="mt-1 text-xs text-red-600">Please describe your concern, or choose Skip.</p>
          )}
          <div className="flex justify-end gap-2 mt-2">
            <button
              onClick={() => setShowComment(false)}
              className="px-2 py-1 text-xs text-slate-500 hover:text-slate-700 transition"
            >
              Skip
            </button>
            <button
              onClick={submitComment}
              className="px-3 py-1 text-xs font-semibold text-white rounded transition hover:opacity-90"
              style={{ background: '#0067b1' }}
            >
              Submit
            </button>
          </div>
        </div>,
        document.body
      )
    : null

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
      </div>

      {popup}
      {confirmToast}
    </>
  )
}
