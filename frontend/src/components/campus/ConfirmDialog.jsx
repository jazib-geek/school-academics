import { useEffect, useRef } from 'react'
import { Loader2 } from 'lucide-react'

/**
 * Tailwind confirm overlay used before destructive / batch campus actions.
 */
export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmClass = 'inline-flex items-center gap-2 rounded-lg bg-[var(--campus-primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[#364574] disabled:opacity-60',
  busy = false,
  icon = null,
  confirmAutoFocus = false,
  confirmOnEnter = false,
  onCancel,
  onConfirm,
}) {
  const onConfirmRef = useRef(onConfirm)
  const confirmButtonRef = useRef(null)
  onConfirmRef.current = onConfirm

  useEffect(() => {
    if (!open || !confirmOnEnter) return undefined
    let armed = false
    const arm = (event) => {
      if (event.key === 'Enter') armed = true
    }
    const onKeyDown = (event) => {
      if (event.key !== 'Enter' || busy) return
      event.preventDefault()
      event.stopPropagation()
      if (!armed || event.repeat) return
      onConfirmRef.current?.()
    }
    window.addEventListener('keyup', arm, true)
    window.addEventListener('keydown', onKeyDown, true)
    const focusId = requestAnimationFrame(() => confirmButtonRef.current?.focus())
    return () => {
      cancelAnimationFrame(focusId)
      window.removeEventListener('keyup', arm, true)
      window.removeEventListener('keydown', onKeyDown, true)
    }
  }, [open, confirmOnEnter, busy])

  if (!open) return null

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm"
      onClick={() => {
        if (!busy) onCancel?.()
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="campus-confirm-title"
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="px-5 pt-5">
          {icon ? (
            <div className="mb-3 grid h-11 w-11 place-items-center rounded-xl bg-amber-100 text-amber-700">
              {icon}
            </div>
          ) : null}
          <h3 id="campus-confirm-title" className="text-base font-semibold text-slate-900">
            {title}
          </h3>
          {description ? (
            <div className="mt-2 text-sm leading-6 text-slate-600">{description}</div>
          ) : null}
        </div>
        <div className="mt-5 flex items-center justify-end gap-2 bg-slate-50 px-5 py-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmButtonRef}
            type="button"
            onClick={onConfirm}
            disabled={busy}
            autoFocus={confirmAutoFocus && !confirmOnEnter}
            className={confirmClass}
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : null}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
