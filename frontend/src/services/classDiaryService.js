import api from './api'

export const getClassDiaryListing = async () => {
  const response = await api.get('/api/class-diary/listing')
  return response?.data?.data || []
}

export const uploadClassDiary = async ({ classId, date, files, description }) => {
  const formData = new FormData()
  formData.append('classId', String(classId))
  formData.append('date', date)
  for (const file of files) {
    formData.append('files', file)
  }
  if (description) {
    formData.append('description', description)
  }

  const response = await api.post('/api/class-diary/upload', formData, { timeout: 120_000 })
  return response?.data
}

export const deleteClassDiary = async ({ classId, date }) => {
  const response = await api.post('/api/class-diary/delete', { classId, date })
  return response?.data
}

export const getClassDiaryUploadHistory = async ({ classId, date }) => {
  const response = await api.get('/api/class-diary/upload-history', {
    params: { classId, date },
  })
  return response?.data?.data || []
}

export const diaryRowLastUpdatedBy = (row) =>
  row?.lastUpdatedBy ?? row?.LastUpdatedBy ?? null

export const diaryRowLastUpdatedAt = (row) =>
  row?.lastUpdatedAt ?? row?.LastUpdatedAt ?? null

/** B2 diary keys are stable per class/date; bust browser cache after replace. */
export const appendDiaryImageCacheBust = (url, lastUpdatedAt) => {
  if (!url) return url
  const raw = `${url}`.trim()
  const parsed = lastUpdatedAt ? new Date(lastUpdatedAt).getTime() : NaN
  const bust = Number.isFinite(parsed) && parsed > 0 ? parsed : Date.now()
  const base = raw.split('?')[0]
  return `${base}?v=${bust}`
}

/** Image URLs for display (listing row includes LastUpdatedAt for cache bust). */
export const parseDiaryDisplayImgUrls = (row) =>
  parseDiaryImgUrls(row).map((url) => appendDiaryImageCacheBust(url, diaryRowLastUpdatedAt(row)))

/** Split comma-separated imgUrls from listing API. */
export const parseDiaryImgUrls = (row) => {
  const raw = row?.imgUrls ?? row?.ImgUrls ?? ''
  if (!raw) return []
  return `${raw}`
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

export const diaryRowDateKey = (row) => `${row?.date ?? row?.Date ?? ''}`.slice(0, 10)

export const diaryRowClassId = (row) => row?.classId ?? row?.ClassId
