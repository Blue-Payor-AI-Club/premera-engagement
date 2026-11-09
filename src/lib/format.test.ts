import { describe, expect, it } from 'vitest'
import { isOverdue, timeAgo } from './format'
import { implausibleYear } from './editRequests'

describe('isOverdue', () => {
  const today = new Date(2026, 10, 9)
  it('is true only for a past M/D/YYYY date on an item that is not done', () => {
    expect(isOverdue('11/8/2026', false, today)).toBe(true)
    expect(isOverdue('11/9/2026', false, today)).toBe(false) // due today is not overdue yet
    expect(isOverdue('11/8/2026', true, today)).toBe(false)
    expect(isOverdue('TBD', false, today)).toBe(false)
    expect(isOverdue('', false, today)).toBe(false)
  })
})

describe('timeAgo / implausibleYear', () => {
  it('reads naturally', () => {
    const now = Date.UTC(2026, 10, 9, 12)
    expect(timeAgo(new Date(now - 30_000).toISOString(), now)).toBe('just now')
    expect(timeAgo(new Date(now - 3 * 86_400_000).toISOString(), now)).toMatch(/3 days ago/)
    expect(timeAgo(null, now)).toBe('')
  })
  it('flags likely year typos', () => {
    const now = new Date(2026, 10, 9)
    expect(implausibleYear('10/9/2023', now)).toBe(true)
    expect(implausibleYear('10/9/2026', now)).toBe(false)
  })
})
