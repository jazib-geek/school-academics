/**
 * User-facing paper version name (QuestionPaper.PaperName).
 * Trim and collapse whitespace; comparisons are case-insensitive.
 */
export function normalizePaperName(value) {
  if (value == null) return ''
  return String(value).trim().replace(/\s+/g, ' ')
}

export function paperNamesMatch(a, b) {
  const left = normalizePaperName(a)
  const right = normalizePaperName(b)
  if (!left || !right) return false
  return left.toLowerCase() === right.toLowerCase()
}
