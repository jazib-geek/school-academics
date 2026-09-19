import api from './api'

const BASE = '/api/campus/settings'

const unwrap = (response) => response?.data?.data

export const getSettingClasses = async () => unwrap(await api.get(`${BASE}/classes`)) || []
export const createSettingClass = async (payload) => unwrap(await api.post(`${BASE}/classes`, payload))
export const updateSettingClass = async (id, payload) => unwrap(await api.post(`${BASE}/classes/${id}/update`, payload))
export const setSettingClassStatus = async (id, isActive) => api.post(`${BASE}/classes/${id}/status`, { isActive })

export const getSectionColors = async () => unwrap(await api.get(`${BASE}/section-colors`)) || []
export const createSectionColor = async (payload) => unwrap(await api.post(`${BASE}/section-colors`, payload))
export const updateSectionColor = async (id, payload) => unwrap(await api.post(`${BASE}/section-colors/${id}/update`, payload))
export const setSectionColorStatus = async (id, isActive) => api.post(`${BASE}/section-colors/${id}/status`, { isActive })
export const deleteSectionColor = async (id) => api.post(`${BASE}/section-colors/${id}/delete`)

export const getSettingSections = async () => unwrap(await api.get(`${BASE}/sections`)) || []
export const createSettingSection = async (payload) => unwrap(await api.post(`${BASE}/sections`, payload))
export const updateSettingSection = async (id, payload) => unwrap(await api.post(`${BASE}/sections/${id}/update`, payload))
export const setSettingSectionStatus = async (id, isActive) => api.post(`${BASE}/sections/${id}/status`, { isActive })

export const getOccupations = async () => unwrap(await api.get(`${BASE}/occupations`)) || []
export const createOccupation = async (payload) => unwrap(await api.post(`${BASE}/occupations`, payload))
export const updateOccupation = async (id, payload) => unwrap(await api.post(`${BASE}/occupations/${id}/update`, payload))
export const setOccupationStatus = async (id, isActive) => api.post(`${BASE}/occupations/${id}/status`, { isActive })

export const getDegrees = async () => unwrap(await api.get(`${BASE}/degrees`)) || []
export const createDegree = async (payload) => unwrap(await api.post(`${BASE}/degrees`, payload))
export const updateDegree = async (id, payload) => unwrap(await api.post(`${BASE}/degrees/${id}/update`, payload))
export const setDegreeStatus = async (id, isActive) => api.post(`${BASE}/degrees/${id}/status`, { isActive })
