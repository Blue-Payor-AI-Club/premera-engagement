import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import ProgramLevel from './ProgramLevel'
import { PROGRAM_TABS, overallStatus } from '../lib/programTabs'
import type { StatusKey } from '../data/status'
import { PortalDataContext } from '../context/PortalDataContext'
import { AuthStub } from '../test/auth'
import { DEFAULT_PORTAL_DATA, type PortalData } from '../data/portalData'
import { TRANSITION_DATA, type TransitionData } from '../data/transitionData'

function renderPage(data: PortalData = DEFAULT_PORTAL_DATA) {
  return render(
    <MemoryRouter>
      <AuthStub role="premera_stakeholder">
        <PortalDataContext.Provider value={{ data, loading: false, error: null, refresh: vi.fn(), replaceDocument: vi.fn(), reset: vi.fn(), edit: vi.fn(), preview: false, setPreview: vi.fn(), updatedAt: null, loaded: true }}>
          <ProgramLevel />
        </PortalDataContext.Provider>
      </AuthStub>
    </MemoryRouter>,
  )
}

const ws = (workstream: string, extra: Partial<TransitionData['dashboard'][number]> = {}): TransitionData['dashboard'][number] => ({
  workstream,
  phases: [
    { id: `${workstream}-1`, phase: 'Discovery & Planning', status: 'atRisk', start: '1/1/2027', end: '2/1/2027', milestones: [
      { id: `${workstream}-m1`, label: 'SOW approved', due: '1/15/2027', revised: '', status: 'complete' },
      { id: `${workstream}-m2`, label: 'Kickoff', due: '1/20/2027', revised: '', status: 'onTrack' },
    ] },
    { id: `${workstream}-2`, phase: 'Onboarding', status: 'onTrack', start: '2/1/2027', end: '3/1/2027', milestones: [] },
    { id: `${workstream}-3`, phase: 'Shadow', status: null, start: '', end: '', milestones: [] },
  ],
  ...extra,
})

const synced: TransitionData = {
  ...TRANSITION_DATA,
  asOf: '12/25/26',
  dashboard: [
    ws('Service Desk and ITOC', { summary: 'Service desk KT on plan.', status: 'complete' }),
    ws('Claims Operations'),
  ],
  raid: [
    { type: 'R', description: 'Service desk risk', mitigation: [], owner: 'A', dueDate: '1/1/2020', status: 'Open', workstream: 'service desk and itoc' },
    { type: 'I', description: 'Claims issue', mitigation: [], owner: 'B', dueDate: '', status: 'Open', workstream: 'Claims Operations' },
    { type: 'R', description: 'Program-wide risk', mitigation: [], owner: 'C', dueDate: '', status: 'Open' },
  ],
}

describe('/program — one tab per operational area', () => {
  it('has the static title and the operational-area tabs, in order, with no ITO / BPO / Transition', () => {
    renderPage({ ...DEFAULT_PORTAL_DATA, transition: synced })
    expect(screen.getByRole('heading', { level: 1, name: 'Transition Summary Dashboard' })).toBeInTheDocument()
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual(PROGRAM_TABS)
    expect(PROGRAM_TABS.filter((t) => t === 'Provider Data Management')).toHaveLength(1)
    expect(screen.queryByText(/Program Scorecard/)).toBeNull()
  })

  it("shows the legend, then the selected tab's KPI cards (phases + milestones)", () => {
    renderPage({ ...DEFAULT_PORTAL_DATA, transition: synced })
    const kpis = screen.getByRole('group', { name: 'Status counts' })
    expect(within(kpis).getByLabelText('At Risk: 1')).toBeInTheDocument()
    expect(within(kpis).getByLabelText('On Track: 2')).toBeInTheDocument()
    expect(within(kpis).getByLabelText('Complete: 1')).toBeInTheDocument()
    expect(within(kpis).getByLabelText('Not Started: 0')).toBeInTheDocument()
    expect(screen.getByText('Status').compareDocumentPosition(kpis) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it("shows the tab's title card, overall status and text, its dashboard and only its RAID items", async () => {
    renderPage({ ...DEFAULT_PORTAL_DATA, transition: synced })
    const card = screen.getByRole('region', { name: 'Transition Program Summary - Service Desk and ITOC' })
    expect(within(card).getByText('Overall: Complete')).toBeInTheDocument()
    expect(within(card).getByText('Service desk KT on plan.')).toBeInTheDocument()
    const dash = screen.getByRole('region', { name: 'Transition Program Dashboard' })
    expect(within(dash).queryByText(/Overall:/)).toBeNull() // not repeated
    expect(within(dash).getByText('12/25/26')).toBeInTheDocument()
    expect(await screen.findByText('Service desk risk')).toBeInTheDocument()
    expect(screen.queryByText('Claims issue')).toBeNull()
    expect(screen.queryByText('Program-wide risk')).toBeNull()
    expect(screen.getByText(/Risks & Issues:/)).toHaveTextContent('Risks & Issues: 1')
    expect(screen.getByText('Overdue: 1')).toBeInTheDocument()
  })

  it('switching tabs switches everything to that area; an unset status is worked out from the phases', async () => {
    renderPage({ ...DEFAULT_PORTAL_DATA, transition: synced })
    await userEvent.setup().click(screen.getByRole('tab', { name: 'Claims Operations (100-400)' }))
    const card = screen.getByRole('region', { name: 'Transition Program Summary - Claims Operations (100-400)' })
    expect(within(card).getByText('Overall: At Risk')).toBeInTheDocument()
    expect(await screen.findByText('Claims issue')).toBeInTheDocument()
    expect(screen.queryByText('Service desk risk')).toBeNull()
    expect(screen.queryByText(/Overdue:/)).toBeNull()
  })

  it('a tab with nothing behind it says so', async () => {
    renderPage({ ...DEFAULT_PORTAL_DATA, transition: synced })
    await userEvent.setup().click(screen.getByRole('tab', { name: 'Employer Portal Project' }))
    expect(screen.getByText('Nothing shared for Employer Portal Project yet.')).toBeInTheDocument()
    expect(screen.queryByText(/Risks & Issues:/)).toBeNull()
  })

  it('falls back to the bundled Transition content when the API response has no transition block', async () => {
    renderPage({ ...DEFAULT_PORTAL_DATA, transition: undefined })
    expect(screen.getByRole('region', { name: 'Transition Program Summary - Service Desk and ITOC' })).toBeInTheDocument()
  })
})

describe('overallStatus', () => {
  const p = (status: StatusKey | null) => ({ id: 'x', phase: 'Shadow', status, start: '', end: '', milestones: [] })
  it('uses the set status, else the worst phase, else complete / on track / not started', () => {
    expect(overallStatus({ workstream: 'a', status: 'onTrack', phases: [p('delayed')] })).toBe('onTrack')
    expect(overallStatus({ workstream: 'a', phases: [p('onTrack'), p('delayed'), p('atRisk')] })).toBe('delayed')
    expect(overallStatus({ workstream: 'a', phases: [p('complete'), p(null)] })).toBe('complete')
    expect(overallStatus({ workstream: 'a', phases: [p('complete'), p('notStarted')] })).toBe('onTrack')
    expect(overallStatus({ workstream: 'a', phases: [p(null)] })).toBe('notStarted')
  })
})
