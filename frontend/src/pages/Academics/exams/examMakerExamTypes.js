/** @typedef {'objective' | 'subjective'} ExamTypeOption */
/** @typedef {'mcq' | 'saq' | 'laq' | 'numerical'} QuestionType */

export const EXAM_TYPE = Object.freeze({
  OBJECTIVE: 'objective',
  SUBJECTIVE: 'subjective',
})

export const QUESTION_TYPE = Object.freeze({
  MCQ: 'mcq',
  SAQ: 'saq',
  LAQ: 'laq',
  NUMERICAL: 'numerical',
})

export const DEFAULT_OBJECTIVE_HEADER_NOTE =
  'In Objective Cutting, overwriting, ink remover and use of lead pencil is not allowed.'

const EXAM_TYPE_DISPLAY = Object.freeze({
  [EXAM_TYPE.OBJECTIVE]: 'Objective',
  [EXAM_TYPE.SUBJECTIVE]: 'Subjective',
})

const EXAM_TYPE_SHORT = Object.freeze({
  [EXAM_TYPE.OBJECTIVE]: 'Obj',
  [EXAM_TYPE.SUBJECTIVE]: 'Subj',
})

/** @param {unknown} value */
export function normalizeExamType(value) {
  return `${value || ''}`.trim().toLowerCase()
}

/** @param {unknown} value @returns {ExamTypeOption} */
export function normalizeExamTypeOption(value) {
  return normalizeExamType(value) === EXAM_TYPE.SUBJECTIVE ? EXAM_TYPE.SUBJECTIVE : EXAM_TYPE.OBJECTIVE
}

/** @param {unknown} examType */
export function isSubjectiveExamType(examType) {
  return normalizeExamTypeOption(examType) === EXAM_TYPE.SUBJECTIVE
}

/** @param {unknown} examType */
export function isObjectiveExamType(examType) {
  return normalizeExamTypeOption(examType) === EXAM_TYPE.OBJECTIVE
}

/** @param {unknown} value */
export function formatExamTypeDisplay(value) {
  return EXAM_TYPE_DISPLAY[normalizeExamTypeOption(value)]
}

/** @param {unknown} value */
export function formatExamTypeShort(value) {
  return EXAM_TYPE_SHORT[normalizeExamTypeOption(value)]
}

/** @param {unknown} value @returns {QuestionType} */
export function normalizeQuestionType(value) {
  const v = `${value || ''}`.trim().toLowerCase()
  if (v === QUESTION_TYPE.SAQ) return QUESTION_TYPE.SAQ
  if (v === QUESTION_TYPE.LAQ) return QUESTION_TYPE.LAQ
  if (v === QUESTION_TYPE.NUMERICAL) return QUESTION_TYPE.NUMERICAL
  return QUESTION_TYPE.MCQ
}

/**
 * Objective papers: MCQ only. Subjective papers: SAQ, LAQ, and Numerical.
 *
 * @param {unknown} examType
 * @param {unknown} questionType
 */
export function isQuestionTypeAllowedForExam(examType, questionType) {
  const q = normalizeQuestionType(questionType)
  if (isObjectiveExamType(examType)) return q === QUESTION_TYPE.MCQ
  if (isSubjectiveExamType(examType)) {
    return q === QUESTION_TYPE.SAQ || q === QUESTION_TYPE.LAQ || q === QUESTION_TYPE.NUMERICAL
  }
  return false
}

/** @param {unknown} examType @returns {QuestionType[]} */
export function catalogQuestionTypesForExam(examType) {
  if (isObjectiveExamType(examType)) return [QUESTION_TYPE.MCQ]
  return [QUESTION_TYPE.SAQ, QUESTION_TYPE.LAQ, QUESTION_TYPE.NUMERICAL]
}

/** @param {unknown} examType @returns {QuestionType} */
export function defaultCatalogFilterType(examType) {
  return isSubjectiveExamType(examType) ? QUESTION_TYPE.SAQ : QUESTION_TYPE.MCQ
}

const SECTION_KEY_PATTERN = /^Q(\d+)$/i

/**
 * @param {string} sectionKey
 */
function sectionKeyToNumber(sectionKey) {
  const match = `${sectionKey || ''}`.trim().match(SECTION_KEY_PATTERN)
  return match ? Number(match[1]) : 0
}

/**
 * Default section when adding a question. Subjective papers start at Q1 (Section I);
 * further types use the next free Q key. Same-type questions reuse an existing section.
 *
 * @param {unknown} questionType
 * @param {unknown} examType
 * @param {Array<{ section?: string, question?: { type?: string } }>} [selectedQuestions]
 */
export function defaultSectionKeyForQuestionType(questionType, examType, selectedQuestions = []) {
  const q = normalizeQuestionType(questionType)
  if (!isQuestionTypeAllowedForExam(examType, q)) return ''

  if (isObjectiveExamType(examType)) return 'Q1'

  const existingSameType = selectedQuestions.find(
    (item) => normalizeQuestionType(item.question?.type) === q,
  )
  if (existingSameType?.section) return `${existingSameType.section}`.trim() || 'Q1'

  const usedKeys = [
    ...new Set(
      selectedQuestions.map((item) => `${item.section || 'Q1'}`.trim()).filter(Boolean),
    ),
  ]
  if (!usedKeys.length) return 'Q1'

  const maxN = usedKeys.reduce((max, key) => Math.max(max, sectionKeyToNumber(key)), 0)
  return `Q${Math.max(1, maxN + 1)}`
}

/** @param {unknown} questionType */
export function defaultMarksForQuestionType(questionType) {
  const q = normalizeQuestionType(questionType)
  if (q === QUESTION_TYPE.MCQ) return 1
  if (q === QUESTION_TYPE.SAQ) return 2
  // LAQ and Numerical share long-form default marks
  return 8
}

/** @param {unknown} note */
export function isDefaultObjectiveHeaderNote(note) {
  return `${note || ''}`.toLowerCase().includes('objective cutting')
}
