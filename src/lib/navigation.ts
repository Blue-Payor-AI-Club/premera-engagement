import type { Permission } from './authApi'

export interface NavItem {
  to: string
  label: string
  /** Required to see the link AND to open the route (see RequirePermission). Omitted = everyone signed in. */
  permission?: Permission
}

/** The three sections every signed-in user sees. */
export const PRIMARY_NAV: NavItem[] = [
  { to: '/program', label: 'Program Level' },
  { to: '/risks', label: 'Risks & Issues' },
  { to: '/feedback', label: 'Feedback to UST' },
]

/** Management links, shown only to roles that hold the permission. UI gating only —
 * the server enforces every one of these permissions itself. */
export const UTILITY_NAV: NavItem[] = [
  { to: '/activity', label: 'Activity', permission: 'audit:read' },
  { to: '/admin', label: 'Data Sync', permission: 'portal:write' },
  { to: '/superadmin', label: 'Super Admin', permission: 'admin:manage' },
]

export function visibleUtilityNav(can: (p: Permission) => boolean): NavItem[] {
  return UTILITY_NAV.filter((item) => !item.permission || can(item.permission))
}
