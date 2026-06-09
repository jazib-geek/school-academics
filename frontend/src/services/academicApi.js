import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://localhost:7093'

const academicApi = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

academicApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('academicToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

const isAcademicLoginRequest = (url = '') => /\/api\/academics\/auth\/login\/?$/.test(url)

academicApi.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status
    const requestUrl = error?.config?.url || ''

    if (status === 401 && !isAcademicLoginRequest(requestUrl)) {
      localStorage.removeItem('academicToken')
      localStorage.removeItem('academicUsername')
      localStorage.removeItem('academicInstituteSettings')

      if (typeof window !== 'undefined') {
        const hashPath = window.location.hash.replace(/^#/, '') || '/'
        if (hashPath !== '/academics/login') {
          window.location.replace(
            `${window.location.pathname}${window.location.search}#/academics/login`,
          )
        }
      }
    }

    return Promise.reject(error)
  },
)

export default academicApi
