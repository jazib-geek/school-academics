/**
 * Text inputs for numeric values (avoid type="number" — mouse wheel changes values).
 */

export function sanitizeIntegerInput(raw) {
  if (raw == null || raw === '') return ''
  return String(raw).replace(/\D/g, '')
}

/**
 * Digits with optional single decimal point; limits fraction length when maxFractionDigits is set.
 */
export function sanitizeDecimalInput(raw, maxFractionDigits = 4) {
  if (raw == null || raw === '') return ''
  let s = String(raw).replace(/[^\d.]/g, '')
  const dotIndex = s.indexOf('.')
  if (dotIndex !== -1) {
    s = `${s.slice(0, dotIndex + 1)}${s.slice(dotIndex + 1).replace(/\./g, '')}`
  }
  if (maxFractionDigits != null && dotIndex !== -1) {
    const [whole, fraction = ''] = s.split('.')
    return `${whole}.${fraction.slice(0, maxFractionDigits)}`
  }
  return s
}

export const INTEGER_INPUT_ATTRS = {
  type: 'text',
  inputMode: 'numeric',
  pattern: '[0-9]*',
  autoComplete: 'off',
}

export const DECIMAL_INPUT_ATTRS = {
  type: 'text',
  inputMode: 'decimal',
  autoComplete: 'off',
}

/** Use in onChange: setValue(readIntegerInput(event)) */
export function readIntegerInput(event) {
  return sanitizeIntegerInput(event.target.value)
}

/** Use in onChange: setValue(readDecimalInput(event)) */
export function readDecimalInput(event, maxFractionDigits = 4) {
  return sanitizeDecimalInput(event.target.value, maxFractionDigits)
}

/**
 * For shared form handlers: pass event through with sanitized target.value.
 */
export function withIntegerInputValue(event) {
  const value = sanitizeIntegerInput(event.target.value)
  return { ...event, target: { ...event.target, value } }
}

export function withDecimalInputValue(event, maxFractionDigits = 4) {
  const value = sanitizeDecimalInput(event.target.value, maxFractionDigits)
  return { ...event, target: { ...event.target, value } }
}
