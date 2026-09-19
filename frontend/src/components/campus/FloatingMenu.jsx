import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

/**
 * Anchored dropdown rendered in a portal so it is not clipped by
 * overflow:auto / overflow:hidden table cards.
 */
export default function FloatingMenu({
  open,
  anchorEl,
  onClose,
  children,
  className = '',
  preferredWidth = 176,
  align = 'right',
  zIndex = 70,
}) {
  const menuRef = useRef(null)
  const [coords, setCoords] = useState({ top: 0, left: 0, ready: false })

  useLayoutEffect(() => {
    if (!open || !anchorEl) {
      setCoords((prev) => (prev.ready ? { top: 0, left: 0, ready: false } : prev))
      return
    }

    const updatePosition = () => {
      if (!anchorEl) return
      const rect = anchorEl.getBoundingClientRect()
      const menuEl = menuRef.current
      const menuHeight = menuEl?.offsetHeight || 220
      const menuWidth = menuEl?.offsetWidth || preferredWidth
      const gap = 4
      const spaceBelow = window.innerHeight - rect.bottom
      const openUpward = spaceBelow < menuHeight + gap && rect.top > spaceBelow
      const top = openUpward
        ? Math.max(8, rect.top - menuHeight - gap)
        : Math.min(window.innerHeight - menuHeight - 8, rect.bottom + gap)
      let left =
        align === 'right' ? rect.right - menuWidth : rect.left
      left = Math.max(8, Math.min(left, window.innerWidth - menuWidth - 8))
      setCoords({ top, left, ready: true })
    }

    updatePosition()
    // Re-measure after paint once menu size is known
    const rafId = window.requestAnimationFrame(updatePosition)
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      window.cancelAnimationFrame(rafId)
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [open, anchorEl, preferredWidth, align, children])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event) => {
      const target = event.target
      if (menuRef.current?.contains(target)) return
      if (anchorEl?.contains?.(target)) return
      onClose?.()
    }
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.()
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, anchorEl, onClose])

  if (!open || !anchorEl || typeof document === 'undefined') return null

  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      className={className}
      style={{
        position: 'fixed',
        top: coords.top,
        left: coords.left,
        zIndex,
        visibility: coords.ready ? 'visible' : 'hidden',
      }}
    >
      {children}
    </div>,
    document.body,
  )
}
