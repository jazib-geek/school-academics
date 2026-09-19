import { forwardRef, useEffect, useRef } from 'react'
import Select from 'react-select'
import AsyncSelect from 'react-select/async'

const SELECT_ACTIONS = new Set([
  'select-option',
  'clear',
  'create-option',
  'deselect-option',
  'pop-value',
  'remove-value',
  'set-value',
])

function blurFocusedField() {
  const active = document.activeElement
  if (!(active instanceof HTMLElement)) return
  if (active.tagName !== 'INPUT' && active.tagName !== 'TEXTAREA' && active.tagName !== 'SELECT') return
  active.blur()
}

/** iOS ignores blur() inside react-select's preventDefault mousedown; delay until after that gesture. */
export function dismissEmployeeKeyboard(selectInstance) {
  const run = () => {
    selectInstance?.blur?.()
    blurFocusedField()
  }
  run()
  requestAnimationFrame(run)
  window.setTimeout(run, 50)
  window.setTimeout(run, 160)
}

function assignRef(ref, value) {
  if (typeof ref === 'function') ref(value)
  else if (ref) ref.current = value
}

function withDismissKeyboard(SelectComponent) {
  const Wrapped = forwardRef(function EmployeeSelectComponent(
    { onChange, blurInputOnSelect = true, ...props },
    ref,
  ) {
    const innerRef = useRef(null)

    return (
      <SelectComponent
        {...props}
        ref={(node) => {
          innerRef.current = node
          assignRef(ref, node)
        }}
        blurInputOnSelect={blurInputOnSelect}
        onChange={(value, meta) => {
          onChange?.(value, meta)
          if (!meta?.action || SELECT_ACTIONS.has(meta.action)) {
            dismissEmployeeKeyboard(innerRef.current)
          }
        }}
      />
    )
  })

  Wrapped.displayName = SelectComponent.displayName || SelectComponent.name || 'EmployeeSelect'

  return Wrapped
}

export const EmployeeSelect = withDismissKeyboard(Select)
export const EmployeeAsyncSelect = withDismissKeyboard(AsyncSelect)

/** Native `<select>`: drop the picker/keypad after a value is chosen. */
export function useEmployeeDismissKeyboard() {
  useEffect(() => {
    const onChange = (event) => {
      const target = event.target
      if (!(target instanceof HTMLSelectElement)) return
      if (!target.closest('.employee-app')) return
      const run = () => target.blur()
      run()
      window.setTimeout(run, 50)
    }

    document.addEventListener('change', onChange, true)
    return () => document.removeEventListener('change', onChange, true)
  }, [])
}
