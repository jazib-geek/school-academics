const URDU_FONT_STACK =
  '"Jameel Noori Nastaleeq Web", "Jameel Noori Nastaleeq", "Jameel Noori Nastaleeq Regular", "Jameel Noori Nastaleeq Kasheeda", "Jameel Noori", "Noto Nastaliq Urdu", "Noto Naskh Arabic", serif'

export function containsUrduText(value) {
  return /[\u0600-\u06ff]/.test(`${value ?? ''}`)
}

export function urduPaperTextStyle(...values) {
  const useUrdu = values.some((value) => containsUrduText(value))
  if (!useUrdu) return undefined
  return { fontFamily: URDU_FONT_STACK, lineHeight: 1.65 }
}

export function formatLanguagePartLabel(index) {
  const safe = Math.max(0, Number(index) || 0)
  return String.fromCharCode(97 + (safe % 26))
}
