import { apiFetch } from './api'
import type { Role } from './authApi'

export type UserStatus = 'active' | 'disabled'

export interface AppUser {
  email: string
  name?: string
  role: Role
  roleLabel: string
  status: UserStatus
  source: 'bootstrap' | 'access_request' | 'invite' | 'dev'
  createdAt: string
  createdBy?: string
  lastLoginAt?: string
}

export interface AccessRequest {
  id: string
  email: string
  name?: string
  message: string
  status: 'pending' | 'approved' | 'rejected'
  requestedAt: string
  decidedBy?: string
  decidedAt?: string
  assignedRole?: Role
  decisionNote?: string
}

export interface Invite {
  id: string
  email: string
  role: Role
  roleLabel: string
  status: 'pending' | 'accepted' | 'revoked'
  invitedBy: string
  createdAt: string
  expiresAt: string
  acceptedAt?: string
  expired: boolean
  /** Only on create/resend responses: false when the mail relay failed. */
  emailSent?: boolean
}

export type NotificationCategory =
  | 'access_request'
  | 'approval'
  | 'client_feedback'
  | 'thumbsdown_feedback'
  | 'data_update'
  | 'onboarding_offboarding'
  | 'important_action'

/** Roles that may be subscribed to a category by role (never Premera — see the API). */
export type NotifiableRole = Extract<Role, 'super_admin' | 'ust_stakeholder'>

export interface NotificationSetting {
  category: NotificationCategory
  label: string
  description: string
  enabled: boolean
  roles: NotifiableRole[]
  emails: string[]
  updatedAt?: string
  updatedBy?: string
}

export interface EmailLogEntry {
  id: string
  category: string
  recipient: string
  subject: string
  status: 'pending' | 'sent' | 'failed'
  attempts: number
  lastError?: string
  createdAt: string
  sentAt?: string
  retriable: boolean
}

export interface AuditEntry {
  id: string
  actor: string
  action: string
  resource: string
  diff?: Record<string, unknown>
  timestamp: string
}

async function json<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await apiFetch(path, opts)
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T)
}

const send = (method: string, body?: unknown): RequestInit => ({
  method,
  body: body === undefined ? undefined : JSON.stringify(body),
})

const enc = encodeURIComponent

export const adminApi = {
  listUsers: () => json<AppUser[]>('/admin/users'),
  updateUser: (email: string, patch: { name?: string; role?: Role; status?: UserStatus }) =>
    json<AppUser>(`/admin/users/${enc(email)}`, send('PATCH', patch)),
  removeUser: (email: string) => json<void>(`/admin/users/${enc(email)}`, send('DELETE')),

  listAccessRequests: () => json<AccessRequest[]>('/admin/access-requests'),
  approveRequest: (id: string, role: Role, note?: string) =>
    json<AccessRequest>(`/admin/access-requests/${enc(id)}/approve`, send('POST', { role, note })),
  rejectRequest: (id: string, note?: string) =>
    json<AccessRequest>(`/admin/access-requests/${enc(id)}/reject`, send('POST', { note })),

  listInvites: () => json<Invite[]>('/admin/invites'),
  createInvite: (email: string, role: Role) => json<Invite>('/admin/invites', send('POST', { email, role })),
  resendInvite: (id: string) => json<Invite>(`/admin/invites/${enc(id)}/resend`, send('POST')),
  revokeInvite: (id: string) => json<void>(`/admin/invites/${enc(id)}`, send('DELETE')),

  listNotificationSettings: () => json<NotificationSetting[]>('/admin/notification-settings'),
  saveNotificationSetting: (
    category: NotificationCategory,
    input: { enabled: boolean; roles: NotifiableRole[]; emails: string[] },
  ) => json<NotificationSetting>(`/admin/notification-settings/${enc(category)}`, send('PUT', input)),

  listEmailLog: () => json<EmailLogEntry[]>('/admin/email-log?limit=200'),
  retryEmail: (id: string) => json<{ ok: boolean }>(`/admin/email-log/${enc(id)}/retry`, send('POST')),

  /** Readable by UST Stakeholders too, not just Super Admins. */
  listAudit: () => json<AuditEntry[]>('/audit?limit=500'),
}
