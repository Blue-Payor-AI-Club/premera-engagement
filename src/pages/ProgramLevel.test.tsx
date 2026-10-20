import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import ProgramLevel from './ProgramLevel'
import { PortalDataContext } from '../context/PortalDataContext'
import { AuthStub } from '../test/auth'
import { DEFAULT_PORTAL_DATA, type PortalData } from '../data/portalData'
import { TRANSITION_DATA, type TransitionData } from '../data/transitionData'

function renderPage(data: PortalData = DEFAULT_PORTAL_DATA) {
  return render(
    <MemoryRouter>
      <AuthStub role="premera_stakeholder">
        <PortalDataContext.Provider value={{ data, loading: false, error: null, refresh: vi.fn(), replaceDocument: vi.fn(), reset: vi.fn() }}>
          <ProgramLevel />
        </PortalDataContext.Provider>
      </AuthStub>
    </MemoryRouter>,
  )
}

describe('/program — Transition tab', () => {
  it('adds a Transition tab after ITO and BPO', () => {
    renderPage()
    const tabs = screen.getAllByRole('tab').map((t) => t.textContent)
    expect(tabs).toHaveLength(3)
    expect(tabs[0]).toMatch(/^ITO/)
    expect(tabs[1]).toMatch(/^BPO/)
    expect(tabs[2]).toMatch(/^Transition/)
  })

  it('opens on ITO and does not show the Transition content until selected', () => {
    renderPage()
    expect(screen.getByRole('tab', { name: /ITO/ })).toHaveAttribute('aria-selected', 'true')
    expect(screen.queryByTestId('transition-tab')).toBeNull()
  })

  it('shows the Executive Summary first and the Dashboard after it, replacing the division content', async () => {
    renderPage()
    await userEvent.setup().click(screen.getByRole('tab', { name: /Transition/ }))

    expect(screen.getByRole('tab', { name: /Transition/ })).toHaveAttribute('aria-selected', 'true')
    const tab = screen.getByTestId('transition-tab')
    expect(tab).toBeInTheDocument()
    const headings = Array.from(tab.querySelectorAll('section[aria-label]')).map((s) => s.getAttribute('aria-label'))
    expect(headings).toEqual(['Transition Program Executive Summary', 'Transition Program Dashboard'])

    // Division-specific summary is hidden, the page title reflects the tab, and the legend stays.
    expect(screen.getByRole('heading', { level: 1, name: 'Transition Program' })).toBeInTheDocument()
    expect(screen.queryByText(/Risks & Issues:/)).toBeNull()
    expect(screen.getByText('On Track')).toBeInTheDocument()
  })

  // The tab used to render a hard-coded file, so a sync could never change it.
  const synced: TransitionData = {
    ...TRANSITION_DATA,
    asOf: '12/25/26',
    overallStatus: 'onTrack',
    premeraContacts: [{ role: 'Synced Sponsor', name: 'Sam Synced' }],
    summary: { ...TRANSITION_DATA.summary, overallStatus: 'Synced overall paragraph.', risks: ['Synced risk'] },
    dashboard: [
      {
        tower: 'Synced Tower',
        rows: [
          {
            workstream: 'Synced Workstream',
            planning: { status: 'onTrack', start: '1/1/2027', sowSubmit: '', sowApproval: '', onboardingComplete: '' },
            transition: { status: 'complete', start: '2/1/2027', goLive: '3/1/2027' },
            notes: [{ text: 'Synced note' }],
          },
        ],
      },
    ],
    raid: [{ type: 'I', description: 'Synced RAID item', mitigation: ['Synced step'], owner: 'Syd', dueDate: '4/1/2027', status: 'Closed' }],
  }

  it("shows the Transition data the portal document supplies — what Data Sync imports — not the bundled copy", async () => {
    renderPage({ ...DEFAULT_PORTAL_DATA, transition: synced })
    await userEvent.setup().click(screen.getByRole('tab', { name: /Transition/ }))

    expect(screen.getAllByText('12/25/26')).toHaveLength(2) // page header and the dashboard header
    expect(screen.getByText('Synced overall paragraph.')).toBeInTheDocument()
    expect(screen.getByLabelText(/premera contacts/i)).toHaveTextContent('Synced Sponsor:Sam Synced')
    expect(screen.getByText('Synced risk')).toBeInTheDocument()
    expect(screen.getByText('Synced Tower')).toBeInTheDocument()
    expect(screen.getByText('Synced Workstream')).toBeInTheDocument()
    expect(screen.getByText('Synced note')).toBeInTheDocument()
    expect(screen.getByText('Synced RAID item')).toBeInTheDocument()
    expect(screen.getByText('Synced step')).toBeInTheDocument()

    // None of the bundled slide content leaks through.
    expect(screen.queryByText('Service Desk and ITOC')).toBeNull()
    expect(screen.queryByText(/Delays in MSA and SOW approvals/)).toBeNull()
    expect(screen.queryByText('Wayne Heller')).toBeNull()
  })

  it('falls back to the bundled Transition content when the API response has no transition block', async () => {
    renderPage({ ...DEFAULT_PORTAL_DATA, transition: undefined })
    await userEvent.setup().click(screen.getByRole('tab', { name: /Transition/ }))
    expect(screen.getByText('Service Desk and ITOC')).toBeInTheDocument()
  })

  it('renders repeated workstream names, notes and RAID text (user-edited data) without key warnings', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const row = synced.dashboard[0].rows[0]
    renderPage({
      ...DEFAULT_PORTAL_DATA,
      transition: {
        ...synced,
        summary: { ...synced.summary, accomplishments: ['Same', 'Same'], risks: ['Same', 'Same'] },
        premeraContacts: [{ role: 'Lead', name: 'A' }, { role: 'Lead', name: 'B' }],
        dashboard: [{ tower: 'T', rows: [{ ...row, notes: [{ text: 'dup' }, { text: 'dup' }] }, { ...row }] }],
        raid: [synced.raid[0], { ...synced.raid[0], mitigation: ['x', 'x'] }],
      },
    })
    await userEvent.setup().click(screen.getByRole('tab', { name: /Transition/ }))
    expect(screen.getAllByText('Synced Workstream')).toHaveLength(2)
    expect(screen.getAllByText('Same')).toHaveLength(4)
    expect(error.mock.calls.flat().join(' ')).not.toMatch(/same key/i)
    error.mockRestore()
  })

  it('returns to the same division view when switching back', async () => {
    renderPage()
    const user = userEvent.setup()
    await user.click(screen.getByRole('tab', { name: /BPO/ }))
    await user.click(screen.getByRole('tab', { name: /Transition/ }))
    await user.click(screen.getByRole('tab', { name: /BPO/ }))
    expect(screen.queryByTestId('transition-tab')).toBeNull()
    expect(screen.getByRole('tab', { name: /BPO/ })).toHaveAttribute('aria-selected', 'true')
  })
})
