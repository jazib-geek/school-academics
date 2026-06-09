import { normalizeExamTypeOption } from './examMakerExamTypes'
import { normalizeSubQuestionNumbering } from './examPaperPrintHelpers'

export function normalizeFormSnapshot(form) {
  return {
    classId: `${form.classId || ''}`,
    subjectId: `${form.subjectId || ''}`,
    schoolName: form.schoolName || '',
    schoolLogoUrl: form.schoolLogoUrl || '',
    examTitleId: `${form.examTitleId || ''}`,
    paperName: form.paperName || '',
    examType: normalizeExamTypeOption(form.examType),
    sessionLabel: form.sessionLabel || '',
    durationMinutes: Number(form.durationMinutes) || null,
    headerNote: form.headerNote || '',
    instructions: form.instructions || '',
    footerNote: form.footerNote || '',
    showSectionNames: Boolean(form.showSectionNames),
    subQuestionNumberingStyle: normalizeSubQuestionNumbering(form.subQuestionNumberingStyle),
    wrapQuestionMarksInParentheses: Boolean(form.wrapQuestionMarksInParentheses),
  }
}

export function normalizeSelectedQuestionsSnapshot(selectedQuestions) {
  return [...selectedQuestions]
    .map((item) => ({
      questionId: item.questionId,
      questionOrder: Number(item.questionOrder),
      section: `${item.section || 'Q1'}`.trim(),
      marks: Number(item.marks),
    }))
    .sort((a, b) => a.questionOrder - b.questionOrder || a.questionId - b.questionId)
}

export function normalizeSectionConfigsSnapshot(sectionConfigs) {
  return sectionConfigs.map((section) => ({
    sectionKey: section.sectionKey || '',
    sectionName: section.sectionName || '',
    headingText: section.headingText || '',
    instructionText: section.instructionText || '',
    marksDisplayText: section.marksDisplayText || '',
    optionalQuestionsEnabled: Boolean(section.optionalQuestionsEnabled),
    optionalQuestionsAttemptCount: section.optionalQuestionsAttemptCount ?? null,
  }))
}

export function buildEditorSnapshot(form, selectedQuestions, sectionConfigs) {
  return JSON.stringify({
    form: normalizeFormSnapshot(form),
    selectedQuestions: normalizeSelectedQuestionsSnapshot(selectedQuestions),
    sectionConfigs: normalizeSectionConfigsSnapshot(sectionConfigs),
  })
}

export function buildSnapshotFromPaper(paper) {
  const form = {
    classId: paper.classId ? String(paper.classId) : '',
    subjectId: paper.subjectId ? String(paper.subjectId) : '',
    schoolName: paper.schoolName || '',
    schoolLogoUrl: paper.schoolLogoUrl || '',
    examTitleId: paper.examTitleId ? String(paper.examTitleId) : '',
    paperName: paper.paperName || '',
    examType: normalizeExamTypeOption(paper.examType),
    sessionLabel: paper.sessionLabel || '',
    durationMinutes: paper.durationMinutes || null,
    headerNote: paper.headerNote || '',
    instructions: paper.instructions || '',
    footerNote: paper.footerNote || '',
    showSectionNames: Boolean(paper.showSectionNames),
    subQuestionNumberingStyle: normalizeSubQuestionNumbering(paper.subQuestionNumberingStyle),
    wrapQuestionMarksInParentheses: Boolean(paper.wrapQuestionMarksInParentheses),
  }

  const selectedQuestions = (paper.questions || []).map((question) => ({
    questionId: question.id,
    questionOrder: Number(question.order || 1),
    section: question.section || 'Q1',
    marks: Number(question.marks || 1),
  }))

  const sectionConfigs = (paper.sections || []).map((section) => ({
    sectionKey: section.sectionKey || '',
    sectionName: section.sectionName || '',
    headingText: section.headingText || '',
    instructionText: section.instructionText || '',
    marksDisplayText: section.marksDisplayText || '',
    optionalQuestionsEnabled: Boolean(section.optionalQuestionsEnabled),
    optionalQuestionsAttemptCount: section.optionalQuestionsAttemptCount ?? null,
  }))

  return buildEditorSnapshot(form, selectedQuestions, sectionConfigs)
}
