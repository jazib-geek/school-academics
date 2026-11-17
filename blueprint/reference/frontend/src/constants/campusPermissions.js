/**
 * Route prefix → required permission (`permission`) or any of (`anyOf`).
 * Optional `exact: true` matches the path only; otherwise the prefix and its sub-paths match.
 */
export const CAMPUS_ROUTE_PERMISSIONS = [
  { prefix: '/campus/dashboard', permission: 'dashboard_view' },
  { prefix: '/campus/users', permission: 'user_list' },
  { prefix: '/campus/activity-logs', permission: 'activity_log_view' },
  { prefix: '/campus/settings/system', permission: 'system_settings_manage' },
]

/** Longest-prefix match for a campus path. */
export function resolveCampusRoutePermission(pathname) {
  const path = String(pathname || '')
  const matches = CAMPUS_ROUTE_PERMISSIONS.filter((rule) => {
    if (rule.exact) return path === rule.prefix
    if (rule.prefix.endsWith('/')) return path.startsWith(rule.prefix)
    return path === rule.prefix || path.startsWith(`${rule.prefix}/`)
  }).sort((a, b) => b.prefix.length - a.prefix.length)
  return matches[0] || null
}

/** Ordered fallback landing targets after login. */
export const CAMPUS_LANDING_CANDIDATES = [
  { path: '/campus/dashboard', permission: 'dashboard_view' },
  { path: '/campus/users', permission: 'user_list' },
  { path: '/campus/activity-logs', permission: 'activity_log_view' },
  { path: '/campus/settings/system', permission: 'system_settings_manage' },
]
