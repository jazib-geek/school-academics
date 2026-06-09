import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import {
  getStoredAcademicInstituteSettings,
  persistAcademicInstituteSettings,
} from '../services/academicAuthService'

const AcademicInstituteSettingsContext = createContext(null)

export function AcademicInstituteSettingsProvider({ children }) {
  const [instituteSettings, setInstituteSettingsState] = useState(() => getStoredAcademicInstituteSettings())

  const setInstituteSettings = useCallback((next) => {
    setInstituteSettingsState(next)
    persistAcademicInstituteSettings(next)
  }, [])

  const value = useMemo(
    () => ({
      instituteSettings,
      setInstituteSettings,
    }),
    [instituteSettings, setInstituteSettings],
  )

  return (
    <AcademicInstituteSettingsContext.Provider value={value}>{children}</AcademicInstituteSettingsContext.Provider>
  )
}

export function useAcademicInstituteSettings() {
  const ctx = useContext(AcademicInstituteSettingsContext)
  if (!ctx) {
    throw new Error('useAcademicInstituteSettings must be used within AcademicInstituteSettingsProvider')
  }
  return ctx
}
