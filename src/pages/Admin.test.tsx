import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import Admin from './Admin'
import { PortalDataContext } from '../context/PortalDataContext'
import { DEFAULT_PORTAL_DATA } from '../data/portalData'

const mockUseAuth = vi.fn()
vi.mock('../context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}))

function renderAdmin() {
  return render(
    <PortalDataContext.Provider
      value={{
        data: DEFAULT_PORTAL_DATA,
        loading: false,
        error: null,
        refresh: vi.fn(),
        replaceDocument: vi.fn(),
        reset: vi.fn(),
      }}
    >
      <Admin />
    </PortalDataContext.Provider>,
  )
}

describe('Admin page', () => {
  it('a viewer sees the read-only preview with no sync controls and no write affordances', () => {
    mockUseAuth.mockReturnValue({ isAdmin: false })
    renderAdmin()

    // No editing surface anywhere: the old Admin had "Save Changes", free-text inputs
    // for every field, and per-row delete buttons. None of that exists for a viewer.
    expect(screen.queryByRole('button', { name: /save changes/i })).toBeNull()
    expect(screen.queryAllByRole('textbox')).toHaveLength(0)
    expect(screen.queryByRole('button', { name: /sync now/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /choose file/i })).toBeNull()

    // But the read-only preview itself is there.
    expect(screen.getByText('Communications & Change Management')).toBeInTheDocument()
  })

  it('an admin sees the Excel sync controls and the preview, but still no manual-edit inputs', () => {
    mockUseAuth.mockReturnValue({ isAdmin: true })
    renderAdmin()

    expect(screen.getByRole('button', { name: /sync now/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /choose file/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /save changes/i })).toBeNull()
    expect(screen.queryAllByRole('textbox')).toHaveLength(0)
    expect(screen.getByText('Communications & Change Management')).toBeInTheDocument()
  })
})
