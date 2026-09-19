import { Children, cloneElement, isValidElement } from 'react'
import { ShieldOff } from 'lucide-react'
import CampusShell from './CampusShell.jsx'
import {
  hasAnyCampusPermission,
  hasCampusPermission,
} from '../../services/authService'

export const FORBIDDEN_ACCESS_MESSAGE = "You don't have access to this."

export function isPermissionAllowed({ permission, anyOf, allowed }) {
  if (typeof allowed === 'boolean') return allowed
  if (anyOf?.length) return hasAnyCampusPermission(...anyOf)
  if (permission) return hasCampusPermission(permission)
  return true
}

/**
 * Wraps a control (button/menu item). When denied, disables it and shows a tooltip
 * via a span wrapper (native title works on disabled controls when wrapped).
 */
export function PermissionControl({
  permission,
  anyOf,
  allowed,
  forbiddenTitle = FORBIDDEN_ACCESS_MESSAGE,
  className = '',
  children,
}) {
  const ok = isPermissionAllowed({ permission, anyOf, allowed })
  const child = Children.only(children)

  if (!isValidElement(child)) return children
  if (ok) return child

  const mergedClass = [child.props.className, 'disabled:cursor-not-allowed disabled:opacity-45']
    .filter(Boolean)
    .join(' ')

  return (
    <span className={`inline-flex max-w-full ${className}`.trim()} title={forbiddenTitle}>
      {cloneElement(child, {
        disabled: true,
        'aria-disabled': true,
        tabIndex: -1,
        className: mergedClass,
        onClick: (event) => {
          event.preventDefault()
          event.stopPropagation()
        },
      })}
    </span>
  )
}

/** Card/panel used inside a page when a listing/API area is forbidden. */
export function AccessForbiddenPanel({
  title = 'Access restricted',
  message = FORBIDDEN_ACCESS_MESSAGE,
  className = '',
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-6 py-16 text-center ${className}`.trim()}
      role="status"
    >
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-amber-100 text-amber-700">
        <ShieldOff size={28} strokeWidth={1.75} />
      </div>
      <div className="max-w-md space-y-1">
        <p className="text-base font-semibold text-slate-800">{title}</p>
        <p className="text-sm text-slate-500">{message}</p>
      </div>
    </div>
  )
}

/** Full-page denial inside the campus shell. */
export function CampusAccessDenied({
  title = 'Access restricted',
  message = "You don't have permission to open this page. Ask an administrator if you need access.",
}) {
  return (
    <CampusShell headerContext="Access">
      <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4 pt-[4.25rem] md:p-6 md:pt-[4.5rem]">
        <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white px-8 py-12 text-center shadow-sm">
          <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-2xl bg-amber-100 text-amber-700">
            <ShieldOff size={32} strokeWidth={1.75} />
          </div>
          <h1 className="text-xl font-bold text-slate-900">{title}</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">{message}</p>
        </div>
      </div>
    </CampusShell>
  )
}
