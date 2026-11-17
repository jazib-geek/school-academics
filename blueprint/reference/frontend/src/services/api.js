import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://localhost:7093'
const CAMPUS_HEADER = import.meta.env.VITE_CAMPUS_HEADER || 'X-Campus'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

const resolveRequestUrl = (config) => {
  const raw = config.url || ''
  if (raw.startsWith('http')) return raw
  const base = (config.baseURL || API_BASE_URL || '').replace(/\/$/, '')
  const path = raw.startsWith('/') ? raw : `/${raw}`
  return `${base}${path}`
}

const getHashPath = () => {
  if (typeof window === 'undefined') return ''
  return (window.location.hash || '').replace(/^#/, '') || '/'
}

/** Which portal is active — Academics uses `academicApi.js` and `academicToken` only. */
const getActivePortal = (config) => {
  const url = resolveRequestUrl(config)
  if (url.includes('/api/employee/')) return 'employee'

  // Employee portal must send employeeToken even for /api/campus/... academic APIs.
  const hash = getHashPath()
  if (hash.startsWith('/employee') && !hash.startsWith('/employee/login')) return 'employee'

  if (url.includes('/api/campus/') || url.includes('/api/dashboard/')) return 'campus'
  if (hash.startsWith('/campus') || hash === '/dashboard' || hash.startsWith('/students')) {
    return 'campus'
  }
  return null
}

const resolveAuthToken = (config) => {
  const portal = getActivePortal(config)
  if (portal === 'employee') {
    return localStorage.getItem('employeeToken') || ''
  }
  if (portal === 'campus') {
    return localStorage.getItem('token') || ''
  }
  return ''
}

const applyCampusHeader = (config) => {
  const portal = getActivePortal(config)
  if (portal === 'employee') {
    const campus = localStorage.getItem('employeeCampus')
    if (campus) config.headers[CAMPUS_HEADER] = campus
    return
  }
  if (portal === 'campus') {
    const campus = localStorage.getItem('campus')
    if (campus) config.headers[CAMPUS_HEADER] = campus
  }
}

api.interceptors.request.use((config) => {
  const token = resolveAuthToken(config)

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  applyCampusHeader(config)

  // Default Content-Type is application/json; FormData must use multipart with boundary (browser sets it).
  if (config.data instanceof FormData) {
    const h = config.headers
    if (h && typeof h.delete === 'function') {
      h.delete('Content-Type')
    } else {
      delete config.headers['Content-Type']
    }
    if (h && typeof h.setContentType === 'function') {
      h.setContentType(false)
    }
  }

  return config
})

const isLoginRequest = (url = '') =>
  /\/api\/auth\/(login|campus-login|employee-login)\/?$/.test(url) ||
  /\/api\/academics\/auth\/login\/?$/.test(url)

const clearPortalSession = (portal) => {
  if (portal === 'employee') {
    // Keep `employeeCampus` so the login dropdown can preselect the last campus.
    localStorage.removeItem('employeeId')
    localStorage.removeItem('employeeName')
    localStorage.removeItem('employeeToken')
    localStorage.removeItem('employeeUser')
    return
  }
  // Keep `campus` so the login dropdown can preselect the last campus.
  localStorage.removeItem('username')
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  localStorage.removeItem('campusPermissions')
  localStorage.removeItem('campusIsSuperAdmin')
  localStorage.removeItem('campusFundTypes')
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status
    const requestUrl = error?.config?.url || ''

    if (status === 401 && !isLoginRequest(requestUrl)) {
      const portal = getActivePortal(error.config || {})
      clearPortalSession(portal)

      if (typeof window !== 'undefined') {
        const hashPath = getHashPath()
        if (portal === 'employee' && hashPath !== '/employee/login') {
          window.location.replace(
            `${window.location.pathname}${window.location.search}#/employee/login`,
          )
        } else if (portal === 'campus' && hashPath !== '/login') {
          window.location.replace(
            `${window.location.pathname}${window.location.search}#/login`,
          )
        }
      }
    }

    return Promise.reject(error)
  },
)

export default api
