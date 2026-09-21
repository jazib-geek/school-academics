import api from './api'
import {
  CAMPUS_LANDING_CANDIDATES,
  resolveCampusRoutePermission,
} from '../constants/campusPermissions'
import { clearCampusProfile, persistCampusProfile } from '../utils/campusProfile'

const LOGIN_PATH = import.meta.env.VITE_LOGIN_PATH || '/api/auth/login'
const CAMPUS_HEADER = import.meta.env.VITE_CAMPUS_HEADER || 'X-Campus'
const PERMISSIONS_KEY = 'campusPermissions'
const SUPER_ADMIN_KEY = 'campusIsSuperAdmin'
const FUND_TYPES_KEY = 'campusFundTypes'

const mapLoginResponse = (data) => {
  const payload = data?.data || data

  return {
    token: payload?.token || payload?.accessToken || payload?.jwt || '',
    user:
      payload?.user ||
      (payload?.username || payload?.Username
        ? { username: payload.username || payload.Username, role: payload.role || 'Admin' }
        : null),
    isSuperAdmin: Boolean(payload?.isSuperAdmin ?? payload?.IsSuperAdmin),
    grantedPermissionCodes:
      payload?.grantedPermissionCodes || payload?.GrantedPermissionCodes || [],
    fundTypes: payload?.fundTypes || payload?.FundTypes || [],
    campusProfile: payload?.campusProfile || payload?.CampusProfile || null,
  }
}

