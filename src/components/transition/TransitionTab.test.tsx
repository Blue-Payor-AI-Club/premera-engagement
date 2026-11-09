import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TransitionTab from './TransitionTab'
import { TRANSITION_DATA } from '../../data/transitionData'
import { flattenDashboard } from './dashboardRows'

const allRows = () => TRANSITION_DATA.dashboard.flatMap((g) => g.rows)

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

  it('has the two-level header from the slide with its group labels', async () => {
    render(<TransitionTab />)
    for (const label of ['Tower', 'Workstream', 'Discovery / Planning / Onboarding', 'Transition', 'SOW Submit', 'SOW Approval', 'Onboarding', 'Go-Live', 'Notes']) {
      expect(await within(grid()).findByText(label, { selector: '.ag-header-cell-text, .ag-header-group-text' })).toBeInTheDocument()
    }
    expect(within(grid()).getAllByText('Status', { selector: '.ag-header-cell-text' })).toHaveLength(2)
  })

  it('lists every workstream from the slide', async () => {
    render(<TransitionTab />)
    expect(allRows()).toHaveLength(16)
    for (const r of allRows()) expect((await within(grid()).findAllByText(r.workstream)).length).toBeGreaterThan(0)
  })

  it('merges each tower cell over its rows, and a Notes cell over the rows it describes', () => {
    const rows = flattenDashboard(TRANSITION_DATA.dashboard)
    const towerSpan = Object.fromEntries(rows.filter((r) => r.i === 0).map((r) => [r.tower, r.groupSize]))
    expect(towerSpan['Contracting']).toBe(3)
    expect(towerSpan['Customer Service & Platform Engineering']).toBe(4)
    expect(towerSpan['Enterprise Technology Solutions']).toBe(4)
    expect(towerSpan['Claims Operations']).toBe(1)
    const span = (w: string) => rows.find((r) => r.row.workstream === w)!.notesSpan
    expect(span('Service Desk and ITOC')).toBe(3)
    expect(span('Microsoft 365 Support')).toBe(0) // under the merged cell
    expect(span('Batch Monitoring')).toBe(0)
    expect(span('Provider Contact Center')).toBe(1) // its own notes cell
  })

  it('renders the call-to-action note in red, and the other notes normally', async () => {
    render(<TransitionTab />)
    expect(await within(grid()).findByText(/Process an on-boarding SOW for the team/)).toHaveClass('text-red-600')
    expect(within(grid()).getByText(/MSA In Progress: UST Redlines in-work/)).not.toHaveClass('text-red-600')
  })

  it('shows status as dots with an accessible label, and N/A where a phase does not apply', async () => {
    render(<TransitionTab />)
    const msa = await rowCells('MSA')
    expect(msa.some((c) => c.querySelector('[title="At Risk"]'))).toBe(true)
    expect(textOf(msa)).toMatch('N/A')
    const ito = await rowCells('Service Desk and ITOC')
    expect(ito.some((c) => c.querySelector('[title="On Track"]'))).toBe(true)
    expect(ito.some((c) => c.querySelector('[title="At Risk"]'))).toBe(true)
  })

  it('leaves the transition cells blank (not "N/A") when the slide has nothing for that row', async () => {
    render(<TransitionTab />)
    expect(textOf(await rowCells('Connectivity & Access'))).not.toMatch('N/A')
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
