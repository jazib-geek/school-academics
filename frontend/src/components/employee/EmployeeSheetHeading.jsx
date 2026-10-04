import { useEffect, useState } from 'react'
import { resolveCampusLogoSrc } from '../../utils/campusBranding'
import { CAMPUS_PROFILE_CHANGED_EVENT, getStoredCampusProfile } from '../../utils/campusProfile'

function useCampusLogoSrc() {
  const [logoSrc, setLogoSrc] = useState(() => resolveCampusLogoSrc(getStoredCampusProfile()))
  useEffect(() => {
    const sync = () => setLogoSrc(resolveCampusLogoSrc(getStoredCampusProfile()))
    sync()
    window.addEventListener(CAMPUS_PROFILE_CHANGED_EVENT, sync)
    return () => window.removeEventListener(CAMPUS_PROFILE_CHANGED_EVENT, sync)
  }, [])
  return logoSrc
}

export function EmployeeSheetBrandMark({ className = '' }) {
  const logoSrc = useCampusLogoSrc()
  if (!logoSrc) return null
  return (
    <img
      src={logoSrc}
      alt=""
      className={['emp-sheet-brand-mark', className].filter(Boolean).join(' ')}
      aria-hidden="true"
      decoding="async"
    />
  )
}

export default function EmployeeSheetHeading({ id, children, level = 2, className = '' }) {
  const Tag = level === 3 ? 'h3' : 'h2'
  return (
    <Tag id={id} className={['emp-sheet-heading', className].filter(Boolean).join(' ')}>
      <EmployeeSheetBrandMark />
      <span className="emp-sheet-heading-text">{children}</span>
    </Tag>
  )
}
