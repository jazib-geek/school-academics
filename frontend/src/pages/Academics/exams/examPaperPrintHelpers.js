/** @typedef {'roman' | 'numeric' | 'alpha'} SubQuestionNumberingStyle */

const ROMAN_LOWER = [
  'i',
  'ii',
  'iii',
  'iv',
  'v',
  'vi',
  'vii',
  'viii',
  'ix',
  'x',
  'xi',
  'xii',
  'xiii',
  'xiv',
  'xv',
]

export function toRoman(value) {
  return ROMAN_LOWER[value - 1] || `${value}`
}

const ROMAN_UPPER = [
  'I',
  'II',
  'III',
  'IV',
  'V',
  'VI',
  'VII',
  'VIII',
  'IX',
  'X',
  'XI',
  'XII',
  'XIII',
  'XIV',
  'XV',
]

/** @param {number} value */
export function toRomanUpper(value) {
  const n = Number(value)
  if (!Number.isFinite(n) || n < 1) return `${value}`
  return ROMAN_UPPER[n - 1] || `${n}`
}

/**
 * @param {string} sectionKey
 */
export function formatSectionRomanLabel(sectionKey) {
  const match = `${sectionKey || ''}`.trim().match(/^Q(\d+)$/i)
  if (match) return `Section ${toRomanUpper(Number(match[1]))}`
  const key = `${sectionKey || ''}`.trim()
  return key || 'Section'
}

/** Printed section label matching reference layout (e.g. Section-I). */
export function formatSectionReferenceLabel(sectionKey) {
  const match = `${sectionKey || ''}`.trim().match(/^Q(\d+)$/i)
  if (match) return `Section-${toRomanUpper(Number(match[1]))}`
  const key = `${sectionKey || ''}`.trim()
  return key || 'Section'
}

/** @param {unknown} value */
export function normalizeSubQuestionNumbering(value) {
  const v = `${value || ''}`.trim().toLowerCase()
  if (v === 'numeric' || v === 'number' || v === 'decimal') return 'numeric'
  if (v === 'alpha' || v === 'alphabetic' || v === 'letter' || v === 'letters') return 'alpha'
  return 'roman'
}

/**
 * @param {unknown} style
 * @param {number} indexOneBased
 */
export function formatSubQuestionLabel(style, indexOneBased) {
  const s = normalizeSubQuestionNumbering(style)
  const n = Number(indexOneBased)
  if (!Number.isFinite(n) || n < 1) return '?.'
  if (s === 'numeric') return `${n}.`
  if (s === 'alpha') {
    if (n <= 26) return `${String.fromCharCode(96 + n)}.`
    return `${n}.`
  }
  return `${toRoman(n)}.`
}

/**
 * @param {unknown} marks
 * @param {boolean} wrapInParentheses
 */
export function formatIndividualMarks(marks, wrapInParentheses) {
  const m = marks == null || marks === '' ? '' : String(marks)
  if (!m) return ''
  if (wrapInParentheses) return `(${m})`
  return m
}

/**
 * SAQ/LAQ sections only — MCQ blocks optional mode.
 * Empty/missing type counts as eligible when the paper already renders non-MCQ rows.
 * @param {Array<{ type?: string }>} questions
 */
export function sectionSupportsOptionalQuestions(questions = []) {
  if (questions.length < 2) return false
  return questions.every((item) => {
    const type = `${item?.type || ''}`.trim().toLowerCase()
    if (type === 'mcq') return false
    if (type === 'saq' || type === 'laq' || type === 'numerical') return true
    return true
  })
}

/**
 * @param {number} totalCount
 * @param {number | null | undefined} attemptCount
 */
export function clampOptionalAttemptCount(totalCount, attemptCount) {
  const total = Number(totalCount)
  if (!Number.isFinite(total) || total < 2) return Math.max(1, total || 1)
  const raw = Number(attemptCount)
  const preferred = Number.isFinite(raw) && raw > 0 ? raw : Math.max(1, total - 1)
  return Math.min(Math.max(1, preferred), total - 1)
}

/**
 * @param {number} attemptCount
 */
const COUNT_WORDS = [
  'zero',
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
]

/** @param {number} value */
export function formatCountWord(value) {
  const n = Number(value)
  if (Number.isFinite(n) && n >= 0 && n < COUNT_WORDS.length) return COUNT_WORDS[n]
  return `${n}`
}

/**
 * Reference SAQ line: "(Any five)" — legacy; prefer formatOptionalAttemptSentence.
 * @param {number} attemptCount
 */
