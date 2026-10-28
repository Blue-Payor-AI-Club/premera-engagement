import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import QuickFeedback from './QuickFeedback'
import { AuthContext } from '../context/AuthContext'
import { apiFetch } from '../lib/api'

vi.mock('../lib/api', () => ({ apiFetch: vi.fn() }))
const mockFetch = vi.mocked(apiFetch)

function renderIt() {
  const auth = { loading: false, token: 'jwt' } as React.ContextType<typeof AuthContext>
  return render(
    <AuthContext.Provider value={auth}>
      <QuickFeedback itemId="w1" itemLabel="Workstream one" />
    </AuthContext.Provider>,
  )
}

const puts = () => mockFetch.mock.calls.filter(([, init]) => init?.method === 'PUT').map(([, init]) => JSON.parse(String(init!.body)))

describe('QuickFeedback thumbs down', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    mockFetch.mockResolvedValue(new Response('null'))
  })

  it('refuses an empty Submit and asks for a description', async () => {
    renderIt()
    await userEvent.click(screen.getByTitle('Needs attention'))
    await userEvent.click(screen.getByRole('button', { name: 'Submit' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Please describe your concern, or choose Skip.')
    expect(puts().filter((b) => b.comment)).toHaveLength(0)
  })

  it('submits once a concern is typed', async () => {
    renderIt()
    await userEvent.click(screen.getByTitle('Needs attention'))
    await userEvent.type(screen.getByPlaceholderText('Describe the concern...'), 'Dates slipped')
    await userEvent.click(screen.getByRole('button', { name: 'Submit' }))
    expect(screen.queryByRole('alert')).toBeNull()
    expect(puts().at(-1)).toEqual({ vote: 'down', comment: 'Dates slipped' })
  })

  it('Skip still closes without a description', async () => {
    renderIt()
    await userEvent.click(screen.getByTitle('Needs attention'))
    await userEvent.click(screen.getByRole('button', { name: 'Skip' }))
    expect(screen.queryByPlaceholderText('Describe the concern...')).toBeNull()
  })
})
