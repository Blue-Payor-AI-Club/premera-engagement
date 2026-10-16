import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Login from './Login'
import { AuthStub } from '../test/auth'
import { userFor } from '../test/users'
import * as authApi from '../lib/authApi'
import { ApiError } from '../lib/api'

vi.mock('../lib/authApi', async (orig) => ({
  ...(await orig<typeof import('../lib/authApi')>()),
  requestCode: vi.fn(),
  verifyCode: vi.fn(),
  submitAccessRequest: vi.fn(),
}))

const completeLogin = vi.fn()
function renderLogin() {
  return render(<AuthStub role={null} completeLogin={completeLogin}><Login /></AuthStub>)
}

async function signInAs(email: string, code = '123456') {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText(/email address/i), email)
  await user.click(screen.getByRole('button', { name: /send sign-in code/i }))
  await user.type(await screen.findByLabelText(/sign-in code/i), code)
  await user.click(screen.getByRole('button', { name: /verify and sign in/i }))
  return user
}

beforeEach(() => {
  vi.mocked(authApi.requestCode).mockResolvedValue({ sent: true, expiresInSeconds: 600 })
})

describe('Login', () => {
  it('asks for an email, sends a code, then signs a registered user in', async () => {
    const session = { status: 'authenticated' as const, token: 'jwt', user: userFor('ust_stakeholder') }
    vi.mocked(authApi.verifyCode).mockResolvedValue(session)
    renderLogin()
    await signInAs('ust@example.com')

    expect(authApi.requestCode).toHaveBeenCalledWith('ust@example.com')
    expect(authApi.verifyCode).toHaveBeenCalledWith('ust@example.com', '123456')
    await waitFor(() => expect(completeLogin).toHaveBeenCalledWith({ token: 'jwt', user: session.user }))
  })

  it('sends an unregistered user to the "no access" page, and files their request with the verification token', async () => {
    vi.mocked(authApi.verifyCode).mockResolvedValue({ status: 'not_registered', email: 'new@premera.com', requestToken: 'req-tok', pendingRequest: false })
    vi.mocked(authApi.submitAccessRequest).mockResolvedValue({ status: 'pending', requestId: 'req_1' })
    renderLogin()
    const user = await signInAs('new@premera.com')

    expect(await screen.findByText(/you don't have access to this portal/i)).toBeInTheDocument()
    expect(completeLogin).not.toHaveBeenCalled()

    await user.type(screen.getByLabelText(/message/i), 'I work on Premera claims.')
    await user.click(screen.getByRole('button', { name: /request access/i }))

    expect(authApi.submitAccessRequest).toHaveBeenCalledWith('req-tok', { name: undefined, message: 'I work on Premera claims.' })
    expect(await screen.findByText(/request sent/i)).toBeInTheDocument()
  })

  it('will not submit an access request without a message', async () => {
    vi.mocked(authApi.verifyCode).mockResolvedValue({ status: 'not_registered', email: 'new@premera.com', requestToken: 'req-tok', pendingRequest: false })
    renderLogin()
    await signInAs('new@premera.com')
    await screen.findByText(/you don't have access/i)
    expect(screen.getByRole('button', { name: /request access/i })).toBeDisabled()
  })

  it('tells a user who already has a pending request, instead of letting them file another', async () => {
    vi.mocked(authApi.verifyCode).mockResolvedValue({ status: 'not_registered', email: 'new@premera.com', requestToken: 'req-tok', pendingRequest: true })
    renderLogin()
    await signInAs('new@premera.com')
    expect(await screen.findByText(/your request is pending/i)).toBeInTheDocument()
    expect(authApi.submitAccessRequest).not.toHaveBeenCalled()
  })

  it('shows the server error for a wrong code and does not sign in', async () => {
    vi.mocked(authApi.verifyCode).mockRejectedValue(new ApiError(401, 'UNAUTHENTICATED', 'That code is invalid or has expired.'))
    renderLogin()
    await signInAs('ust@example.com', '000000')
    expect(await screen.findByRole('alert')).toHaveTextContent(/invalid or has expired/i)
    expect(completeLogin).not.toHaveBeenCalled()
  })

  it('shows a rate-limit error from the code request and stays on the email step', async () => {
    vi.mocked(authApi.requestCode).mockRejectedValue(new ApiError(429, 'TOO_MANY_REQUESTS', 'Please wait 42s before requesting another code.'))
    renderLogin()
    const user = userEvent.setup()
    await user.type(screen.getByLabelText(/email address/i), 'ust@example.com')
    await user.click(screen.getByRole('button', { name: /send sign-in code/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/wait 42s/i)
    expect(screen.queryByLabelText(/sign-in code/i)).toBeNull()
  })

  it('only enables Verify once six digits are entered, and strips non-digits', async () => {
    renderLogin()
    const user = userEvent.setup()
    await user.type(screen.getByLabelText(/email address/i), 'ust@example.com')
    await user.click(screen.getByRole('button', { name: /send sign-in code/i }))
    const input = await screen.findByLabelText(/sign-in code/i)
    const verify = screen.getByRole('button', { name: /verify and sign in/i })
    await user.type(input, '12ab34')
    expect(input).toHaveValue('1234')
    expect(verify).toBeDisabled()
    await user.type(input, '56')
    expect(verify).toBeEnabled()
  })
})
