import { vi } from 'vitest'
import type { ReactNode } from 'react'
import { AuthContext } from '../context/AuthContext'
import type { Permission, Role } from '../lib/authApi'
import { userFor } from './users'

export function AuthStub({ role, children, completeLogin = vi.fn(), logout = vi.fn() }: {
  role: Role | null
  children: ReactNode
  completeLogin?: () => void
  logout?: () => void
}) {
  const user = role ? userFor(role) : null
  const perms = new Set<Permission>(user?.permissions ?? [])
  return (
    <AuthContext.Provider
      value={{
        token: user ? 'tok' : null,
        user,
        loading: false,
        can: (p) => perms.has(p),
        canEdit: perms.has('portal:write'),
        isSuperAdmin: perms.has('admin:manage'),
        completeLogin,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
