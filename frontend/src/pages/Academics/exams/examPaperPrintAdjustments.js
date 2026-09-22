import {
  hasAnySectionFontTweak,
  hasPrintSpacingTweaks,
} from './examPaperRichTextUtils.js'

export const emptyPrintTweaksState = () => ({
  headerNote: undefined,
  footerNote: undefined,
  sections: {},
  questions: {},
  spacing: { questionStep: 0, sectionStep: 0, laqPartStep: 0 },
})

const isNonEmptyString = (value) => Boolean(value && `${value}`.trim())

const pruneSectionRow = (row) => {
  if (!row || typeof row !== 'object') return null
  const next = {}
  if (isNonEmptyString(row.headingText)) next.headingText = `${row.headingText}`.trim()
  if (isNonEmptyString(row.instructionText)) next.instructionText = `${row.instructionText}`.trim()
  if (row.fontSizePx != null && Number.isFinite(Number(row.fontSizePx)) && Number(row.fontSizePx) > 0) {
    next.fontSizePx = Number(row.fontSizePx)
  }
  return Object.keys(next).length ? next : null
}

const pruneQuestionRow = (row) => {
  if (!row || typeof row !== 'object') return null
  const next = {}
  if (row.descriptionText != null && `${row.descriptionText}`.length) next.descriptionText = row.descriptionText
  if (row.mcqOpt1 != null && `${row.mcqOpt1}`.length) next.mcqOpt1 = row.mcqOpt1
  if (row.mcqOpt2 != null && `${row.mcqOpt2}`.length) next.mcqOpt2 = row.mcqOpt2
  if (row.mcqOpt3 != null && `${row.mcqOpt3}`.length) next.mcqOpt3 = row.mcqOpt3
  if (row.mcqOpt4 != null && `${row.mcqOpt4}`.length) next.mcqOpt4 = row.mcqOpt4
  return Object.keys(next).length ? next : null
}

export function printAdjustmentsFromApi(dto) {
  if (!dto || typeof dto !== 'object') return emptyPrintTweaksState()

  const sections = {}
  if (dto.sections && typeof dto.sections === 'object') {
    Object.entries(dto.sections).forEach(([key, row]) => {
      const pruned = pruneSectionRow(row)
      if (pruned) sections[key] = pruned
    })
  }

  const questions = {}
  if (dto.questions && typeof dto.questions === 'object') {
    Object.entries(dto.questions).forEach(([key, row]) => {
      const pruned = pruneQuestionRow(row)
      if (pruned) questions[String(key)] = pruned
    })
  }

  const spacing = {
    questionStep: Number(dto.spacing?.questionStep) || 0,
    sectionStep: Number(dto.spacing?.sectionStep) || 0,
    laqPartStep: Number(dto.spacing?.laqPartStep) || 0,
  }

  return {
    headerNote: isNonEmptyString(dto.headerNote) ? dto.headerNote : undefined,
    footerNote: isNonEmptyString(dto.footerNote) ? dto.footerNote : undefined,
    sections,
    questions,
    spacing,
  }
}

export function printAdjustmentsToApi(printTweaks, selectedQuestionIds = []) {
  if (!printTweaks) return null

  const allowed = new Set(
    (selectedQuestionIds || []).map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0),
  )

  const payload = {}
  if (printTweaks.headerNote !== undefined && isNonEmptyString(printTweaks.headerNote)) {
    payload.headerNote = printTweaks.headerNote
  }
  if (printTweaks.footerNote !== undefined && isNonEmptyString(printTweaks.footerNote)) {
    payload.footerNote = printTweaks.footerNote
  }

  const sections = {}
  Object.entries(printTweaks.sections || {}).forEach(([key, row]) => {
    const pruned = pruneSectionRow(row)
    if (pruned) sections[key] = pruned
  })
  if (Object.keys(sections).length) payload.sections = sections

  const questions = {}
  Object.entries(printTweaks.questions || {}).forEach(([key, row]) => {
    const questionId = Number(key)
    if (!Number.isFinite(questionId) || questionId <= 0) return
    if (allowed.size > 0 && !allowed.has(questionId)) return
    const pruned = pruneQuestionRow(row)
    if (pruned) questions[String(questionId)] = pruned
  })
  if (Object.keys(questions).length) payload.questions = questions

  const spacing = printTweaks.spacing || {}
  const questionStep = Number(spacing.questionStep) || 0
  const sectionStep = Number(spacing.sectionStep) || 0
  const laqPartStep = Number(spacing.laqPartStep) || 0
  if (questionStep !== 0 || sectionStep !== 0 || laqPartStep !== 0) {
    payload.spacing = { questionStep, sectionStep, laqPartStep }
  }

  return Object.keys(payload).length ? payload : null
}

export function hasPersistedPrintAdjustmentsPayload(payload) {
  return payload != null && typeof payload === 'object' && Object.keys(payload).length > 0
}

export function printTweaksHasContent(printTweaks) {
  if (!printTweaks) return false
  if (printTweaks.headerNote !== undefined || printTweaks.footerNote !== undefined) return true
  if (Object.keys(printTweaks.sections || {}).length > 0) return true
  if (Object.keys(printTweaks.questions || {}).length > 0) return true
  if (hasPrintSpacingTweaks(printTweaks.spacing)) return true
  if (hasAnySectionFontTweak(printTweaks.sections)) return true
  return false
}
