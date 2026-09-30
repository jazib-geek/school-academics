import { useEffect, useState } from 'react'
import {
  SIDEBAR_THEME_CHANGED_EVENT,
  SIDEBAR_THEME_STORAGE_KEY,
  applyTableHeaderTheme,
  loadSidebarTheme,
} from '../utils/sidebarTheme'

export default function useSidebarTheme() {
  const [theme, setTheme] = useState(loadSidebarTheme)

  useEffect(() => {
    applyTableHeaderTheme(theme)
  }, [theme])

  useEffect(() => {
    const sync = () => setTheme(loadSidebarTheme())
    const onStorage = (event) => {
      if (!event.key || event.key === SIDEBAR_THEME_STORAGE_KEY) sync()
    }
    window.addEventListener(SIDEBAR_THEME_CHANGED_EVENT, sync)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener(SIDEBAR_THEME_CHANGED_EVENT, sync)
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  return [theme, setTheme]
}
