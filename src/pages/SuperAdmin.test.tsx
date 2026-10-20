import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SuperAdmin from './SuperAdmin'
import { AuthStub } from '../test/auth'
import { adminApi, type AccessRequest, type AppUser, type Invite, type NotificationSetting } from '../lib/adminApi'

vi.mock('../lib/adminApi', () => ({
  adminApi: {
    listUsers: vi.fn(), updateUser: vi.fn(), removeUser: vi.fn(),
    listAccessRequests: vi.fn(), approveRequest: vi.fn(), rejectRequest: vi.fn(),
    listInvites: vi.fn(), createInvite: vi.fn(), resendInvite: vi.fn(), revokeInvite: vi.fn(),
    listNotificationSettings: vi.fn(), saveNotificationSetting: vi.fn(),
    listEmailLog: vi.fn(), retryEmail: vi.fn(), listAudit: vi.fn(),
  },
}))

const user = (over: Partial<AppUser>): AppUser => ({
  email: 'x@ust.com', role: 'ust_stakeholder', roleLabel: 'UST Stakeholder', status: 'active',
  source: 'invite', createdAt: '2026-01-01T00:00:00Z', ...over,
})
const request = (over: Partial<AccessRequest>): AccessRequest => ({
  id: 'req_1', email: 'new@premera.com', message: 'I need to see the claims risks.', status: 'pending',
  requestedAt: '2026-02-01T00:00:00Z', ...over,
})
const setting = (over: Partial<NotificationSetting>): NotificationSetting => ({
  category: 'client_feedback', label: 'Client feedback', description: 'Feedback was submitted.',
  enabled: true, roles: ['super_admin'], emails: [], ...over,
})

function renderPage() {
  // The signed-in Super Admin is super_admin@example.com (from the AuthStub).
  return render(<AuthStub role="super_admin"><SuperAdmin /></AuthStub>)
}

beforeEach(() => {
  vi.mocked(adminApi.listAccessRequests).mockResolvedValue([request({})])
  vi.mocked(adminApi.listUsers).mockResolvedValue([])
  vi.mocked(adminApi.listInvites).mockResolvedValue([])
  vi.mocked(adminApi.listNotificationSettings).mockResolvedValue([])
  vi.mocked(adminApi.listEmailLog).mockResolvedValue([])
  vi.spyOn(window, 'confirm').mockReturnValue(true)
})

