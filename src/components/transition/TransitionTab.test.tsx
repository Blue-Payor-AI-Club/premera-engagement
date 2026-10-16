import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TransitionTab from './TransitionTab'
import { TRANSITION_DATA } from '../../data/transitionData'

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
    expect(within(toggle).getByText('At Risk')).toBeInTheDocument()
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
    expect(screen.getByRole('table', { name: /workstream dashboard/i })).toBeVisible()

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

  it('has the two-level header from the slide with its group labels', () => {
    render(<TransitionTab />)
    const table = screen.getByRole('table', { name: /workstream dashboard/i })
    for (const label of ['Tower', 'Workstream', 'Discovery/Planning/Onboarding', 'Transition', 'SOW Planned Submit Date', 'SOW Target Approval Date', 'Planned Onboarding Completion', 'Go-Live', 'Notes']) {
      expect(within(table).getByRole('columnheader', { name: label })).toBeInTheDocument()
    }
    expect(within(table).getAllByRole('columnheader', { name: 'Status' })).toHaveLength(2)
  })

  it('lists every workstream from the slide, grouped under its tower', () => {
    render(<TransitionTab />)
    const table = screen.getByRole('table', { name: /workstream dashboard/i })
    expect(allRows()).toHaveLength(16)
    // (Claims Operations is both a tower and a workstream, so tell them apart by scope.)
    const rowHeaders = within(table).getAllByRole('rowheader')
    const workstreams = rowHeaders.filter((h) => h.getAttribute('scope') === 'row').map((h) => h.textContent)
    expect(workstreams).toEqual(allRows().map((r) => r.workstream))

    const towers = rowHeaders.filter((h) => h.getAttribute('scope') === 'rowgroup').map((h) => h.textContent)
    expect(towers).toEqual(['Contracting', 'Customer Service & Platform Engineering', 'Claims Operations', 'Enterprise Technology Solutions', 'Customer Implementation & Core Operations', 'Cross Functional'])
  })

  it('merges each tower cell over its rows', () => {
    render(<TransitionTab />)
    const table = screen.getByRole('table', { name: /workstream dashboard/i })
    const spans = Object.fromEntries(
      within(table).getAllByRole('rowheader').filter((h) => h.getAttribute('scope') === 'rowgroup').map((h) => [h.textContent, h.getAttribute('rowspan')]),
    )
    expect(spans['Contracting']).toBe('3')
    expect(spans['Customer Service & Platform Engineering']).toBe('4')
    expect(spans['Enterprise Technology Solutions']).toBe('4')
    expect(spans['Claims Operations']).toBe('1')
  })

  it('merges a Notes cell over the rows it describes, emitting no stray cells under it', () => {
    render(<TransitionTab />)
    const table = screen.getByRole('table', { name: /workstream dashboard/i })
    const note = within(table).getByText(/past the incumbent’s contract end date/).closest('td')!
    expect(note).toHaveAttribute('rowspan', '3')

    // Every row has the same number of cells once merges are accounted for: a row under a merged Notes cell has one fewer.
    const rowOf = (name: string) =>
      within(table).getAllByRole('rowheader', { name }).find((h) => h.getAttribute('scope') === 'row')!.closest('tr')!
    const cells = (tr: HTMLElement) => tr.querySelectorAll('th,td').length
    expect(cells(rowOf('Service Desk and ITOC'))).toBe(cells(rowOf('Microsoft 365 Support')) + 1 + 1) // +tower cell, +notes cell
    expect(cells(rowOf('Microsoft 365 Support'))).toBe(cells(rowOf('Batch Monitoring')))
    expect(cells(rowOf('Provider Contact Center'))).toBe(cells(rowOf('Microsoft 365 Support')) + 1) // own notes cell
  })

  it('renders the call-to-action note in red, and the other notes normally', () => {
    render(<TransitionTab />)
    expect(screen.getByText(/Process an on-boarding SOW for the team/)).toHaveClass('text-red-600')
    expect(screen.getByText('MSA In Progress: UST Redlines in-work')).not.toHaveClass('text-red-600')
  })

  it('shows status as dots with an accessible label, and N/A where a phase does not apply', () => {
    render(<TransitionTab />)
    const table = screen.getByRole('table', { name: /workstream dashboard/i })
    const msa = within(table).getByRole('rowheader', { name: 'MSA' }).closest('tr')!
    expect(msa.querySelector('[title="At Risk"]')).not.toBeNull()
    expect(within(msa).getAllByText('N/A').length).toBeGreaterThanOrEqual(3) // onboarding completion + transition status/start/go-live
    const ito = within(table).getByRole('rowheader', { name: 'Service Desk and ITOC' }).closest('tr')!
    expect(ito.querySelector('[title="On Track"]')).not.toBeNull()
    expect(ito.querySelector('[title="At Risk"]')).not.toBeNull()
  })

  it('leaves the transition cells blank (not "N/A") when the slide has nothing for that row', () => {
    render(<TransitionTab />)
    const table = screen.getByRole('table', { name: /workstream dashboard/i })
    const row = within(table).getByRole('rowheader', { name: 'Connectivity & Access' }).closest('tr')!
    expect(within(row).queryByText('N/A')).toBeNull()
  })

  it('stripes data rows alternately (no per-tower colour fills)', () => {
    render(<TransitionTab />)
    const table = screen.getByRole('table', { name: /workstream dashboard/i })
    const rows = Array.from(table.querySelectorAll('tbody tr'))
    expect(rows).toHaveLength(16)
    rows.forEach((tr, i) => expect(tr.getAttribute('data-stripe')).toBe(i % 2 === 0 ? 'even' : 'odd'))
  })

  it('shows the AS OF date and the RAID log', () => {
    render(<TransitionTab />)
    expect(screen.getAllByText('10/08/26').length).toBeGreaterThan(0)
    const raid = screen.getByRole('table', { name: /raid log/i })
    for (const h of ['RAID', 'Description', 'Mitigation Plan/Next Steps', 'Owner', 'Due Date', 'Status']) {
      expect(within(raid).getByRole('columnheader', { name: h })).toBeInTheDocument()
    }
    expect(within(raid).getAllByRole('row')).toHaveLength(4) // header + 3 items
    expect(within(raid).getByText('Jobin Kuriakose')).toBeInTheDocument()
    expect(within(raid).getByText('Finalize the SLA approach with Premera')).toBeInTheDocument()
  })
})
