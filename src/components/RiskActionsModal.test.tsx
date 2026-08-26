import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import RiskActionsModal from './RiskActionsModal'
import { type IssueRow } from '../data/portalData'

function sampleIssue(overrides: Partial<IssueRow> = {}): IssueRow {
  return {
    id: 'pi1',
    issue: 'Operational Runbooks not finalized',
    mitigations: ['Schedule review sessions'],
    date: '3/1',
    status: 'atRisk',
    riskActions: [
      { id: 'ra1', action: 'Review runbook drafts', owner: 'Premera Operations', dueDate: '3/8', actionStatus: 'open' },
    ],
    ...overrides,
  }
}

describe('RiskActionsModal', () => {
  it('renders without a PortalDataProvider — it is a pure presentational component now', () => {
    // No wrapping provider anywhere in this render. If usePortalData() is ever
    // reintroduced, this throws ("usePortalData must be used within a
    // PortalDataProvider") and the test fails — a self-enforcing regression guard.
    expect(() => render(<RiskActionsModal issue={sampleIssue()} onClose={() => {}} />)).not.toThrow()
  })

  it('renders each action as a read-only badge with no click-to-cycle affordance', async () => {
    // Both the desktop table and the mobile card list render in jsdom simultaneously
    // (the sm:hidden/hidden sm:table split is CSS-only, not conditional rendering),
    // so every visible label appears twice — query all and assert on each.
    const user = userEvent.setup()
    render(<RiskActionsModal issue={sampleIssue()} onClose={() => {}} />)

    const badges = screen.getAllByText('Open')
    expect(badges).toHaveLength(2)
    for (const badge of badges) {
      expect(badge.tagName).toBe('SPAN')
      expect(badge).not.toHaveAttribute('title')
    }

    // No button wraps a status label anywhere in the modal.
    expect(screen.queryByRole('button', { name: 'Open' })).toBeNull()
    await user.click(badges[0])
    expect(screen.getAllByText('Open')).toHaveLength(2)
  })

  it('has no "click a status badge to update" hint', () => {
    render(<RiskActionsModal issue={sampleIssue()} onClose={() => {}} />)
    expect(screen.queryByText(/click a status badge/i)).toBeNull()
    expect(screen.getByText(/read-only/i)).toBeInTheDocument()
  })

  it('renders mitigations, owner, and due date from props', () => {
    render(<RiskActionsModal issue={sampleIssue()} onClose={() => {}} />)
    expect(screen.getByText('Schedule review sessions')).toBeInTheDocument()
    expect(screen.getAllByText('Premera Operations').length).toBeGreaterThan(0)
    expect(screen.getAllByText('3/8').length).toBeGreaterThan(0)
  })

  it('calls onClose when the close button is clicked — it is the only button left in a read-only modal', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<RiskActionsModal issue={sampleIssue()} onClose={onClose} />)

    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(1) // the close (X) button — status pills are spans, not buttons
    await user.click(buttons[0])
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('renders nothing when issue is null', () => {
    const { container } = render(<RiskActionsModal issue={null} onClose={() => {}} />)
    expect(container).toBeEmptyDOMElement()
  })
})
