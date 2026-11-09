import { describe, expect, it } from 'vitest'
import { DEFAULT_PORTAL_DATA, type PortalData } from '../data/portalData'
import { TRANSITION_DATA } from '../data/transitionData'
import { dashboardRowRequest, issueRequest, milestoneRowRequest, normalizeDate, programMilestones, summaryLineRequest } from './editRequests'

const doc = (): PortalData => structuredClone({ ...DEFAULT_PORTAL_DATA, transition: TRANSITION_DATA })

describe('normalizeDate (same rule as the Excel importer)', () => {
  it('accepts M/D/YYYY, 2-digit years, ISO, TBD and N/A; rejects the rest', () => {
    expect(normalizeDate('09/05/2026')).toBe('9/5/2026')
    expect(normalizeDate('3/15/26')).toBe('3/15/2026')
    expect(normalizeDate('2026-03-15')).toBe('3/15/2026')
    expect(normalizeDate('tbd')).toBe('TBD')
    expect(normalizeDate('na')).toBe('N/A')
    expect(normalizeDate('')).toBe('')
    expect(normalizeDate('2/30/2026')).toBeUndefined()
    expect(normalizeDate('next week')).toBeUndefined()
    expect(normalizeDate('TBD', false)).toBeUndefined()
  })
})

describe('edit requests', () => {
  it('editing an issue keeps its place and actions; changing division moves it', () => {
    const d = doc()
    const issue = d.program.ito.issues[0]
    issue.riskActions = [{ id: 'a1', action: 'Act', owner: '', dueDate: '', actionStatus: 'open' }]
    const values = { division: 'ito', issue: 'Renamed', mitigations: [], date: '', status: 'delayed', severity: '', priority: '' }
    issueRequest('ito', issue).save(d, values)
    expect(d.program.ito.issues[0]).toMatchObject({ id: issue.id, issue: 'Renamed', status: 'delayed', riskActions: [{ id: 'a1' }] })

    issueRequest('ito', d.program.ito.issues[0]).save(d, { ...values, division: 'bpo' })
    expect(d.program.ito.issues.some((i) => i.id === issue.id)).toBe(false)
    expect(d.program.bpo.issues.at(-1)).toMatchObject({ id: issue.id, riskActions: [{ id: 'a1' }] })
  })

  it('adds and deletes a milestone row', () => {
    const d = doc()
    const section = d.program.ito.milestones[0]
    const before = section.rows.length
    milestoneRowRequest(programMilestones('ito'), section.id).save(d, { label: 'New', due: 'TBD', revised: '', status: 'onTrack', needsPremeraAttention: true })
    const added = d.program.ito.milestones[0].rows.at(-1)!
    expect(added).toMatchObject({ label: 'New', due: 'TBD', needsPremeraAttention: true })
    expect(added.id).toBeTruthy()
    milestoneRowRequest(programMilestones('ito'), section.id, added).remove!(d)
    expect(d.program.ito.milestones[0].rows).toHaveLength(before)
  })

  it('a summary line keeps Premera visibility in step with its text', () => {
    const d = doc()
    const t = d.transition!
    summaryLineRequest(t, 'risks', 0).save(d, { text: 'Changed risk', needsPremeraAttention: true })
    expect(d.transition!.summary.risks[0]).toBe('Changed risk')
    expect(d.transition!.summary.premeraVisible).toContain('Changed risk')
    summaryLineRequest(d.transition!, 'risks', 0).save(d, { text: 'Changed risk', needsPremeraAttention: false })
    expect(d.transition!.summary.premeraVisible).not.toContain('Changed risk')
  })

  it('a dashboard row moved to a new tower creates that group', () => {
    const d = doc()
    const lastGroup = d.transition!.dashboard.length - 1
    const req = dashboardRowRequest(d.transition!, lastGroup, 0)
    req.save(d, { ...req.value, tower: 'Brand New Tower', notes: [], alertNotes: ['Call Premera'] })
    const moved = d.transition!.dashboard.find((g) => g.tower === 'Brand New Tower')!
    expect(moved.rows[0].notes).toEqual([{ text: 'Call Premera', alert: true }])
  })
})
