import { useEffect, useState } from 'react'
import { MessageSquare } from 'lucide-react'
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog'
import { Textarea } from './ui/input'
import { ErrorBanner, btnPrimary } from './ui'
import { MAX_REPLY, listReplies, postReply, type Reply } from '../lib/replies'
import { errorMessage, formatDateTime } from '../lib/format'

export interface ReplyTarget { id: string; label: string }

/** "Reply" / "Replies (n)" on a RAID row. */
export function ReplyButton({ target, count, onOpen }: { target: ReplyTarget; count: number; onOpen: (t: ReplyTarget) => void }) {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onOpen(target) }}
      aria-label={`Replies on ${target.label}`}
      title="Reply / send feedback on this item"
      className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs font-semibold text-[#0067b1] hover:bg-sky-50 whitespace-nowrap"
    >
      <MessageSquare size={13} /> {count ? `Replies (${count})` : 'Reply'}
    </button>
  )
}

/** The thread of one RAID item. Owned by the grid, not the row: a new count re-renders the row. */
export function ReplyDialog({ target, onClose, onPosted }: { target: ReplyTarget | null; onClose: () => void; onPosted: (itemId: string) => void }) {
  return (
    <Dialog open={!!target} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Replies</DialogTitle>
          <DialogDescription>{target?.label}</DialogDescription>
        </DialogHeader>
        {/* Keyed: another item starts with a fresh thread and an empty draft. */}
        {target && <Thread key={target.id} target={target} onPosted={onPosted} />}
      </DialogContent>
    </Dialog>
  )
}

function Thread({ target, onPosted }: { target: ReplyTarget; onPosted: (itemId: string) => void }) {
  const [thread, setThread] = useState<Reply[] | null>(null)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let live = true
    listReplies(target.id)
      .then((t) => { if (live) setThread(t) })
      .catch((e) => { if (live) { setThread([]); setError(errorMessage(e)) } })
    return () => { live = false }
  }, [target.id])

  async function send() {
    if (!draft.trim()) { setError('Write a reply first.'); return }
    setBusy(true)
    setError(null)
    try {
      const reply = await postReply(target.id, draft.trim())
      setThread((t) => [...(t ?? []), reply])
      setDraft('')
      onPosted(target.id)
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <DialogBody className="space-y-3">
        {thread === null ? <p className="text-sm text-slate-400">Loading…</p>
          : thread.length === 0 ? <p className="text-sm text-slate-400">No replies yet. Start the conversation below.</p>
          : (
            <ul className="space-y-2" aria-label="Reply thread">
              {thread.map((r) => (
                <li key={r.id} className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2">
                  <div className="text-[11px] text-slate-500">
                    <span className="font-semibold text-slate-700">{r.authorName || r.author}</span> · {r.authorRoleLabel} · {formatDateTime(r.createdAt)}
                  </div>
                  <p className="text-sm text-slate-800 whitespace-pre-line break-words">{r.text}</p>
                </li>
              ))}
            </ul>
          )}
        <label className="block text-xs font-medium text-slate-500">
          Your reply
          <Textarea value={draft} maxLength={MAX_REPLY} rows={3} onChange={(e) => setDraft(e.target.value)} placeholder="Write a reply or feedback…" className="mt-1 block w-full resize-y" />
        </label>
        {error && <ErrorBanner>{error}</ErrorBanner>}
      </DialogBody>
      <DialogFooter>
        <button type="button" disabled={busy} onClick={() => void send()} className={btnPrimary}>{busy ? 'Sending…' : 'Send reply'}</button>
      </DialogFooter>
    </>
  )
}
