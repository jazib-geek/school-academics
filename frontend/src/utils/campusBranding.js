import defaultLogoAsset from '../assets/logo.png'

export function normalizeSchoolLogo(logo) {
  if (!logo || typeof logo !== 'string') return ''
  const trimmed = logo.trim()
  if (!trimmed) return ''
  if (trimmed.startsWith('data:')) return trimmed
  return `data:image/png;base64,${trimmed}`
}

function defaultLogoHref() {
  if (typeof defaultLogoAsset === 'string') {
    if (defaultLogoAsset.startsWith('data:') || defaultLogoAsset.startsWith('http')) {
      return defaultLogoAsset
    }
    if (typeof window !== 'undefined' && window.location?.origin) {
      return new URL(defaultLogoAsset, window.location.origin).href
    }
    return defaultLogoAsset
  }
  if (typeof window !== 'undefined' && window.location?.origin) {
    return new URL(defaultLogoAsset, window.location.origin).href
  }
  return String(defaultLogoAsset || '')
}

/** Institute logo from profile, else bundled logo.png only. */
export function resolveCampusLogoSrc(profile) {
  const fromProfile = normalizeSchoolLogo(profile?.schoolLogo)
  if (fromProfile) return fromProfile
  return defaultLogoHref()
}

export function getCampusSchoolName(profile) {
  const name = profile?.schoolName
  if (!name || typeof name !== 'string') return ''
  return name.trim()
}

export function getCampusSchoolNameDisplay(profile) {
  const name = getCampusSchoolName(profile)
  return name ? name.toUpperCase() : ''
}
