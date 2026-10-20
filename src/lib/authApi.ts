import { apiFetch } from './api'

export const ROLES = ['super_admin', 'ust_stakeholder', 'premera_stakeholder'] as const
export type Role = (typeof ROLES)[number]

export const ROLE_LABELS: Record<Role, string> = {
  super_admin: 'UST Super Admin',
  ust_stakeholder: 'UST Stakeholder',
  premera_stakeholder: 'Premera Stakeholder',
}

export type Permission =
  | 'portal:read'
  | 'portal:write'
  | 'portal:reset'
  | 'feedback:submit'
  | 'feedback:read'
  | 'quickfeedback:vote'
  | 'quickfeedback:read-all'
  | 'audit:read'
  | 'admin:manage'

/** What the server says about the signed-in user. `permissions` is only used to decide
 * what to *show* — the server enforces every permission itself on every request. */
export interface SessionUser {
  email: string
  name?: string
  role: Role
  roleLabel: string
  permissions: Permission[]
}

export type VerifyResult =
  | { status: 'authenticated'; token: string; user: SessionUser }
  | { status: 'not_registered'; email: string; requestToken: string; pendingRequest: boolean }

async function post<T>(path: string, body: unknown, headers?: Record<string, string>): Promise<T> {
  const res = await apiFetch(path, { method: 'POST', body: JSON.stringify(body), headers })
  return (await res.json()) as T
}

export function requestCode(email: string): Promise<{ sent: true; expiresInSeconds: number }> {
  return post('/auth/request-code', { email })
}

export function verifyCode(email: string, code: string): Promise<VerifyResult> {
  return post('/auth/verify-code', { email, code })
}

/** A short allowlist of named users who skip the one-time-code step entirely and are
 * signed straight in. Any other address 404s — the caller falls back to requestCode. */
export function trustedLogin(email: string): Promise<Extract<VerifyResult, { status: 'authenticated' }>> {
  return post('/auth/trusted-login', { email })
}

/** `requestToken` is the short-lived proof-of-email token from verifyCode — it can do nothing else. */
export function submitAccessRequest(
  requestToken: string,
  input: { name?: string; message: string },
): Promise<{ status: 'pending'; requestId: string }> {
  return post('/auth/access-request', input, { Authorization: `Bearer ${requestToken}` })
}

export interface InviteInfo {
  email: string
  role: Role
  roleLabel: string
  invitedBy: string
  expiresAt: string
}

export async function getInvite(token: string): Promise<InviteInfo> {
  const res = await apiFetch(`/auth/invites/${encodeURIComponent(token)}`)
  return (await res.json()) as InviteInfo
}

export function acceptInvite(token: string): Promise<Extract<VerifyResult, { status: 'authenticated' }>> {
  return post('/auth/invites/accept', { token })
}

export async function getMe(): Promise<SessionUser> {
  const res = await apiFetch('/auth/me')
  return (await res.json()) as SessionUser
}
