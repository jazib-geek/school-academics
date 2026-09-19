import { useCallback, useState } from 'react'
import { toast } from 'sonner'

/** Popup loader for timetable async work; outcomes use sonner toasts. */
export function useTimetableUiFeedback() {
  const [loaderText, setLoaderText] = useState('')

  const showLoader = useCallback((text) => setLoaderText(text || 'Please wait…'), [])
  const hideLoader = useCallback(() => setLoaderText(''), [])

  const showError = useCallback((message) => {
    toast.error(message)
  }, [])

  const showSuccess = useCallback((message) => {
    toast.success(message)
  }, [])

  const runAsync = useCallback(
    async (loadingText, work, { successMessage } = {}) => {
      showLoader(loadingText)
      try {
        const result = await work()
        hideLoader()
        if (successMessage) {
          toast.success(successMessage)
        }
        return result
      } catch (error) {
        hideLoader()
        toast.error(error?.response?.data?.message || error?.message || 'Please try again.')
        throw error
      }
    },
    [hideLoader, showLoader],
  )

  return {
    loaderText,
    showLoader,
    hideLoader,
    showError,
    showSuccess,
    runAsync,
    loaderOpen: Boolean(loaderText),
  }
}
