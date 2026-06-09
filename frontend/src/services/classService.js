import api from './api'
import { sortClassesByCustomOrder } from './classSort'

export const getClasses = async () => {
  const response = await api.get('/api/class')
  const classes = response?.data?.data || []
  return sortClassesByCustomOrder(classes)
}

/** Class levels from tblClass (not section composites). Used by Daily Diary. */
export const getClassLevels = async () => {
  const response = await api.get('/api/class/levels')
  const classes = response?.data?.data || []
  return sortClassesByCustomOrder(classes)
}
