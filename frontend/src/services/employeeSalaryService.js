import api from './api'

const BASE = '/api/campus/employee-salary'

export const startEmployeeSalaryCalculation = async (payload) => {
  const response = await api.post(`${BASE}/calculate`, payload)
  return response?.data?.data
}

export const getEmployeeSalaryCalculationResult = async (generationId) => {
  const response = await api.get(`${BASE}/calculate/${generationId}`)
  return response?.data?.data
}

export const getEmployeeSalaryCalculationStatus = async (generationId) => {
  const response = await api.get(`${BASE}/calculate/${generationId}/status`)
  return response?.data?.data
}

/** Polls calculation status via axios (same auth/CORS as the rest of the campus API). */
export const subscribeEmployeeSalaryProgress = (generationId, { onPercent, onDone, onError }) => {
  let stopped = false
  let timerId = null

  const tick = async () => {
    if (stopped) return
    try {
      const status = await getEmployeeSalaryCalculationStatus(generationId)
      if (stopped) return

      if (typeof status?.percent === 'number') {
        onPercent?.(status.percent)
      }

      if (status?.failed) {
        stopped = true
        onError?.(new Error(status.error || 'Calculation failed.'))
        return
      }

      if (status?.done) {
        stopped = true
        onDone?.()
        return
      }

      timerId = window.setTimeout(tick, 300)
    } catch (error) {
      if (stopped) return
      stopped = true
      onError?.(error)
    }
  }

  timerId = window.setTimeout(tick, 150)

  return () => {
    stopped = true
    if (timerId != null) window.clearTimeout(timerId)
  }
}