export function formatOptionalAnyParenthetical(attemptCount) {
  const count = Number(attemptCount)
  if (!Number.isFinite(count) || count < 1) return ''
  return `(Any ${formatCountWord(count)})`
}

/**
 * Printed optional instruction, e.g. "Attempt any two questions."
 * @param {number} attemptCount
 */
export function formatOptionalAttemptSentence(attemptCount) {
  const count = Number(attemptCount)
  if (!Number.isFinite(count) || count < 1) return 'Attempt any questions.'
  return `Attempt any ${formatCountWord(count)} question${count === 1 ? '' : 's'}.`
}

/**
 * Reference LAQ section note: "Note: Attempt any two questions."
 * @param {number} attemptCount
 */
export function formatLaqSectionNoteLine(attemptCount) {
  const count = Number(attemptCount)
  if (!Number.isFinite(count) || count < 1) return 'Note: Attempt any questions.'
  return `Note: Attempt any ${formatCountWord(count)} question${count === 1 ? '' : 's'}.`
}

/** @param {number} attemptCount */
export function formatOptionalQuestionsInstruction(attemptCount) {
  return formatLaqSectionNoteLine(attemptCount).replace(/^Note:\s*/i, '')
}

/**
 * @param {string} sectionKey
 * @returns {number}
 */
export function sectionKeyToQuestionNumber(sectionKey) {
  const match = `${sectionKey || ''}`.trim().match(/^Q(\d+)$/i)
  return match ? Number(match[1]) : 0
}

/**
 * Printed label for a single LAQ row (Q2, Q3, …). Starts at the section number.
 * @param {string} sectionKey
 * @param {number} indexInSection — 0-based index within the LAQ section
 */
export function formatLaqQuestionLabel(sectionKey, indexInSection) {
  const sectionNum = sectionKeyToQuestionNumber(sectionKey)
  const base = sectionNum > 0 ? sectionNum : 1
  const offset = Number(indexInSection) || 0
  return `Q${base + offset}`
}

import { isSubjectiveExamType } from './examMakerExamTypes'

export { isObjectiveExamType, isSubjectiveExamType } from './examMakerExamTypes'

/**
 * @param {Array<{ type?: string }>} questions
 * @returns {'mcq' | 'saq' | 'laq' | 'mixed'}
 */
export function inferSectionDisplayMode(questions = []) {
  const types = questions
    .map((item) => `${item?.type || ''}`.trim().toLowerCase())
    .filter((value) => value.length > 0)
  if (!types.length) return 'saq'
  if (types.every((value) => value === 'mcq')) return 'mcq'
  // Numerical uses the same long-form paper layout as LAQ.
  if (types.every((value) => value === 'laq' || value === 'numerical')) return 'laq'
  if (types.every((value) => value !== 'mcq')) return 'saq'
  return 'mixed'
}

/**
 * @param {string} sectionKey
 * @param {unknown} examType
 * @param {'mcq' | 'saq' | 'laq' | 'mixed'} mode
 */
export function defaultSectionHeading(sectionKey, examType, mode) {
  const key = `${sectionKey || 'Q1'}`.trim() || 'Q1'
  if (!isSubjectiveExamType(examType) || mode === 'mcq') {
    return `${key}: Choose correct option:`
  }
  if (mode === 'laq') {
    return 'Note: Attempt following questions.'
  }
  return `${key}: Write short answers of following questions.`
}

/**
 * @param {unknown} examType
 * @param {'mcq' | 'saq' | 'laq' | 'mixed'} mode
 */
export function defaultSectionInstruction(examType, mode) {
  if (mode === 'mcq') {
    return ''
  }
  if (isSubjectiveExamType(examType) && (mode === 'saq' || mode === 'laq')) {
    return ''
  }
  return 'Attempt the following questions.'
}

/**
 * Banner above a section when "Show section names" is enabled.
 * Uses custom sectionName when set; otherwise "Section N" for Qn keys.
 *
 * @param {string} sectionKey
 * @param {unknown} sectionName
 */
export function resolveSectionBannerLabel(sectionKey, sectionName) {
  const custom = `${sectionName ?? ''}`.trim()
  if (custom) return custom
  return formatSectionReferenceLabel(sectionKey)
}

/** Strip optional attempt phrasing from a stored heading line. */
export function stripOptionalFromHeadingText(headingText) {
  return `${headingText || ''}`
    .replace(/\s*\(Any\s+[^)]+\)\s*$/i, '')
    .replace(/\s*Attempt any(?: \w+)? questions?\.\s*$/i, '')
    .trim()
}

