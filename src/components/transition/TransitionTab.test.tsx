import { describe, it, expect } from 'vitest'
import { render as rtlRender, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TransitionTab from './TransitionTab'
import { TRANSITION_DATA } from '../../data/transitionData'
import { AuthStub } from '../../test/auth'

// The phase rows carry thumbs feedback, which needs a signed-in user (Premera: no edit controls).
const render = (ui: React.ReactElement) => rtlRender(<AuthStub role="premera_stakeholder">{ui}</AuthStub>)

describe('Transition tab — Executive Summary', () => {
  it('is open by default and shows every section of the slide', () => {
    render(<TransitionTab />)
    const toggle = screen.getByRole('button', { name: /transition program executive summary/i })
    expect(toggle).toHaveAttribute('aria-expanded', 'true')

    for (const heading of ['Overall Status', 'Key Accomplishments', 'Upcoming Priorities', 'Key Risk', 'Executive Focus Required']) {
      expect(screen.getByRole('heading', { name: heading })).toBeVisible()
    }
    expect(screen.getByText(/Delays in MSA and SOW approvals/)).toBeVisible()
    expect(screen.getByText(/Accelerate MSA and SOW approval timelines\./)).toBeVisible()
    expect(within(toggle).getByText('Overall: At Risk')).toBeInTheDocument()
  })

  it('shows the contacts and the bold lead-ins on the priorities', () => {
    render(<TransitionTab />)
    expect(screen.getByLabelText(/premera contacts/i)).toHaveTextContent('Premera Program Sponsor:Wayne Heller')
    expect(screen.getByLabelText(/ust contacts/i)).toHaveTextContent('UST Transition Director:Robert Moreland')
    expect(screen.getByText('Contracting & Schedule Alignment:').tagName).toBe('STRONG')
  })

  it('collapses and re-expands from the header', async () => {
    const user = userEvent.setup()
    render(<TransitionTab />)
    const toggle = screen.getByRole('button', { name: /transition program executive summary/i })

    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    // Hidden elements drop out of the accessibility tree, so look it up with `hidden`.
    expect(screen.getByRole('heading', { name: 'Key Risk', hidden: true })).not.toBeVisible()
    expect(screen.queryByRole('heading', { name: 'Key Risk' })).toBeNull()
    // The dashboard below is unaffected.
    expect(screen.getByRole('region', { name: /workstream dashboard/i })).toBeVisible()

    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('heading', { name: 'Key Risk' })).toBeVisible()
  })
})

describe('Transition tab — Dashboard', () => {
  it('comes after the Executive Summary', () => {
    render(<TransitionTab />)
    const summary = screen.getByRole('region', { name: /executive summary/i, hidden: true })
    const dashboard = screen.getByRole('region', { name: /transition program dashboard/i })
    expect(summary.compareDocumentPosition(dashboard) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  // The dashboard is an AG Grid (rendered asynchronously, so these wait with findBy).
  const grid = () => screen.getByRole('region', { name: /workstream dashboard/i })
  /** Every cell of the grid row containing `text` (pinned columns render in a separate container). */
  const rowCells = async (text: string) => {
    const cell = (await within(grid()).findAllByText(text)).find((el) => el.closest('[row-index]'))!
    const index = cell.closest('[row-index]')!.getAttribute('row-index')
    return Array.from(grid().querySelectorAll(`[row-index="${index}"]`)) as HTMLElement[]
  }
  const textOf = (els: HTMLElement[]) => els.map((e) => e.textContent).join(' | ')

  it('has one row per phase under each workstream heading: Phase, Status, Start, End, Milestones, Feedback', async () => {
    render(<TransitionTab />)
    for (const label of ['Phase', 'Status', 'Start', 'End', 'Milestones', 'Feedback']) {
      expect(await within(grid()).findByText(label, { selector: '.ag-header-cell-text' })).toBeInTheDocument()
    }
    // No tower level and no grouped "Discovery / Planning / Onboarding" header any more.
    expect(within(grid()).queryByText('Tower', { selector: '.ag-header-cell-text' })).toBeNull()
    expect(grid().querySelector('.ag-header-group-text')).toBeNull()
  })

  it('shows every workstream as a heading, each with its phases', async () => {
    render(<TransitionTab />)
    for (const w of TRANSITION_DATA.dashboard) expect((await within(grid()).findAllByText(w.workstream)).length).toBeGreaterThan(0)
    expect(within(grid()).getAllByText('Reverse Shadow').length).toBe(TRANSITION_DATA.dashboard.length)
  })

  it('a phase row shows its status, dates and milestone count', async () => {
    render(<TransitionTab />)
    const cells = await rowCells('Discovery & Planning')
    expect(textOf(cells)).toMatch('At Risk')
    expect(textOf(cells)).toMatch('9/16/2026')
    expect(textOf(cells)).toMatch('2 milestones ›')
  })

  it('shows N/A for a phase that is not set, and the red call-to-action note on its phase', async () => {
    render(<TransitionTab />)
    expect(textOf(await rowCells('Steady State'))).toMatch('N/A')
    expect((await within(grid()).findByText(/Process an on-boarding SOW for the team/)).className).toMatch('text-red-600')
  })

  it('narrows to one workstream from the filter', async () => {
    const user = userEvent.setup()
    render(<TransitionTab />)
    await user.selectOptions(screen.getByLabelText('Workstream'), 'Claims Operations')
    await within(grid()).findAllByText('Claims Operations')
    expect(within(grid()).queryByText('Service Desk and ITOC')).toBeNull()
    expect(within(grid()).getAllByText('Reverse Shadow')).toHaveLength(1)
  })

  it('opens a phase with its own milestones', async () => {
    const user = userEvent.setup()
    render(<TransitionTab />)
    await user.click((await within(grid()).findAllByText('Discovery & Planning'))[0])
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('MSA')).toBeInTheDocument()
    expect((await within(dialog).findAllByText('SOW submitted')).length).toBeGreaterThan(0)
    expect(within(dialog).getAllByText('SOW approved').length).toBeGreaterThan(0)
  })

  it('shows the AS OF date and the RAID log', async () => {
    render(<TransitionTab />)
    expect(screen.getAllByText('10/08/26').length).toBeGreaterThan(0)
    const raid = screen.getByRole('region', { name: /raid log/i })
    for (const h of ['RAID', 'Description', 'Mitigation Plan / Next Steps', 'Owner', 'Due Date', 'Status']) {
      expect(await within(raid).findByText(h, { selector: '.ag-header-cell-text' })).toBeInTheDocument()
    }
    expect(await within(raid).findByText('Jobin Kuriakose')).toBeInTheDocument()
    expect(within(raid).getByText(/Finalize the SLA approach with Premera/)).toBeInTheDocument()
  })
})
