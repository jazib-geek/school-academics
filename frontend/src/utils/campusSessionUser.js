function decodeJwtPayload(token) {
  try {
    const part = String(token || '').split('.')[1]
    if (!part) return null
    const base64 = part.replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
    const json = decodeURIComponent(
      atob(padded)
        .split('')
        .map((c) => `%${c.charCodeAt(0).toString(16).padStart(2, '0')}`)
        .join(''),
    )
    return JSON.parse(json)
  } catch {
    return null
  }
}

/** Signed-in campus user id (from the session token), or 0. */
export function getCampusUserId(token = localStorage.getItem('token')) {
  const payload = decodeJwtPayload(token)
  const id = Number(payload?.FamilyDbId)
  return Number.isFinite(id) && id > 0 ? id : 0
}
