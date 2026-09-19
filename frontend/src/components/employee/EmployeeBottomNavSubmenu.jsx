import { useEffect, useRef, useState } from 'react'
import { ChevronRight } from 'lucide-react'

const SUBMENU_ANIM_MS = 280

/**
 * Material-style bottom sheet above the employee nav.
 * Optional `iconBadgeClass` tints the glyph; icon wells use shared primary-soft surface.
 */
function EmployeeBottomNavSubmenu({ open, title, items, onClose, onItemActivate }) {
  const panelRef = useRef(null)
  const [present, setPresent] = useState(false)
  const [entered, setEntered] = useState(false)

  useEffect(() => {
    let closeTimer
    let raf1
    let raf2

    if (open) {
      setPresent(true)
      raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => setEntered(true))
      })
      return () => {
        if (raf1 != null) cancelAnimationFrame(raf1)
        if (raf2 != null) cancelAnimationFrame(raf2)
        window.clearTimeout(closeTimer)
      }
    }

    setEntered(false)
    closeTimer = window.setTimeout(() => setPresent(false), SUBMENU_ANIM_MS)
    return () => window.clearTimeout(closeTimer)
  }, [open])

  useEffect(() => {
    if (!present) return

    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }

    const onPointerDown = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        onClose()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('touchstart', onPointerDown, { passive: true })
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('touchstart', onPointerDown)
    }
  }, [present, onClose])

  if (!present) return null

  const navClearance = 'calc(var(--emp-nav-height, 3.75rem) + env(safe-area-inset-bottom, 0px))'

  return (
    <div className="fixed inset-0 z-[45]" role="presentation" aria-hidden={!open}>
      <div
        className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ease-out ${
          entered ? 'opacity-100' : 'opacity-0'
        }`}
        aria-hidden
      />
      <div
        className="employee-app pointer-events-none absolute inset-x-0 top-0 bottom-0 mx-auto flex w-full max-w-screen-md flex-col justify-end"
        style={{ paddingBottom: navClearance }}
      >
        <div
          ref={panelRef}
          className={`emp-sheet-panel pointer-events-auto mx-auto w-full max-h-[min(85dvh,calc(100dvh-5rem))] overflow-hidden rounded-t-[1.5rem] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
            entered ? 'translate-y-0' : 'translate-y-full'
          }`}
          role="dialog"
          aria-modal="true"
          aria-label={title ? `${title} menu` : 'Navigation menu'}
        >
          <div className="flex justify-center pb-1 pt-3">
            <div className="h-1 w-10 shrink-0 rounded-full bg-[var(--emp-border-strong)]" aria-hidden />
          </div>

          {title ? (
            <h2 className="px-5 pb-2 pt-1 text-lg font-semibold leading-snug tracking-tight text-[var(--emp-text)]">
              {title}
            </h2>
          ) : null}

          <div
            className="mx-3 mb-2 overflow-hidden rounded-[var(--emp-radius-lg)] border border-[var(--emp-border)] bg-[var(--emp-surface)]"
            role="list"
          >
            {items.map((entry, index) => {
              const Icon = entry.icon
              const iconTint = entry.iconBadgeClass || 'text-[var(--emp-primary)]'
              const isLast = index === items.length - 1
              return (
                <button
                  key={entry.id}
                  type="button"
                  role="listitem"
                  className={`emp-sheet-row flex w-full items-center gap-3 px-3.5 py-3 text-left ${
                    !isLast ? 'border-b border-[var(--emp-border)]' : ''
                  }`}
                  onClick={() => onItemActivate?.(entry)}
                >
                  <span className="emp-sheet-icon shrink-0">
                    <Icon size={20} strokeWidth={2} className={iconTint} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[0.9375rem] font-semibold leading-tight text-[var(--emp-text)]">
                      {entry.label}
                    </span>
                    {entry.description ? (
                      <span className="mt-0.5 block text-xs leading-snug text-[var(--emp-text-muted)]">
                        {entry.description}
                      </span>
                    ) : null}
                  </span>
                  <ChevronRight
                    className="h-5 w-5 shrink-0 text-[var(--emp-text-muted)]"
                    strokeWidth={2}
                    aria-hidden
                  />
                </button>
              )
            })}
          </div>

          <div
            className="px-3 pt-1"
            style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))' }}
          >
            <button
              type="button"
              className="emp-cta-btn emp-cta-btn-outline h-12 w-full rounded-full text-sm font-semibold"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default EmployeeBottomNavSubmenu
