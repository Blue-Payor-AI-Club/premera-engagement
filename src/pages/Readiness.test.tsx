import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import Readiness from './Readiness'
import { PortalDataContext } from '../context/PortalDataContext'
import { AuthStub } from '../test/auth'
import { DEFAULT_PORTAL_DATA } from '../data/portalData'
import { TRANSITION_DATA, type TransitionData } from '../data/transitionData'
import { READINESS_LEVERS } from '../data/readiness'
import type { Role } from '../lib/authApi'

const SLIDE = [3, 4, 5, 4, 4, 3, 4, 3, 6, 4, 4] as const
const scored: TransitionData = { ...TRANSITION_DATA, readiness: READINESS_LEVERS.map((l, i) => ({ key: l.key, score: SLIDE[i], ...(i === 0 ? { remarks: 'MSA signed' } : {}) })) }

function renderPage(transition: TransitionData, role: Role = 'premera_stakeholder') {
  return render(
    <AuthStub role={role}>
      <PortalDataContext.Provider value={{ data: { ...DEFAULT_PORTAL_DATA, transition }, loading: false, error: null, refresh: vi.fn(), replaceDocument: vi.fn(), reset: vi.fn(), edit: vi.fn(), preview: false, setPreview: vi.fn(), updatedAt: null, loaded: true }}>
        <Readiness />
      </PortalDataContext.Provider>
    </AuthStub>,
  )
}

describe('/readiness — Transition Readiness Score Card', () => {
  it('shows every lever, its score, the colour mix, remarks and the scoring guide', () => {
    renderPage(scored)
    expect(screen.getByRole('heading', { level: 1, name: 'Transition Readiness Score Card' })).toBeInTheDocument()
    const card = screen.getByRole('region', { name: 'Transition Readiness Score Card' })
    for (const l of READINESS_LEVERS) expect(within(card).getByText(l.label)).toBeInTheDocument()
    expect(within(card).getByLabelText('Score 6: Yet to start')).toBeInTheDocument()
    expect(within(card).getByLabelText('Score mix')).toHaveTextContent('1 Green · 6 Light green · 3 Amber · 1 Yet to start')
    expect(within(card).getByText('MSA signed')).toBeInTheDocument()
    expect(within(card).getByLabelText('Scoring guide')).toHaveTextContent('Blocking the transition')
    expect(within(card).queryByRole('button', { name: /^Edit / })).toBeNull() // Premera reads only
  })

  it('says so when nothing is scored yet', () => {
    renderPage(TRANSITION_DATA)
    expect(screen.getByText('Readiness not scored yet.')).toBeInTheDocument()
  })
})
