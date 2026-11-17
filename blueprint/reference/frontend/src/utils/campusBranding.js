import defaultLogoAsset from '../assets/logo.png'
import demoLoginLogoAsset from '../assets/demo.png'

export function normalizeSchoolLogo(logo) {
  if (!logo || typeof logo !== 'string') return ''
  const trimmed = logo.trim()
  if (!trimmed) return ''
  if (trimmed.startsWith('data:')) return trimmed
  return `data:image/png;base64,${trimmed}`
}

function assetHref(asset) {
  if (typeof asset === 'string') {
    if (asset.startsWith('data:') || asset.startsWith('http')) {
      return asset
    }
    if (typeof window !== 'undefined' && window.location?.origin) {
      return new URL(asset, window.location.origin).href
    }
    return asset
  }
  if (typeof window !== 'undefined' && window.location?.origin) {
    return new URL(asset, window.location.origin).href
  }
  return String(asset || '')
}

function defaultLogoHref() {
  return assetHref(defaultLogoAsset)
}

/** Campus admin / employee login screens only — demo bundle uses demo.png; production uses logo.png. */
export function resolveLoginPageLogoSrc() {
  if (import.meta.env.MODE === 'demo') {
    return assetHref(demoLoginLogoAsset)
  }
  return defaultLogoHref()
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
