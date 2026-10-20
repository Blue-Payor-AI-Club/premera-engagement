import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { setApiToken, setUnauthorizedHandler } from '../lib/api'
import { getMe, type Permission, type SessionUser } from '../lib/authApi'

const TOKEN_KEY = 'ustpremera_token'

interface AuthCtx {
  token: string | null
  user: SessionUser | null
  /** True only while a stored session is being re-validated on startup. */
  loading: boolean
  /** UI gating only — the server re-checks every permission on every request. */
  can: (permission: Permission) => boolean
  /** UST Stakeholders and Super Admins: may edit portal data and upload the Excel workbook. */
  canEdit: boolean
  isSuperAdmin: boolean
  completeLogin: (session: { token: string; user: SessionUser }) => void
  logout: () => void
}

const AuthContext = createContext<AuthCtx | null>(null)

// Exported (not just the hook) so tests can inject a session directly.
export { AuthContext }

export function AuthProvider({ children }: { children: ReactNode }) {
  // sessionStorage (not localStorage): the session ends with the tab, and the token isn't
  // readable by other tabs. The server still enforces expiry and revocation.
  const [token, setToken] = useState<string | null>(() => {
    const stored = sessionStorage.getItem(TOKEN_KEY)
    // Installed here, not in an effect: children's effects run before this component's,
    // and a child fetching on mount must already see the token.
    setApiToken(stored)
    return stored
  })
  const [user, setUser] = useState<SessionUser | null>(null)
  const [loading, setLoading] = useState<boolean>(() => sessionStorage.getItem(TOKEN_KEY) !== null)

  const clear = useCallback(() => {
    sessionStorage.removeItem(TOKEN_KEY)
    setApiToken(null)
    setToken(null)
    setUser(null)
  }, [])

  // Re-validate a stored session on startup. Done once; the user's role and permissions
  // come from the server, so a role change or removal is reflected on reload.
  useEffect(() => {
    if (!sessionStorage.getItem(TOKEN_KEY)) return
    getMe()
      .then(setUser)
      .catch(clear)
      .finally(() => setLoading(false))
  }, [clear])

  // If the server later rejects the token (expired, or this user was disabled/removed),
  // drop straight back to the sign-in screen.
  useEffect(() => {
    setUnauthorizedHandler(clear)
    return () => setUnauthorizedHandler(null)
  }, [clear])

  const completeLogin = useCallback((session: { token: string; user: SessionUser }) => {
    sessionStorage.setItem(TOKEN_KEY, session.token)
    setApiToken(session.token)
    setToken(session.token)
    setUser(session.user)
    setLoading(false)
  }, [])

  const value = useMemo<AuthCtx>(() => {
    const permissions = new Set<Permission>(user?.permissions ?? [])
    return {
      token,
      user,
      loading,
      can: (p) => permissions.has(p),
      canEdit: permissions.has('portal:write'),
      isSuperAdmin: permissions.has('admin:manage'),
      completeLogin,
      logout: clear,
    }
  }, [token, user, loading, completeLogin, clear])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthCtx {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
