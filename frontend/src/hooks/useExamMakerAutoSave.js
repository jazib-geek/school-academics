import { useEffect, useRef } from 'react'

const DRAFT_STORAGE_KEY = 'examMakerDraft'
const DRAFT_AUTO_SAVE_INTERVAL = 5000

export const useExamMakerAutoSave = (form, selectedQuestions, sectionConfigs) => {
  const hasDraftRef = useRef(false)

  useEffect(() => {
    const timer = setInterval(() => {
      if (!form.classId || !form.subjectId) return

      const draft = {
        form,
        selectedQuestions,
        sectionConfigs,
        timestamp: Date.now(),
      }

      try {
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft))
        hasDraftRef.current = true
      } catch (e) {
        console.warn('Failed to auto-save exam draft:', e)
      }
    }, DRAFT_AUTO_SAVE_INTERVAL)

    return () => clearInterval(timer)
  }, [form, selectedQuestions, sectionConfigs])

  const loadDraft = () => {
    try {
      const stored = localStorage.getItem(DRAFT_STORAGE_KEY)
      if (stored) {
        const draft = JSON.parse(stored)
        return draft
      }
    } catch (e) {
      console.warn('Failed to load exam draft:', e)
    }
    return null
  }

  const clearDraft = () => {
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY)
      hasDraftRef.current = false
    } catch (e) {
      console.warn('Failed to clear exam draft:', e)
    }
  }

  return {
    loadDraft,
    clearDraft,
    hasDraft: hasDraftRef.current,
  }
}

export const DRAFT_STORAGE_KEY_EXPORT = DRAFT_STORAGE_KEY
