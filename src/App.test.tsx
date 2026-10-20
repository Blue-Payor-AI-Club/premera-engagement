import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from './App'
import { AuthStub } from './test/auth'
import type { Role } from './lib/authApi'

// The pages themselves are covered elsewhere — here we only care which ones are reachable.
vi.mock('./pages/ProgramLevel', () => ({ default: () => <div>PAGE:program</div> }))
vi.mock('./pages/Risks', () => ({ default: () => <div>PAGE:risks</div> }))
vi.mock('./pages/Feedback', () => ({ default: () => <div>PAGE:feedback</div> }))
vi.mock('./pages/Admin', () => ({ default: () => <div>PAGE:data-sync</div> }))
vi.mock('./pages/SuperAdmin', () => ({ default: () => <div>PAGE:super-admin</div> }))
vi.mock('./pages/Activity', () => ({ default: () => <div>PAGE:activity</div> }))
vi.mock('./pages/Login', () => ({ default: () => <div>PAGE:login</div> }))
vi.mock('./pages/InviteAccept', () => ({ default: () => <div>PAGE:invite</div> }))

function renderAt(path: string, role: Role | null) {
  localStorage.setItem('ustpremera_tour_v2', 'done') // keep the onboarding tour out of the way
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthStub role={role}><App /></AuthStub>
    </MemoryRouter>,
  )
}

const link = (name: RegExp) => screen.queryByRole('link', { name })

describe('App shell — sign-in gate', () => {
  it('shows only the sign-in page when signed out, whatever URL was requested', () => {
    renderAt('/superadmin', null)
    expect(screen.getByText('PAGE:login')).toBeInTheDocument()
    expect(screen.queryByText('PAGE:super-admin')).toBeNull()
  })

  it('lets the invite page render while signed out', () => {
    renderAt('/invite?token=abc', null)
    expect(screen.getByText('PAGE:invite')).toBeInTheDocument()
  })
})

describe('App shell — navigation by role', () => {
  it('Premera Stakeholder: the three portal sections only — no Data Sync, Activity or Super Admin', () => {
    renderAt('/program', 'premera_stakeholder')
    expect(link(/program level/i)).toBeInTheDocument()
    expect(link(/risks & issues/i)).toBeInTheDocument()
    expect(link(/feedback to ust/i)).toBeInTheDocument()
    expect(link(/data sync/i)).toBeNull()
    expect(link(/activity/i)).toBeNull()
    expect(link(/super admin/i)).toBeNull()
    expect(screen.getByText(/premera stakeholder/i)).toBeInTheDocument()
  })

  it('UST Stakeholder: Data Sync and Activity, but no Super Admin', () => {
    renderAt('/program', 'ust_stakeholder')
    expect(link(/data sync/i)).toBeInTheDocument()
    expect(link(/activity/i)).toBeInTheDocument()
    expect(link(/super admin/i)).toBeNull()
  })

  it('Super Admin: everything', () => {
    renderAt('/program', 'super_admin')
    expect(link(/data sync/i)).toBeInTheDocument()
    expect(link(/activity/i)).toBeInTheDocument()
    expect(link(/super admin/i)).toBeInTheDocument()
  })
})

describe('App shell — direct URL access is blocked, not just hidden', () => {
  it.each([
    ['/superadmin', 'premera_stakeholder', 'PAGE:super-admin'],
    ['/superadmin', 'ust_stakeholder', 'PAGE:super-admin'],
    ['/admin', 'premera_stakeholder', 'PAGE:data-sync'],
    ['/activity', 'premera_stakeholder', 'PAGE:activity'],
  ] as const)('%s as %s shows "no access" and never mounts the page', (path, role, pageMarker) => {
    renderAt(path, role)
    expect(screen.getByText(/you don't have access to this page/i)).toBeInTheDocument()
    expect(screen.queryByText(pageMarker)).toBeNull()
  })

  it.each([
    ['/superadmin', 'super_admin', 'PAGE:super-admin'],
    ['/admin', 'ust_stakeholder', 'PAGE:data-sync'],
    ['/activity', 'ust_stakeholder', 'PAGE:activity'],
  ] as const)('%s as %s is allowed', (path, role, pageMarker) => {
    renderAt(path, role)
    expect(screen.getByText(pageMarker)).toBeInTheDocument()
  })
})