export const getCampusFundTypes = () => {
  try {
    const raw = localStorage.getItem(FUND_TYPES_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .map((item) => ({
        id: Number(item?.id ?? item?.Id),
        name: String(item?.name ?? item?.Name ?? ''),
      }))
      .filter((item) => Number.isFinite(item.id) && item.id > 0)
  } catch {
    return []
  }
}

export const persistCampusFundTypes = (fundTypes) => {
  if (Array.isArray(fundTypes)) {
    localStorage.setItem(
      FUND_TYPES_KEY,
      JSON.stringify(
        fundTypes.map((item) => ({
          id: Number(item?.id ?? item?.Id),
          name: String(item?.name ?? item?.Name ?? ''),
        })),
      ),
    )
  } else {
    localStorage.removeItem(FUND_TYPES_KEY)
  }
}

export const getStoredCampusPermissions = () => {
  try {
    const raw = localStorage.getItem(PERMISSIONS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.map((code) => String(code).toLowerCase()) : []
  } catch {
    return []
  }
}

export const persistCampusPermissions = (codes) => {
  if (Array.isArray(codes)) {
    localStorage.setItem(
      PERMISSIONS_KEY,
      JSON.stringify(codes.map((code) => String(code).toLowerCase())),
    )
  } else {
    localStorage.removeItem(PERMISSIONS_KEY)
  }
}

export const persistCampusIsSuperAdmin = (value) => {
  localStorage.setItem(SUPER_ADMIN_KEY, value ? '1' : '0')
}

export const isCampusSuperAdmin = () => localStorage.getItem(SUPER_ADMIN_KEY) === '1'

export const hasCampusPermission = (code) => {
  if (!code) return false
  if (isCampusSuperAdmin()) return true
  const granted = getStoredCampusPermissions()
  return granted.includes(String(code).toLowerCase())
}

/** Like hasCampusPermission but does not treat Super Admin as a blanket grant. */
export const hasCampusPermissionStrict = (code) => {
  if (!code) return false
  const granted = getStoredCampusPermissions()
  return granted.includes(String(code).toLowerCase())
}

export const hasAnyCampusPermission = (...codes) =>
  codes.filter(Boolean).some((code) => hasCampusPermission(code))

export const canAccessCampusPath = (pathname) => {
  const path = String(pathname || '')
  if (path === '/campus/overview' || path.startsWith('/campus/overview/')) {
    return isCampusSuperAdmin() && hasCampusPermissionStrict('view_all_campus_dashboard')
  }
  if (isCampusSuperAdmin()) return true
  // Listing pages stay routable; in-page panels enforce list permissions.
  if (path === '/campus/students' || path.startsWith('/campus/students?')) return true
  if (path === '/campus/employees' || path.startsWith('/campus/employees?')) return true
  // Nested student routes still use route map (admit/transfer/etc.)
  if (path.startsWith('/campus/students/')) {
    const rule = resolveCampusRoutePermission(path)
    if (!rule) return true
    if (rule.anyOf?.length) return hasAnyCampusPermission(...rule.anyOf)
    return hasCampusPermission(rule.permission)
  }
  const rule = resolveCampusRoutePermission(path)
  if (!rule) return true
  if (rule.anyOf?.length) return hasAnyCampusPermission(...rule.anyOf)
  return hasCampusPermission(rule.permission)
}

export const getCampusLandingPath = () => {
  if (isCampusSuperAdmin()) return '/campus/dashboard'

  for (const candidate of CAMPUS_LANDING_CANDIDATES) {
    if (candidate.anyOf?.length) {
      if (hasAnyCampusPermission(...candidate.anyOf)) return candidate.path
      continue
    }
    if (hasCampusPermission(candidate.permission)) return candidate.path
  }

  return '/campus/students'
}

/** Prefer intended path when allowed; otherwise first suitable landing page. */
export const resolveCampusPostLoginPath = (intendedPath) => {
  if (intendedPath && canAccessCampusPath(intendedPath)) {
    if (
      (intendedPath === '/campus/dashboard' || intendedPath.startsWith('/campus/dashboard/')) &&
      !hasCampusPermission('stats_home')
    ) {
      return getCampusLandingPath()
    }
    return intendedPath
  }
  return getCampusLandingPath()
}

export const loginWithCampus = async ({ campus, username, password }) => {
  const response = await api.post(
    LOGIN_PATH,
    {
      username,
      password,
    },
    {
      headers: {
        [CAMPUS_HEADER]: campus,
      },
    },
  )

  const mapped = mapLoginResponse(response.data)
  persistCampusSession({ campus, username, mapped })
  return mapped
}

/** Super Admin only: switch active campus and refresh JWT without password. */
export const switchCampusSession = async (campus) => {
  const response = await api.post('/api/auth/switch-campus', { campus })
  const mapped = mapLoginResponse(response.data)
  const username = mapped.user?.username || localStorage.getItem('username') || ''
  persistCampusSession({ campus, username, mapped })
  return mapped
}

/** Super Admin only: sign in as another campus user without their password. */
export const loginAsCampusUser = async (userId) => {
  const response = await api.post('/api/auth/login-as', { userId })
  const mapped = mapLoginResponse(response.data)
  const campus = localStorage.getItem('campus') || ''
  const username = mapped.user?.username || ''
  persistCampusSession({ campus, username, mapped })
  return mapped
}

const persistCampusSession = ({ campus, username, mapped }) => {
  localStorage.setItem('campus', campus)
  if (username) {
    localStorage.setItem('username', username)
  }

  if (mapped.token) {
    localStorage.setItem('token', mapped.token)
  }

  if (mapped.user) {
    localStorage.setItem('user', JSON.stringify(mapped.user))
  } else if (username) {
    localStorage.setItem('user', JSON.stringify({ username, role: 'Admin' }))
  }

  persistCampusIsSuperAdmin(mapped.isSuperAdmin)
  persistCampusPermissions(mapped.grantedPermissionCodes)
  persistCampusFundTypes(mapped.fundTypes)
  persistCampusProfile(mapped.campusProfile)
}

export const logout = () => {
  // Keep `campus` so the login dropdown can preselect the last campus.
  localStorage.removeItem('username')
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  localStorage.removeItem(PERMISSIONS_KEY)
  localStorage.removeItem(SUPER_ADMIN_KEY)
  localStorage.removeItem(FUND_TYPES_KEY)
  clearCampusProfile()
}

export const changeCampusPassword = async ({ currentPassword, newPassword, confirmPassword }) => {
  const response = await api.post('/api/auth/change-password', {
    currentPassword,
    newPassword,
    confirmPassword,
  })
  return response?.data
}

export const isAuthenticated = () =>
  Boolean(localStorage.getItem('token') || localStorage.getItem('username'))
