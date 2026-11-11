import { apiFetch } from './api'

// The signed-in user's thumbs-ups, fetched once and shared by every QuickFeedback control on every
// page (one request per row was ~130 on the Transition tab). Votes cast update it, so a control that
// remounts shows the vote just made.
let mine: { token: string; ids: Promise<Set<string>> } | undefined

export function myUpVotes(token: string): Promise<Set<string>> {
  if (mine?.token !== token) {
    mine = {
      token,
      ids: apiFetch('/quick-feedback/mine', { cache: 'no-store' })
        .then((res) => res.json() as Promise<{ up?: string[] } | null>)
        .then((body) => new Set(body?.up ?? []))
        .catch(() => new Set<string>()), // API unavailable: start with no votes
    }
  }
  return mine.ids
}

/** Tests only: forget the shared votes. */
export const resetVoteCache = () => { mine = undefined }
