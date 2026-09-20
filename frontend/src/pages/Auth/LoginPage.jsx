import { useEffect, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { isAuthenticated, loginWithCampus, resolveCampusPostLoginPath } from '../../services/authService'
import { getAppCampusOptions } from '../../constants/branding'
import { resolveCampusLogoSrc } from '../../utils/campusBranding'

function LoginPage() {
  const campusOptions = getAppCampusOptions()

  const navigate = useNavigate()
  const location = useLocation()
  const passwordChanged = Boolean(location.state?.passwordChanged)
  const alreadySignedIn = isAuthenticated() && !passwordChanged
  const signedInDestination = alreadySignedIn
    ? resolveCampusPostLoginPath(location.state?.from?.pathname)
    : null

  const defaultCampus = import.meta.env.PROD
    ? campusOptions[0]?.value || ''
    : campusOptions.find((item) => item.value === 'local')?.value || campusOptions[0]?.value || ''

  const resolveInitialCampus = () => {
    const fromState = location.state?.campus
    if (fromState && campusOptions.some((item) => item.value === fromState)) {
      return fromState
    }
    const stored = localStorage.getItem('campus')
    if (stored && campusOptions.some((item) => item.value === stored)) {
      return stored
    }
    return defaultCampus
  }

  const [form, setForm] = useState({
    campus: resolveInitialCampus(),
    username: location.state?.username || '',
    password: '',
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [infoMessage, setInfoMessage] = useState(
    passwordChanged ? 'Password updated. Please sign in with your new password.' : '',
  )

  useEffect(() => {
    if (!passwordChanged) return
    navigate(location.pathname, { replace: true, state: null })
  }, [passwordChanged, navigate, location.pathname])

  if (alreadySignedIn) {
    return <Navigate to={signedInDestination} replace />
  }

  const onChange = (event) => {
    const { name, value } = event.target
    setForm((previous) => ({ ...previous, [name]: value }))
  }

  const onSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setInfoMessage('')
    setIsLoading(true)

    try {
      await loginWithCampus(form)
      const intended = location.state?.from?.pathname
      const destination = resolveCampusPostLoginPath(intended)
      navigate(destination, { replace: true })
    } catch (requestError) {
      const message =
        requestError?.response?.data?.message ||
        requestError?.response?.data?.title ||
        'Login failed. Please check campus, username and password.'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(280deg,#405189,#283357)] p-6">
      <div className="mx-auto flex min-h-screen w-full max-w-md items-center">
        <div className="w-full rounded-3xl bg-white/95 p-8 shadow-2xl backdrop-blur">
          <div className="mb-8 text-center">
            <img
              src={resolveCampusLogoSrc()}
              alt=""
              className="mx-auto mb-4 h-20 w-20 rounded-xl object-contain"
            />
            <h1 className="text-4xl font-bold leading-tight text-indigo-900">
              Campus sign in
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Campus Admin Portal
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">
                Campus
              </span>
              <select
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-800 outline-none ring-indigo-300 transition focus:ring"
                name="campus"
                value={form.campus}
                onChange={onChange}
                required
              >
                {campusOptions.map((campusOption) => (
                  <option key={campusOption.value} value={campusOption.value}>
                    {campusOption.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">
                Username
              </span>
              <input
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-800 outline-none ring-indigo-300 transition focus:ring"
                name="username"
                value={form.username}
                onChange={onChange}
                placeholder="Enter username"
                required
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">
                Password
              </span>
              <input
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-800 outline-none ring-indigo-300 transition focus:ring"
                name="password"
                type="password"
                value={form.password}
                onChange={onChange}
                placeholder="Enter password"
                required
              />
            </label>

            {infoMessage ? (
              <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                {infoMessage}
              </p>
            ) : null}

            {error ? (
              <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">
                {error}
              </p>
            ) : null}

            <button
              className="w-full rounded-lg bg-indigo-700 px-4 py-2.5 font-semibold text-white transition hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-70"
              type="submit"
              disabled={isLoading || !form.campus}
            >
              {isLoading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin" />
                  Signing in...
                </span>
              ) : (
                'Login'
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-slate-400">
            Other Login Options {' '}|{' '}
          
            <Link to="/employee/login" className="text-indigo-700 hover:underline">
              employee login
            </Link>
            {' '}|{' '}
            <Link to="/academics/login" className="text-indigo-700 hover:underline">
              academics login
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
