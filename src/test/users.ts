import { ROLE_LABELS, type Permission, type Role, type SessionUser } from '../lib/authApi'

// Mirrors the API's permission matrix (premera-engagement-api/src/auth/permissions.ts).
// Only used to decide what the UI *shows* in tests; the server is what enforces.
export const PERMS: Record<Role, Permission[]> = {
  super_admin: ['portal:read', 'portal:write', 'portal:reset', 'feedback:submit', 'feedback:read', 'quickfeedback:vote', 'quickfeedback:read-all', 'audit:read', 'admin:manage'],
  ust_stakeholder: ['portal:read', 'portal:write', 'feedback:submit', 'feedback:read', 'quickfeedback:vote', 'quickfeedback:read-all', 'audit:read'],
  premera_stakeholder: ['portal:read', 'feedback:submit', 'feedback:read', 'quickfeedback:vote'],
}

export function userFor(role: Role, email = `${role}@example.com`): SessionUser {
  return { email, role, roleLabel: ROLE_LABELS[role], permissions: PERMS[role] }
}
