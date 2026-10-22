import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import VisibleToPremera from './VisibleToPremera'
import { AuthContext } from '../context/AuthContext'

function renderAs(canEdit: boolean, flagged?: boolean) {
  const value = { canEdit } as React.ContextType<typeof AuthContext>
  return render(
    <AuthContext.Provider value={value}>
      <VisibleToPremera flagged={flagged} />
    </AuthContext.Provider>,
  )
}

describe('VisibleToPremera', () => {
  it('tells UST users which rows Premera can see', () => {
    renderAs(true, true)
    expect(screen.getByText('Visible to Premera')).toBeInTheDocument()
  })

  it('marks unshared rows as UST only', () => {
    renderAs(true, false)
    expect(screen.getByText('UST only')).toBeInTheDocument()
  })

  it('shows Premera users nothing', () => {
    const { container } = renderAs(false, true)
    expect(container).toBeEmptyDOMElement()
  })
})