/**
 * @param {unknown} examType
 * @param {'mcq' | 'saq' | 'laq' | 'mixed'} mode
 */
export function defaultSectionHeadingBody(examType, mode) {
  if (!isSubjectiveExamType(examType) || mode === 'mcq') return 'Choose correct option:'
  if (mode === 'laq') return 'Attempt following questions.'
  return 'Write short answers of following questions.'
}

/**
 * @param {string} sectionKey
 * @param {string} headingText
 */
export function parseSectionHeadingPrefix(sectionKey, headingText) {
  const cleaned = stripOptionalFromHeadingText(headingText)
  const match = cleaned.match(/^(Q\d+:)/i)
  if (match) return match[1]
  const key = `${sectionKey || 'Q1'}`.trim() || 'Q1'
  return `${key}:`
}

/**
 * Printed section main heading: bold "Qn:" + body. Optional mode shows only the attempt line.
 *
 * @param {object} options
 * @param {string} options.sectionKey
 * @param {string} options.headingText
 * @param {unknown} options.examType
 * @param {'mcq' | 'saq' | 'laq' | 'mixed'} options.mode
 * @param {boolean} options.optionalActive
 * @param {number|null} options.optionalAttempt
 */
/**
 * @param {string} headingText
 */
export function resolveLaqHeadingBody(headingText) {
  let body = stripOptionalFromHeadingText(headingText)
  body = body.replace(/^Q\d+:\s*/i, '').replace(/^Note:\s*/i, '').trim()
  if (!body || /^Attempt following questions\.?$/i.test(body)) {
    return 'Attempt following questions.'
  }
  return body
}

export function resolveSectionHeadingDisplay({
  sectionKey,
  headingText,
  examType,
  mode,
  optionalActive,
  optionalAttempt,
}) {
  if (mode === 'laq') {
    return {
      prefix: 'Note:',
      body: optionalActive
        ? formatOptionalAttemptSentence(optionalAttempt)
        : resolveLaqHeadingBody(headingText),
    }
  }

  const prefix = parseSectionHeadingPrefix(sectionKey, headingText)

  if (optionalActive && mode === 'saq') {
    return {
      prefix,
      body: formatOptionalAttemptSentence(optionalAttempt),
    }
  }

  const cleaned = stripOptionalFromHeadingText(headingText)
  const bodyMatch = cleaned.match(/^Q\d+:\s*(.*)$/i)
  let body = bodyMatch ? `${bodyMatch[1] || ''}`.trim() : cleaned
  if (!body) body = defaultSectionHeadingBody(examType, mode)
  return { prefix, body }
}

/**
 * @param {string} headingText
 * @param {number} attemptCount
 * @deprecated Prefer resolveSectionHeadingDisplay — kept for stored heading text updates.
 */
export function appendOptionalToSaqHeading(headingText, attemptCount) {
  const cleaned = stripOptionalFromHeadingText(headingText)
  if (/^Note:\s*/i.test(cleaned) || /^Attempt following questions/i.test(resolveLaqHeadingBody(headingText))) {
    return formatLaqSectionNoteLine(attemptCount)
  }
  const prefix = parseSectionHeadingPrefix('', headingText)
  return `${prefix} ${formatOptionalAttemptSentence(attemptCount)}`.trim()
}

/**
 * LAQ sections: uniform marks → summary on heading (e.g. 8x4=32); mixed marks → per-question only.
 *
 * @param {Array<{ marks?: number }>} questions
 * @param {{ attemptCount?: number | null }} [options]
 */
export function resolveSectionMarksPresentation(questions = [], options = {}) {
  if (!questions.length) {
    return {
      allSame: true,
      showSectionMarksOnHeading: false,
      showPerQuestionMarks: false,
      marksText: '0',
    }
  }

  const marks = questions.map((item) => Number(item.marks || 0))
  const allSame = marks.length > 0 && marks.every((value) => value === marks[0])

  if (allSame) {
    return {
      allSame: true,
      showSectionMarksOnHeading: true,
      showPerQuestionMarks: false,
      marksText: inferSectionMarksDisplay(questions, options),
    }
  }

  return {
    allSame: false,
    showSectionMarksOnHeading: false,
    showPerQuestionMarks: true,
    marksText: '',
  }
}

