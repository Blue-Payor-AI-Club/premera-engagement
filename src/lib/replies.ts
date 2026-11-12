import { useCallback, useEffect, useMemo, useState } from 'react'
import { apiFetch } from './api'
import { useAuth } from '../context/AuthContext'

// Replies on RAID items (set 3): a thread under each item, read and written by UST and Premera.

export interface Reply {
  id: string
  itemId: string
  text: string
  author: string
  authorName?: string
  authorRoleLabel: string
  createdAt: string
}

export const MAX_REPLY = 2000

export async function listReplies(itemId: string): Promise<Reply[]> {
  return (await apiFetch(`/replies/${encodeURIComponent(itemId)}`)).json()
}

export async function postReply(itemId: string, text: string): Promise<Reply> {
  return (await apiFetch(`/replies/${encodeURIComponent(itemId)}`, { method: 'POST', body: JSON.stringify({ text }) })).json()
}

/** Reply counts for every RAID item the user can see (one request per grid), plus a local bump after posting. */
export function useReplyCounts(): { counts: Record<string, number>; bump: (itemId: string) => void } {
  const { loading, token } = useAuth()
  const [counts, setCounts] = useState<Record<string, number>>({})
  useEffect(() => {
    if (loading || !token) return
    let live = true
    apiFetch('/replies/counts').then((r) => r.json()).then((c) => { if (live) setCounts(c ?? {}) }).catch(() => {})
    return () => { live = false }
  }, [loading, token])
  const bump = useCallback((itemId: string) => setCounts((c) => ({ ...c, [itemId]: (c[itemId] ?? 0) + 1 })), [])
  return useMemo(() => ({ counts, bump }), [counts, bump])
}
