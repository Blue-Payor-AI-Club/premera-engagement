import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useEffect } from 'react'
import { render, screen, waitFor, act } from '@testing-library/react'
import { AuthProvider, useAuth } from './AuthContext'
import { userFor } from '../test/users'
import * as authApi from '../lib/authApi'
import * as api from '../lib/api'
import { ApiError } from '../lib/api'

vi.mock('../lib/authApi', async (orig) => ({ ...(await orig<typeof import('../lib/authApi')>()), getMe: vi.fn() }))

type Auth = ReturnType<typeof useAuth>
let latest: Auth
function Probe({ onValue }: { onValue: (a: Auth) => void }) {
  const auth = useAuth()
  // Publish after commit (not during render) so the tests can call completeLogin/logout.
  useEffect(() => { onValue(auth) })
  return <div>{auth.loading ? 'loading' : auth.user ? `user:${auth.user.email}` : 'signed-out'}</div>
}
const mount = () => render(<AuthProvider><Probe onValue={(a) => { latest = a }} /></AuthProvider>)

beforeEach(() => {
  sessionStorage.clear()
  api.setApiToken(null)
})

describe('AuthProvider', () => {
  it('starts signed out when there is no stored session, without calling the server', () => {
    mount()
    expect(screen.getByText('signed-out')).toBeInTheDocument()
    expect(authApi.getMe).not.toHaveBeenCalled()
  })

  it('re-validates a stored token with the server and takes the role/permissions from the response', async () => {
    sessionStorage.setItem('ustpremera_token', 'stored')
    vi.mocked(authApi.getMe).mockResolvedValue(userFor('ust_stakeholder', 'u@ust.com'))
    mount()
    expect(screen.getByText('loading')).toBeInTheDocument()
    expect(await screen.findByText('user:u@ust.com')).toBeInTheDocument()
    // `latest` is published after commit, so wait for it rather than racing the DOM.
    await waitFor(() => expect(latest.canEdit).toBe(true))
    expect(latest.isSuperAdmin).toBe(false)
    expect(latest.can('audit:read')).toBe(true)
    expect(latest.can('admin:manage')).toBe(false)
  })

  it('drops a stored session the server rejects (e.g. the user was removed)', async () => {
    sessionStorage.setItem('ustpremera_token', 'stale')
    vi.mocked(authApi.getMe).mockRejectedValue(new ApiError(401, 'UNAUTHENTICATED', 'Your access is no longer active.'))
    mount()
    expect(await screen.findByText('signed-out')).toBeInTheDocument()
    expect(sessionStorage.getItem('ustpremera_token')).toBeNull()
    await waitFor(() => expect(latest.token).toBeNull())
  })

  it('completeLogin stores the session; logout wipes it', async () => {
    mount()
    act(() => latest.completeLogin({ token: 'fresh', user: userFor('premera_stakeholder', 'p@premera.com') }))
    expect(await screen.findByText('user:p@premera.com')).toBeInTheDocument()
    expect(sessionStorage.getItem('ustpremera_token')).toBe('fresh')
    await waitFor(() => expect(latest.can('quickfeedback:vote')).toBe(true))
    expect(latest.canEdit).toBe(false)

    act(() => latest.logout())
    await waitFor(() => expect(screen.getByText('signed-out')).toBeInTheDocument())
    expect(sessionStorage.getItem('ustpremera_token')).toBeNull()
  })

  it('signs the user out when the API later reports the session is dead (token expiry, user disabled)', async () => {
    mount()
    act(() => latest.completeLogin({ token: 'fresh', user: userFor('ust_stakeholder') }))
    await screen.findByText(/user:/)

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ error: { code: 'UNAUTHENTICATED', message: 'no longer active' } }), { status: 401 }))
    await expect(api.apiFetch('/portal')).rejects.toBeInstanceOf(ApiError)
    await waitFor(() => expect(screen.getByText('signed-out')).toBeInTheDocument())
  })

  it('does NOT sign the user out for a 401 on an /auth/* call (that is just a wrong code)', async () => {
    mount()
    act(() => latest.completeLogin({ token: 'fresh', user: userFor('ust_stakeholder') }))
    await screen.findByText(/user:/)

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ error: { code: 'UNAUTHENTICATED', message: 'bad code' } }), { status: 401 }))
    await expect(api.apiFetch('/auth/verify-code', { method: 'POST' })).rejects.toBeInstanceOf(ApiError)
    expect(screen.getByText(/user:/)).toBeInTheDocument()
  })
})
