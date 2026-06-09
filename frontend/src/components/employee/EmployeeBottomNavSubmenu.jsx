import { useEffect, useRef, useState } from 'react'
import { ChevronRight } from 'lucide-react'

const SUBMENU_ANIM_MS = 320

/**
 * Material-style bottom sheet above the employee nav. Pass `items` with optional `path`
 * and/or `onSelect`; parent can close via `onClose` after navigation.
 * Optional `iconBadgeClass` should be **text-* only** (icon glyph color); tiles use a shared soft-blue surface.
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

  const navClearance = 'calc(3.75rem + env(safe-area-inset-bottom, 0px))'

  return (
    <div
      className="fixed inset-0 z-[45]"
      role="presentation"
      aria-hidden={!open}
    >
      <div
        className={`absolute inset-0 bg-slate-950/35 transition-opacity duration-300 ease-out ${
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
          className={`pointer-events-auto mx-auto w-full max-h-[min(85dvh,calc(100dvh-5rem))] overflow-hidden rounded-t-[28px] bg-neutral-50 shadow-[0_-2px_8px_rgba(0,0,0,0.08),0_-12px_32px_rgba(0,0,0,0.14)] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
            entered ? 'translate-y-0' : 'translate-y-full'
          }`}
          role="dialog"
          aria-modal="true"
          aria-label={title ? `${title} menu` : 'Navigation menu'}
        >
          {/* Drag handle — Material bottom sheet affordance */}
          <div className="flex justify-center pt-3 pb-1">
            <div
              className="h-1 w-10 shrink-0 rounded-full bg-slate-400/55"
              aria-hidden
            />
          </div>

          {title ? (
            <h2 className="px-5 pb-3 pt-1 text-[1.125rem] font-medium leading-snug tracking-tight text-slate-900">
              {title}
            </h2>
          ) : null}

          <div
            className="mx-3 mb-2 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm"
            role="list"
          >
            {items.map((entry, index) => {
              const Icon = entry.icon
              const accent =
                entry.tileTopBorderClass || 'border-t-[3px] border-t-indigo-500'
              const iconTint = entry.iconBadgeClass || 'text-indigo-700'
              const isLast = index === items.length - 1
              return (
                <button
                  key={entry.id}
                  type="button"
                  role="listitem"
                  className={`flex w-full min-h-[3.25rem] items-center gap-3.5 px-3.5 py-3.5 text-left transition-colors active:bg-slate-100/90 motion-reduce:transition-none ${
                    !isLast ? 'border-b border-slate-100' : ''
                  }`}
                  onClick={() => onItemActivate?.(entry)}
                >
                  <span
                    className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-sky-200/55 bg-gradient-to-br from-sky-100/95 to-blue-50/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] ${accent}`}
                  >
                    <Icon size={22} strokeWidth={2} className={`shrink-0 ${iconTint}`} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[0.9375rem] font-medium leading-tight text-slate-900">
                      {entry.label}
                    </span>
                    {entry.description ? (
                      <span className="mt-0.5 block text-xs leading-snug text-slate-500">
                        {entry.description}
                      </span>
                    ) : null}
                  </span>
                  <ChevronRight
                    className="h-5 w-5 shrink-0 text-slate-400"
                    strokeWidth={2}
                    aria-hidden
                  />
                </button>
              )
            })}
          </div>

          <div
            className="px-3 pt-2"
            style={{ paddingBottom: 'max(0.65rem, env(safe-area-inset-bottom, 0px))' }}
          >
            <button
              type="button"
              className="w-full rounded-2xl border border-sky-200/70 bg-gradient-to-b from-sky-100 to-sky-200/75 py-3.5 text-sm font-semibold text-sky-950 shadow-sm transition active:scale-[0.99] active:from-sky-200 active:to-sky-300/80"
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
