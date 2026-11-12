import { describe, expect, it } from 'vitest'
import { DEFAULT_PORTAL_DATA, type PortalData } from '../data/portalData'
import { TRANSITION_DATA } from '../data/transitionData'
import { legacyRowRequest, raidRequest, issueRequest, phaseMilestones, phaseRequest, transitionWorkstreamRequest, milestoneRowRequest, normalizeDate, programMilestones, summaryLineRequest } from './editRequests'

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

  it('a new workstream starts with every standard phase; a phase edit keeps its id and milestones', () => {
    const d = doc()
    transitionWorkstreamRequest(d.transition!).save(d, { workstream: 'Brand New' })
    const wi = d.transition!.dashboard.length - 1
    const added = d.transition!.dashboard[wi]
    expect(added.workstream).toBe('Brand New')
    expect(added.phases.map((p) => p.phase)).toEqual(['Discovery & Planning', 'Onboarding', 'Transition / KT', 'Shadow', 'Reverse Shadow', 'Steady State'])
    expect(added.phases.every((p) => p.status === null && !!p.id)).toBe(true)

    const shadow = added.phases[3]
    milestoneRowRequest(phaseMilestones(shadow.id, shadow.phase), shadow.id).save(d, { label: 'Shadow sign-off', due: '1/5/2027', revised: '', status: 'notStarted' })
    expect(shadow.milestones.map((m) => m.label)).toEqual(['Shadow sign-off'])

    const req = phaseRequest(d.transition!, wi, shadow)
    // A phase the workstream already has can't be picked a second time.
    expect(req.fields[0].options!.map((o) => o.value)).toEqual(['Shadow'])
    req.save(d, { ...req.value, status: 'atRisk', alertNotes: ['Call Premera'], notes: [] })
    const saved = d.transition!.dashboard[wi].phases[3]
    expect(saved.id).toBe(shadow.id)
    expect(saved.status).toBe('atRisk')
    expect(saved.notes).toEqual([{ text: 'Call Premera', alert: true }])
    expect(saved.milestones.map((m) => m.label)).toEqual(['Shadow sign-off'])

    phaseRequest(d.transition!, wi, saved).remove!(d)
    expect(d.transition!.dashboard[wi].phases.map((p) => p.phase)).not.toContain('Shadow')
    expect(phaseRequest(d.transition!, wi).value.phase).toBe('Shadow') // the free phase is offered first
  })

  it('an old-format dashboard row writes back to its phases, adding what is missing', () => {
    const d = doc()
    const t = d.transition!
    const wi = 0
    t.dashboard[wi].phases = t.dashboard[wi].phases.filter((p) => p.phase !== 'Onboarding')
    const req = legacyRowRequest(t, wi)
    req.save(d, { ...req.value, tower: 'New Tower', dpStart: '1/5/2027', sowSubmit: '1/10/2027', dpEnd: '2/1/2027', obEnd: '3/1/2027', ktStatus: 'atRisk', ktEnd: '6/1/2027' })
    const w = d.transition!.dashboard[wi]
    const phase = (n: string) => w.phases.find((p) => p.phase === n)!
    expect(w.tower).toBe('New Tower')
    expect([phase('Discovery & Planning').start, phase('Discovery & Planning').end]).toEqual(['1/5/2027', '2/1/2027'])
    expect(phase('Discovery & Planning').milestones.find((m) => m.label === 'SOW submitted')!.due).toBe('1/10/2027')
    expect(phase('Onboarding').end).toBe('3/1/2027') // added back, in phase order
    expect(w.phases.map((p) => p.phase).indexOf('Onboarding')).toBe(1)
    expect([phase('Transition / KT').status, phase('Transition / KT').end]).toEqual(['atRisk', '6/1/2027'])
  })

  it('a RAID edit keeps the item id (its votes and replies); a new item gets one', () => {
    const d = doc()
    d.transition!.raid[0].id = 'rd_keep'
    const edit = raidRequest(d.transition!, 0)
    edit.save(d, { ...edit.value, description: 'changed' })
    expect(d.transition!.raid[0]).toMatchObject({ id: 'rd_keep', description: 'changed' })
    const add = raidRequest(d.transition!)
    add.save(d, { ...add.value, description: 'new', mitigation: [] })
    expect(d.transition!.raid.at(-1)!.id).toBeTruthy()
  })
})
