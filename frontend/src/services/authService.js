import api from './api'

const LOGIN_PATH = import.meta.env.VITE_LOGIN_PATH || '/api/auth/login'
const CAMPUS_HEADER = import.meta.env.VITE_CAMPUS_HEADER || 'Campus'

const mapLoginResponse = (data) => {
  const payload = data?.data || data

  return {
    token: payload?.token || payload?.accessToken || payload?.jwt || '',
    user:
      payload?.user ||
      (payload?.username
        ? { username: payload.username, role: payload.role || 'Admin' }
        : null),
  }
}

export const loginWithCampus = async ({ campus, username, password }) => {
  const response = await api.post(
    LOGIN_PATH,
    {
      username,
      password,
    },
    {
      headers: {
        [CAMPUS_HEADER]: campus,
      },
    },
  )

  const mapped = mapLoginResponse(response.data)
  localStorage.setItem('campus', campus)
  localStorage.setItem('username', username)

  if (mapped.token) {
    localStorage.setItem('token', mapped.token)
  }

  if (mapped.user) {
    localStorage.setItem('user', JSON.stringify(mapped.user))
  }

  return mapped
}

export const logout = () => {
  localStorage.removeItem('campus')
  localStorage.removeItem('username')
  localStorage.removeItem('token')
  localStorage.removeItem('user')
}

export const isAuthenticated = () =>
  Boolean(localStorage.getItem('token') || localStorage.getItem('username'))
