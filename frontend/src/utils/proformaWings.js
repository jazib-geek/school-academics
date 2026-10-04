/** Stable wing codes (match backend ProformaWingCode enum names). */
export const PROFORMA_WINGS = [
  { value: 'Junior', label: 'Junior' },
  { value: 'Primary', label: 'Primary' },
  { value: 'High', label: 'High' },
  { value: 'HighBoys', label: 'High Boys' },
  { value: 'HighGirls', label: 'High Girls' },
  { value: 'PrimaryHigh', label: 'Primary + High' },
  { value: 'JuniorPrimary', label: 'Junior + Primary' },
]

export const DEFAULT_MOCK_COORDINATOR_WING = 'PrimaryHigh'

export function proformaWingLabel(code) {
  if (!code) return ''
  return PROFORMA_WINGS.find((wing) => wing.value === code)?.label || code
}
