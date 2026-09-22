export function compareSelectedQuestionOrder(a, b) {
  const orderA = Number(a.questionOrder) || 0
  const orderB = Number(b.questionOrder) || 0
  if (orderA !== orderB) return orderA - orderB
  return Number(a.questionId) - Number(b.questionId)
}

/** Assign contiguous orders 1..n preserving current sort order. */
export function resequenceQuestionOrders(selectedQuestions) {
  const sorted = [...selectedQuestions].sort(compareSelectedQuestionOrder)
  return sorted.map((item, index) => ({
    ...item,
    questionOrder: index + 1,
  }))
}

/** Move one question to a new position and renumber 1..n. */
export function applyQuestionOrderChange(selectedQuestions, questionId, newOrderRaw) {
  if (!selectedQuestions.length) return selectedQuestions

  const parsed = Math.floor(Number(newOrderRaw))
  const newOrder = Math.max(1, Math.min(selectedQuestions.length, Number.isFinite(parsed) ? parsed : 1))

  const sorted = [...selectedQuestions].sort(compareSelectedQuestionOrder)
  const fromIndex = sorted.findIndex((item) => item.questionId === questionId)
  if (fromIndex < 0) return resequenceQuestionOrders(selectedQuestions)

  const [moved] = sorted.splice(fromIndex, 1)
  sorted.splice(newOrder - 1, 0, moved)
  return sorted.map((item, index) => ({
    ...item,
    questionOrder: index + 1,
  }))
}
