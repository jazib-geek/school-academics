const SUBJECT_ORDER = [
  ['eng', 'english'],
  ['urdu'],
  ['math', 'maths', 'mathematics'],
  ['isl', 'islamiyat', 'islamic studies', 'islamic study'],
  ['science', 'sci'],
  ['physics', 'phy'],
  ['chemistry', 'chem'],
  ['bio', 'biology'],
]

const subjectRank = new Map(
  SUBJECT_ORDER.flatMap((aliases, index) => aliases.map((alias) => [alias, index + 1])),
)

const normalizeSubjectName = (name) =>
  `${name ?? ''}`
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

export const resolveSubjectLabel = (row, subjectNameKey = 'subjectName') =>
  `${row?.[subjectNameKey] ?? row?.SubjectName ?? row?.shortName ?? row?.ShortName ?? row?.subject ?? ''}`.trim()

export const getSubjectRank = (subjectName) => {
  const normalized = normalizeSubjectName(subjectName)
  if (!normalized) return Number.MAX_SAFE_INTEGER

  for (const [alias, rank] of subjectRank.entries()) {
    if (normalized === alias || normalized.startsWith(`${alias} `)) return rank
  }

  return Number.MAX_SAFE_INTEGER
}

export const sortSubjectsByCustomOrder = (subjects = [], subjectNameKey = 'subjectName') =>
  [...subjects].sort((a, b) => {
    const aName = resolveSubjectLabel(a, subjectNameKey)
    const bName = resolveSubjectLabel(b, subjectNameKey)

    const aRank = getSubjectRank(aName)
    const bRank = getSubjectRank(bName)

    if (aRank !== bRank) return aRank - bRank

    return aName.localeCompare(bName, undefined, { numeric: true, sensitivity: 'base' })
  })
