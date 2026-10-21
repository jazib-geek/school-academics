import { useEffect, useRef } from 'react'

/**
 * Prefixes the browser tab title with `(count)` and, while the tab is hidden,
 * alternates with `flashText` so new activity is visible from other tabs.
 */
export default function useTabTitleBadge(count, flashText) {
  const baseTitleRef = useRef(null)

  useEffect(() => {
    if (baseTitleRef.current === null) baseTitleRef.current = document.title.replace(/^\(\d+\+?\)\s*/, '')
    const base = baseTitleRef.current
    const badged = count > 0 ? `(${count > 99 ? '99+' : count}) ${base}` : base
    document.title = badged

    if (!(count > 0) || !flashText) return undefined

    let showFlash = false
    const timer = window.setInterval(() => {
      if (!document.hidden) {
        document.title = badged
        showFlash = false
        return
      }
      showFlash = !showFlash
      document.title = showFlash ? flashText : badged
    }, 1200)

    return () => {
      window.clearInterval(timer)
      document.title = badged
    }
  }, [count, flashText])

  useEffect(
    () => () => {
      if (baseTitleRef.current !== null) document.title = baseTitleRef.current
    },
    [],
  )
}
