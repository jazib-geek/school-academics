import { useCallback, useEffect, useRef } from 'react'
import { useBeforeUnload, useNavigate } from 'react-router-dom'

const EXAM_MAKER_PATH = '/academics/settings/exam-maker-compact'

function resolveInAppPath(rawHref) {
  if (!rawHref) return ''
  if (rawHref.startsWith('#/')) return rawHref.slice(1)
  if (rawHref.startsWith('/')) return rawHref
  try {
    const url = new URL(rawHref, window.location.href)
    if (url.origin !== window.location.origin) return ''
    if (url.hash.startsWith('#/')) return url.hash.slice(1)
  } catch {
    return ''
  }
  return ''
}

function currentInAppPath() {
  if (window.location.hash.startsWith('#/')) return window.location.hash.slice(1)
  return window.location.pathname
}

/**
 * Blocks in-app link navigation and tab close/refresh when the exam workspace has unsaved edits.
 * (HashRouter is not a data router, so useBlocker is unavailable.)
 */
export function useExamMakerUnsavedGuard({ enabled, onNavigationBlocked }) {
  const navigate = useNavigate()
  const allowNavigationRef = useRef(false)

  useBeforeUnload(
    useCallback(
      (event) => {
        if (!enabled || allowNavigationRef.current) return
        event.preventDefault()
      },
      [enabled],
    ),
  )

  useEffect(() => {
    if (!enabled) return undefined

    const onClickCapture = (event) => {
      if (allowNavigationRef.current) return
      const anchor = event.target?.closest?.('a[href]')
      if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download')) return

      const targetPath = resolveInAppPath(anchor.getAttribute('href') || '')
      if (!targetPath || targetPath === currentInAppPath()) return
      if (targetPath === EXAM_MAKER_PATH) return

      event.preventDefault()
      event.stopPropagation()
      onNavigationBlocked(targetPath)
    }

    document.addEventListener('click', onClickCapture, true)
    return () => document.removeEventListener('click', onClickCapture, true)
  }, [enabled, onNavigationBlocked])

  const proceedRouteNavigation = useCallback(
    (path) => {
      if (!path) return
      allowNavigationRef.current = true
      navigate(path)
      window.setTimeout(() => {
        allowNavigationRef.current = false
      }, 0)
    },
    [navigate],
  )

  return { proceedRouteNavigation, allowNavigationRef }
}