/**
 * Exam title line for print (ordinal superscripts: 1st, 2nd, 9th).
 * Returns safe HTML for dangerouslySetInnerHTML.
 * @param {unknown} title
 */
export function formatExamTitleForPrint(title) {
  const text = `${title || ''}`.trim()
  if (!text) return ''
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
  return escaped.replace(/\b(\d+)(st|nd|rd|th)\b/gi, (_, digits, ordinal) => {
    return `${digits}<sup>${`${ordinal}`.toLowerCase()}</sup>`
  })
}

/**
 * @param {unknown} minutes
 */
export function formatExamDurationLabel(minutes) {
  const total = Number(minutes)
  if (!Number.isFinite(total) || total <= 0) return '0 Minutes'
  if (total < 60) return `${total} Minutes`
  const hours = Math.floor(total / 60)
  const mins = total % 60
  return `${hours}:${String(mins).padStart(2, '0')} Minutes`
}

/**
 * @param {unknown} descriptionText
 * @param {number} totalMarks
 */
/**
 * @param {object} section
 * @param {Array<{ marks?: number, type?: string }>} previewRows
 * @param {unknown} examType
 */
export function buildSectionConfigWithOptional(section, previewRows, examType) {
  const attemptCount = clampOptionalAttemptCount(previewRows.length, section.optionalQuestionsAttemptCount)
  const mode = inferSectionDisplayMode(previewRows)
  const marksDisplayText = inferSectionMarksDisplay(previewRows, { attemptCount })
  const baseHeading =
    stripOptionalFromHeadingText(section.headingText) ||
    defaultSectionHeading(section.sectionKey, examType, mode)

  if (mode === 'laq') {
    return {
      ...section,
      optionalQuestionsEnabled: true,
      optionalQuestionsAttemptCount: attemptCount,
      headingText: formatLaqSectionNoteLine(attemptCount),
      instructionText: '',
      marksDisplayText,
    }
  }

  return {
    ...section,
    optionalQuestionsEnabled: true,
    optionalQuestionsAttemptCount: attemptCount,
    headingText: appendOptionalToSaqHeading(baseHeading, attemptCount),
    instructionText: '',
    marksDisplayText,
  }
}

/**
 * @param {object} section
 * @param {Array<{ marks?: number, type?: string }>} previewRows
 * @param {unknown} examType
 */
export function clearSectionOptionalConfig(section, previewRows, examType) {
  const mode = inferSectionDisplayMode(previewRows)
  const cleanedHeading = stripOptionalFromHeadingText(section.headingText)
  const optionalGeneratedHeading =
    /Attempt any/i.test(`${section.headingText || ''}`) ||
    /^Q\d+:\s*$/i.test(cleanedHeading) ||
    /^Q\d+:\s*Note:\s*$/i.test(cleanedHeading) ||
    /^Note:\s*$/i.test(cleanedHeading)
  const baseHeading =
    optionalGeneratedHeading || !cleanedHeading
      ? defaultSectionHeading(section.sectionKey, examType, mode)
      : cleanedHeading
  return {
    ...section,
    optionalQuestionsEnabled: false,
    optionalQuestionsAttemptCount: null,
    headingText: baseHeading,
    instructionText: defaultSectionInstruction(examType, mode),
    marksDisplayText: inferSectionMarksDisplay(previewRows),
  }
}

export function parseLaqParts(descriptionText, totalMarks = 0) {
  const text = `${descriptionText || ''}`.trim()
  if (!text) return []

  const matches = [...text.matchAll(/\(([a-z])\)\s*/gi)]
  if (matches.length < 2) {
    return [{ label: '', text, marks: Number(totalMarks) || 0 }]
  }

  const parts = matches.map((match, index) => {
    const start = (match.index ?? 0) + match[0].length
    const end = index + 1 < matches.length ? matches[index + 1].index ?? text.length : text.length
    return {
      label: match[1].toLowerCase(),
      text: text.slice(start, end).trim(),
      marks: 0,
    }
  })

  const marks = Number(totalMarks) || 0
  if (marks > 0 && parts.length > 0) {
    if (parts.length === 2 && marks % 2 === 1) {
      parts[0].marks = Math.ceil(marks / 2)
      parts[1].marks = marks - parts[0].marks
    } else {
      const base = Math.floor(marks / parts.length)
      let remainder = marks - base * parts.length
      parts.forEach((part) => {
        part.marks = base + (remainder > 0 ? 1 : 0)
        if (remainder > 0) remainder -= 1
      })
    }
  }

  return parts
}

