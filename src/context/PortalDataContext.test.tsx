import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { PortalDataProvider, usePortalData } from './PortalDataContext'
import { DEFAULT_PORTAL_DATA, type PortalData } from '../data/portalData'
import * as api from '../lib/api'

const auth = vi.hoisted(() => ({ token: 'tok_test' as string | null }))
vi.mock('./AuthContext', () => ({
  useAuth: () => ({ loading: false, token: auth.token }),
}))

function jsonResponse(body: unknown, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json', ...headers } })
}

function samplePortalData(overrides: Partial<PortalData> = {}): PortalData {
  return { ...DEFAULT_PORTAL_DATA, ...overrides }
}

function Consumer() {
  const { data, loading, error, refresh, replaceDocument, reset } = usePortalData()
  return (
    <div>
      <div data-testid="loading">{String(loading)}</div>
      <div data-testid="error">{error ?? ''}</div>
      <div data-testid="asOf">{data.asOf}</div>
      <button onClick={() => refresh()}>refresh</button>
      <button onClick={() => replaceDocument(samplePortalData({ asOf: 'replaced' }))}>replace</button>
      <button onClick={() => reset()}>reset</button>
    </div>
  )
}

beforeEach(() => {
  localStorage.clear()
  auth.token = 'tok_test'
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('PortalDataProvider', () => {
  it('signing out drops the previous user document from memory, not just storage', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(samplePortalData({ asOf: 'ust-doc' }))))
    const { rerender } = render(<PortalDataProvider><Consumer /></PortalDataProvider>)
    await waitFor(() => expect(screen.getByTestId('asOf').textContent).toBe('ust-doc'))

    auth.token = null
    rerender(<PortalDataProvider><Consumer /></PortalDataProvider>)
    await waitFor(() => expect(screen.getByTestId('asOf').textContent).toBe(''))
    expect(localStorage.getItem('ustpremera_portaldata_v8')).toBeNull()
  })

  it('fetches the document on mount once auth resolves', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(samplePortalData({ asOf: 'from-server' }), { ETag: '"3"' })))

    render(<PortalDataProvider><Consumer /></PortalDataProvider>)

    await waitFor(() => expect(screen.getByTestId('asOf').textContent).toBe('from-server'))
    expect(screen.getByTestId('loading').textContent).toBe('false')
  })

  it('reset() surfaces the error and leaves local data untouched when the server call fails', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(samplePortalData({ asOf: 'original' })))
      .mockRejectedValueOnce(new api.ApiError(500, 'INTERNAL', 'boom'))
    vi.stubGlobal('fetch', fetchMock)

    render(<PortalDataProvider><Consumer /></PortalDataProvider>)
    await waitFor(() => expect(screen.getByTestId('asOf').textContent).toBe('original'))

    screen.getByText('reset').click()

    await waitFor(() => expect(screen.getByTestId('error').textContent).toBe('boom'))
    // Must NOT have silently swapped in DEFAULT_PORTAL_DATA behind the error.
    expect(screen.getByTestId('asOf').textContent).toBe('original')
  })

  it('refresh() re-runs the GET /portal fetch', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(samplePortalData({ asOf: 'first' })))
      .mockResolvedValueOnce(jsonResponse(samplePortalData({ asOf: 'second' })))
    vi.stubGlobal('fetch', fetchMock)

    render(<PortalDataProvider><Consumer /></PortalDataProvider>)
    await waitFor(() => expect(screen.getByTestId('asOf').textContent).toBe('first'))

    screen.getByText('refresh').click()

    await waitFor(() => expect(screen.getByTestId('asOf').textContent).toBe('second'))
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