describe('SuperAdmin — access requests', () => {
  it('opens on pending requests and flags the count on the tab', async () => {
    renderPage()
    expect(await screen.findByText('I need to see the claims risks.')).toBeInTheDocument()
    expect(screen.getByLabelText('1 pending')).toBeInTheDocument()
  })

  it('pre-selects the LEAST privileged role, and approves with the role the admin explicitly picks', async () => {
    vi.mocked(adminApi.approveRequest).mockResolvedValue(request({ status: 'approved' }))
    renderPage()
    const select = await screen.findByLabelText('Role for new@premera.com')
    expect(select).toHaveValue('premera_stakeholder')

    const u = userEvent.setup()
    await u.selectOptions(select, 'ust_stakeholder')
    await u.type(screen.getByLabelText(/note/i), 'Welcome aboard')
    await u.click(screen.getByRole('button', { name: 'Approve' }))

    expect(adminApi.approveRequest).toHaveBeenCalledWith('req_1', 'ust_stakeholder', 'Welcome aboard')
    await waitFor(() => expect(adminApi.listAccessRequests).toHaveBeenCalledTimes(2)) // list refreshed
  })

  it('rejects with an optional note', async () => {
    vi.mocked(adminApi.rejectRequest).mockResolvedValue(request({ status: 'rejected' }))
    renderPage()
    const u = userEvent.setup()
    await u.click(await screen.findByRole('button', { name: 'Reject' }))
    expect(adminApi.rejectRequest).toHaveBeenCalledWith('req_1', undefined)
  })

  it('shows the server error and keeps the request on screen if approval fails', async () => {
    vi.mocked(adminApi.approveRequest).mockRejectedValue(new Error('This request has already been decided.'))
    renderPage()
    await userEvent.setup().click(await screen.findByRole('button', { name: 'Approve' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/already been decided/i)
    expect(screen.getByText('I need to see the claims risks.')).toBeInTheDocument()
  })

  it('lists decided requests in a history table', async () => {
    vi.mocked(adminApi.listAccessRequests).mockResolvedValue([
      request({ id: 'r2', email: 'old@premera.com', status: 'approved', assignedRole: 'premera_stakeholder', decidedBy: 'boss@ust.com' }),
    ])
    renderPage()
    expect(await screen.findByText('No pending requests.')).toBeInTheDocument()
    expect(screen.getByText('old@premera.com')).toBeInTheDocument()
    expect(screen.getByText(/approved · premera stakeholder/i)).toBeInTheDocument()
  })
})

describe('SuperAdmin — users', () => {
  async function openUsers() {
    renderPage()
    await userEvent.setup().click(await screen.findByRole('tab', { name: /users/i }))
  }

  it("a Super Admin can't change, disable or remove their own account from the UI", async () => {
    vi.mocked(adminApi.listUsers).mockResolvedValue([
      user({ email: 'super_admin@example.com', role: 'super_admin', roleLabel: 'UST Super Admin' }),
      user({ email: 'other@ust.com' }),
    ])
    await openUsers()
    const meRow = (await screen.findByText('super_admin@example.com')).closest('tr')!
    expect(within(meRow).getByLabelText(/role for super_admin@example.com/i)).toBeDisabled()
    expect(within(meRow).getByRole('button', { name: /disable/i })).toBeDisabled()
    expect(within(meRow).getByRole('button', { name: /remove/i })).toBeDisabled()

    const otherRow = screen.getByText('other@ust.com').closest('tr')!
    expect(within(otherRow).getByLabelText(/role for other@ust.com/i)).toBeEnabled()
    expect(within(otherRow).getByRole('button', { name: /disable/i })).toBeEnabled()
  })

  it('changes another user\'s role only after confirmation', async () => {
    vi.mocked(adminApi.listUsers).mockResolvedValue([user({ email: 'other@ust.com' })])
    vi.mocked(adminApi.updateUser).mockResolvedValue(user({ role: 'premera_stakeholder' }))
    await openUsers()
    const select = await screen.findByLabelText(/role for other@ust.com/i)

    vi.mocked(window.confirm).mockReturnValueOnce(false)
    await userEvent.setup().selectOptions(select, 'premera_stakeholder')
    expect(adminApi.updateUser).not.toHaveBeenCalled()

    await userEvent.setup().selectOptions(select, 'premera_stakeholder')
    expect(adminApi.updateUser).toHaveBeenCalledWith('other@ust.com', { role: 'premera_stakeholder' })
  })

  it('disables and removes a user via the API', async () => {
    vi.mocked(adminApi.listUsers).mockResolvedValue([user({ email: 'other@ust.com' })])
    vi.mocked(adminApi.updateUser).mockResolvedValue(user({ status: 'disabled' }))
    vi.mocked(adminApi.removeUser).mockResolvedValue(undefined)
    await openUsers()
    const u = userEvent.setup()
    await u.click(await screen.findByRole('button', { name: 'Disable' }))
    expect(adminApi.updateUser).toHaveBeenCalledWith('other@ust.com', { status: 'disabled' })
    await u.click(screen.getByRole('button', { name: /remove other@ust.com/i }))
    expect(adminApi.removeUser).toHaveBeenCalledWith('other@ust.com')
  })
})

describe('SuperAdmin — invitations', () => {
  it('sends an invite with the chosen role, and warns when the email could not be delivered', async () => {
    vi.mocked(adminApi.createInvite).mockResolvedValue({ id: 'inv_1', emailSent: false } as Invite)
    renderPage()
    const u = userEvent.setup()
    await u.click(await screen.findByRole('tab', { name: /invitations/i }))
    await u.type(await screen.findByPlaceholderText('name@company.com'), 'friend@premera.com')
    await u.selectOptions(screen.getByLabelText('Invite role'), 'ust_stakeholder')
    await u.click(screen.getByRole('button', { name: /send invite/i }))

    expect(adminApi.createInvite).toHaveBeenCalledWith('friend@premera.com', 'ust_stakeholder')
    expect(await screen.findByRole('status')).toHaveTextContent(/could not be delivered/i)
  })

  it('offers Resend/Revoke only on pending invites', async () => {
    const base = { roleLabel: 'UST Stakeholder', role: 'ust_stakeholder', invitedBy: 'boss@ust.com', createdAt: '2026-01-01T00:00:00Z', expiresAt: '2099-01-01T00:00:00Z', expired: false } as const
    vi.mocked(adminApi.listInvites).mockResolvedValue([
      { ...base, id: 'a', email: 'pending@x.com', status: 'pending' },
      { ...base, id: 'b', email: 'done@x.com', status: 'accepted' },
    ])
    renderPage()
    await userEvent.setup().click(await screen.findByRole('tab', { name: /invitations/i }))
    const pendingRow = (await screen.findByText('pending@x.com')).closest('tr')!
    expect(within(pendingRow).getByRole('button', { name: 'Resend' })).toBeInTheDocument()
    const doneRow = screen.getByText('done@x.com').closest('tr')!
    expect(within(doneRow).queryByRole('button')).toBeNull()
  })
})

describe('SuperAdmin — email notification recipients', () => {
  async function openNotifications() {
    renderPage()
    await userEvent.setup().click(await screen.findByRole('tab', { name: /email notifications/i }))
  }

  it('can only subscribe UST roles by role — Premera Stakeholder is never offered', async () => {
    vi.mocked(adminApi.listNotificationSettings).mockResolvedValue([setting({})])
    await openNotifications()
    expect(await screen.findByLabelText(/UST Super Admin for Client feedback/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/UST Stakeholder for Client feedback/i)).toBeInTheDocument()
    expect(screen.queryByLabelText(/Premera Stakeholder/i)).toBeNull()
  })

  it('saves roles plus extra recipients (normalised, de-duplicated) and only enables Save once something changed', async () => {
    vi.mocked(adminApi.listNotificationSettings).mockResolvedValue([setting({})])
    vi.mocked(adminApi.saveNotificationSetting).mockResolvedValue(setting({}))
    await openNotifications()
    const save = await screen.findByRole('button', { name: /save client feedback/i })
    expect(save).toBeDisabled()

    const u = userEvent.setup()
    await u.click(screen.getByLabelText(/UST Stakeholder for Client feedback/i))
    await u.type(screen.getByLabelText(/additional recipients for client feedback/i), 'Team@UST.com, team@ust.com{enter}ops@ust.com')
    expect(save).toBeEnabled()
    await u.click(save)

    expect(adminApi.saveNotificationSetting).toHaveBeenCalledWith('client_feedback', {
      enabled: true,
      roles: ['super_admin', 'ust_stakeholder'],
      emails: ['team@ust.com', 'ops@ust.com'],
    })
  })

  it('warns when a category is enabled with nobody to send to', async () => {
    vi.mocked(adminApi.listNotificationSettings).mockResolvedValue([setting({ roles: [], emails: [] })])
    await openNotifications()
    expect(await screen.findByText(/nobody selected/i)).toBeInTheDocument()
  })
})

describe('SuperAdmin — email log', () => {
  it('offers Retry only for failed emails that are retriable (secret-bearing mail has no body to resend)', async () => {
    const base = { category: 'x', attempts: 1, createdAt: '2026-01-01T00:00:00Z' } as const
    vi.mocked(adminApi.listEmailLog).mockResolvedValue([
      { ...base, id: '1', recipient: 'a@x.com', subject: 'Feedback', status: 'failed', retriable: true, lastError: 'relay down' },
      { ...base, id: '2', recipient: 'b@x.com', subject: 'Your sign-in code', status: 'failed', retriable: false },
      { ...base, id: '3', recipient: 'c@x.com', subject: 'Fine', status: 'sent', retriable: true },
    ])
    vi.mocked(adminApi.retryEmail).mockResolvedValue({ ok: true })
    renderPage()
    const u = userEvent.setup()
    await u.click(await screen.findByRole('tab', { name: /email log/i }))
    expect(await screen.findAllByRole('button', { name: 'Retry' })).toHaveLength(1)
    await u.click(screen.getByRole('button', { name: 'Retry' }))
    expect(adminApi.retryEmail).toHaveBeenCalledWith('1')
  })
})