/**
 * @param {Array<{ marks?: number }>} questions
 * @param {{ attemptCount?: number | null }} [options]
 */
export function inferSectionMarksDisplay(questions = [], options = {}) {
  if (!questions.length) return '0'
  const marks = questions.map((item) => Number(item.marks || 0)).filter((value) => Number.isFinite(value))
  if (!marks.length) return '0'

  const totalQuestions = questions.length
  const rawAttempt = options.attemptCount
  const useOptional =
    rawAttempt != null && Number.isFinite(Number(rawAttempt)) && Number(rawAttempt) > 0 && Number(rawAttempt) < totalQuestions
  const count = useOptional ? Number(rawAttempt) : totalQuestions

  const first = marks[0]
  const allSame = marks.every((value) => value === first)
  if (allSame) {
    const attemptTotal = first * count
    return `${first}x${count}=${attemptTotal}`
  }

  if (useOptional) {
    const optionalTotal = [...marks].sort((a, b) => b - a).slice(0, count).reduce((sum, value) => sum + value, 0)
    return `${optionalTotal}`
  }

  const total = marks.reduce((sum, value) => sum + value, 0)
  return `${total}`
}

/**
 * @param {Array<{ marks?: number }>} questions
 * @param {{ attemptCount?: number | null }} [options]
 */
export function sumSectionMarks(questions = [], options = {}) {
  if (!questions.length) return 0
  const marks = questions.map((item) => Number(item.marks || 0)).filter((value) => Number.isFinite(value))
  if (!marks.length) return 0

  const totalQuestions = questions.length
  const rawAttempt = options.attemptCount
  const useOptional =
    rawAttempt != null && Number.isFinite(Number(rawAttempt)) && Number(rawAttempt) > 0 && Number(rawAttempt) < totalQuestions
  const count = useOptional ? Number(rawAttempt) : totalQuestions

  const first = marks[0]
  const allSame = marks.every((value) => value === first)
  if (allSame) return first * count
  if (useOptional) return [...marks].sort((a, b) => b - a).slice(0, count).reduce((sum, value) => sum + value, 0)
  return marks.reduce((sum, value) => sum + value, 0)
}

/**
 * @param {Array<{ section?: string, marks?: number, question?: { type?: string }, type?: string }>} selectedWithDetails
 * @param {Array<{ sectionKey: string, optionalQuestionsEnabled?: boolean, optionalQuestionsAttemptCount?: number | null }>} sectionConfigs
 */
export function computePreviewTotalMarks(selectedWithDetails, sectionConfigs) {
  const configByKey = new Map(sectionConfigs.map((item) => [item.sectionKey, item]))
  const groups = new Map()

  selectedWithDetails.forEach((item) => {
    const key = item.section || 'Q1'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(item)
  })

  let total = 0
  groups.forEach((rows, sectionKey) => {
    const config = configByKey.get(sectionKey)
    const previewRows = rows.map((row) => ({
      marks: Number(row.marks || 0),
      type: row.question?.type || row.type,
    }))
    const optionalEnabled = Boolean(config?.optionalQuestionsEnabled)
    const attemptCount = Number(config?.optionalQuestionsAttemptCount)
    if (
      optionalEnabled &&
      sectionSupportsOptionalQuestions(previewRows) &&
      Number.isFinite(attemptCount) &&
      attemptCount > 0 &&
      attemptCount < previewRows.length
    ) {
      total += sumSectionMarks(previewRows, { attemptCount })
      return
    }
    total += sumSectionMarks(previewRows)
  })

  return total
}

/**
 * Paper names used to end with "(yyyy-MM-dd HH:mm)". Rewrites that to "(03 May 2026)" (date only).
 * Names already using the new backend format are left unchanged.
 * @param {unknown} paperName
 */
export function formatPaperNameForDisplay(paperName) {
  if (paperName == null || typeof paperName !== 'string') return ''
  return paperName.replace(
    /\((\d{4})-(\d{2})-(\d{2})(?:\s+\d{1,2}:\d{2})?\)/,
    (_, y, m, d) => {
      const dt = new Date(Number(y), Number(m) - 1, Number(d))
      if (Number.isNaN(dt.getTime())) return `(${y}-${m}-${d})`
      const day = String(dt.getDate()).padStart(2, '0')
      const mon = dt.toLocaleString('en-GB', { month: 'short' })
      return `(${day} ${mon} ${dt.getFullYear()})`
    },
  )
}
