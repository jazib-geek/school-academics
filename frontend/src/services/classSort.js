/** School display order: Playgroup → Nursery → Prep → One … Ten → Hifz. */
const GRADE_ORDER = [
  'playgroup',
  'nursery',
  'prep',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'hifz',
]

const gradeRank = new Map(GRADE_ORDER.map((g, i) => [g, i + 1]))

const normalizeClassName = (name) =>
  `${name ?? ''}`
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')

/** Read label from API row (camelCase or PascalCase). */
export const resolveClassLabel = (row, classNameKey = 'className') =>
  `${row?.[classNameKey] ?? row?.ClassName ?? row?.class ?? ''}`.trim()

/**
 * Grade rank for sorting. Matches leading grade token and "Hifz …" program rows.
 */
export const getClassGradeRank = (className) => {
  const n = normalizeClassName(className)
  if (!n) return Number.MAX_SAFE_INTEGER

  if (/^hifz\b/.test(n)) return gradeRank.get('hifz')

  if (/^play\s*group\b/.test(n) || /^pg\b/.test(n)) return gradeRank.get('playgroup')

  for (const grade of GRADE_ORDER) {
    if (grade === 'hifz') continue
    const re = new RegExp(`^${grade}(?:\\s*\\(|\\s|-|$)`, 'i')
    if (re.test(n)) return gradeRank.get(grade)
  }

  return Number.MAX_SAFE_INTEGER
}

export const sortClassesByCustomOrder = (classes = [], classNameKey = 'className') =>
  [...classes].sort((a, b) => {
    const aName = resolveClassLabel(a, classNameKey)
    const bName = resolveClassLabel(b, classNameKey)

    const aRank = getClassGradeRank(aName)
    const bRank = getClassGradeRank(bName)

    if (aRank !== bRank) return aRank - bRank

    return aName.localeCompare(bName, undefined, { numeric: true, sensitivity: 'base' })
  })
