/** Dispatched when coordinator proforma status changes (SSE). Coordinator workspace listens. */
export const EMPLOYEE_PROFORMA_LIVE_EVENT = 'employee-proforma-live-update'

const PROFORMA_LIVE_UPDATE_TYPES = new Set([
  'proforma_approved',
  'proforma_returned',
  'proforma_head_comment',
  'proforma_submitted',
])

export function reportDateFromEmployeeNotification(payload) {
  const link = typeof payload?.link === 'string' ? payload.link : ''
  const match = link.match(/[?&]date=(\d{4}-\d{2}-\d{2})/)
  return match?.[1] || null
}

export function campusKeyFromEmployeeNotification(payload) {
  const link = typeof payload?.link === 'string' ? payload.link : ''
  try {
    const query = link.includes('?') ? link.slice(link.indexOf('?')) : ''
    const campus = new URLSearchParams(query).get('campus')
    return campus ? decodeURIComponent(campus).trim().toLowerCase() : null
  } catch {
    return null
  }
}

export function dispatchEmployeeProformaLiveUpdate(payload) {
  if (!payload?.type || !PROFORMA_LIVE_UPDATE_TYPES.has(payload.type)) return
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(EMPLOYEE_PROFORMA_LIVE_EVENT, { detail: payload }))
}
