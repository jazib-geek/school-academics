import api from './api'

/**
 * @param {File} file
 * @returns {Promise<{ success?: boolean, message?: string, data?: { bucket: string, key: string, publicUrl?: string } }>}
 */
export const uploadTestFile = async (file) => {
  const formData = new FormData()
  formData.append('file', file)
  const response = await api.post('/api/storage/test-upload', formData, {
    timeout: 120_000,
  })
  return response?.data
}

/**
 * Download an object via the API (uses JWT). Key must be under test-uploads/.
 * @param {string} key e.g. test-uploads/8a8544cc-...-file.xlsx
 */
export const downloadFileByKey = async (key) => {
  try {
    const response = await api.get('/api/storage/download', {
      params: { key },
      responseType: 'blob',
      timeout: 120_000,
    })
    const blob = response.data
    const disposition = response.headers['content-disposition'] || ''
    let filename = key.split('/').pop() || 'download'
    const match = /filename\*?=(?:UTF-8'')?([^;\r\n]+)/i.exec(disposition)
    if (match?.[1]) {
      filename = decodeURIComponent(match[1].replace(/^"+|"+$/g, '').trim())
    }
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  } catch (err) {
    const data = err?.response?.data
    const status = err?.response?.status
    if (data instanceof Blob && status >= 400) {
      const text = await data.text()
      let msg = text
      try {
        const j = JSON.parse(text)
        msg = j.message || text
      } catch {
        /* ignore */
      }
      throw new Error(msg)
    }
    throw err
  }
}
