import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
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

  it('Skip sends the concern without a description', async () => {
    renderIt()
    await userEvent.click(screen.getByTitle('Needs attention'))
    await userEvent.click(screen.getByRole('button', { name: 'Skip' }))
    expect(screen.queryByPlaceholderText('Describe the concern...')).toBeNull()
    expect(puts().at(-1)).toEqual({ vote: 'down' })
  })

  it('opening the box sends nothing; a sent concern shows a short badge, not a lasting red thumb', async () => {
    renderIt()
    await userEvent.click(screen.getByTitle('Needs attention'))
    expect(puts()).toHaveLength(0)
    await userEvent.type(screen.getByPlaceholderText('Describe the concern...'), 'Dates slipped')
    await userEvent.click(screen.getByRole('button', { name: 'Submit' }))
    expect(await screen.findByText('Sent ✓')).toBeInTheDocument()
    expect(screen.getByTitle('Needs attention').className).not.toMatch(/red-500/)
  })

  it('a saved thumbs-down from earlier is not shown as a red thumb', async () => {
    mockFetch.mockResolvedValue(new Response(JSON.stringify({ vote: 'down', comment: 'old' })))
    renderIt()
    await new Promise((r) => setTimeout(r, 0))
    expect(screen.getByTitle('Needs attention').className).not.toMatch(/red-500/)
  })

  it('stays open, with the typed text, when the textarea or the page scrolls', async () => {
    renderIt()
    await userEvent.click(screen.getByTitle('Needs attention'))
    const box = screen.getByPlaceholderText('Describe the concern...')
    await userEvent.type(box, 'Half typed')
    fireEvent.scroll(box)
    fireEvent.scroll(document)
    expect(screen.getByPlaceholderText('Describe the concern...')).toHaveValue('Half typed')
  })

  it('a failed save keeps the popup and the typed text', async () => {
    renderIt()
    await userEvent.click(screen.getByTitle('Needs attention'))
    await userEvent.type(screen.getByPlaceholderText('Describe the concern...'), 'Dates slipped')
    mockFetch.mockRejectedValueOnce(new Error('offline'))
    await userEvent.click(screen.getByRole('button', { name: 'Submit' }))
    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't save")
    expect(screen.getByPlaceholderText('Describe the concern...')).toHaveValue('Dates slipped')
  })

  it('caps the concern at 1000 characters and shows the count', async () => {
    renderIt()
    await userEvent.click(screen.getByTitle('Needs attention'))
    expect(screen.getByPlaceholderText('Describe the concern...')).toHaveAttribute('maxLength', '1000')
    expect(screen.getByText('0 / 1000')).toBeInTheDocument()
  })

})
