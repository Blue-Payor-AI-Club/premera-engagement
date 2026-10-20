import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import ProgramLevel from './ProgramLevel'
import { PortalDataContext } from '../context/PortalDataContext'
import { AuthStub } from '../test/auth'
import { DEFAULT_PORTAL_DATA } from '../data/portalData'

function renderPage() {
  return render(
    <MemoryRouter>
      <AuthStub role="premera_stakeholder">
        <PortalDataContext.Provider value={{ data: DEFAULT_PORTAL_DATA, loading: false, error: null, refresh: vi.fn(), replaceDocument: vi.fn(), reset: vi.fn() }}>
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
