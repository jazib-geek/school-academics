import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CalendarDays, Clock, Loader2, Radio, RefreshCw, Search, UsersRound } from 'lucide-react'
import CampusShell from '../../../components/campus/CampusShell.jsx'
import { CampusAccessDenied } from '../../../components/campus/CampusPermissionUi.jsx'
import { getEmployeeAttendanceLiveDay } from '../../../services/employeeAttendanceService'
import { getStoredCampusProfile, isZkTecoAttendance } from '../../../utils/campusProfile'
import { FILTER_INPUT_AUTOCOMPLETE_PROPS } from '../../../utils/filterInputProps'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://localhost:7093'

const getPakistanDateValue = () => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Karachi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())

  const year = parts.find((p) => p.type === 'year')?.value
  const month = parts.find((p) => p.type === 'month')?.value
  const day = parts.find((p) => p.type === 'day')?.value
  return `${year}-${month}-${day}`
}

const isTodayPakistan = (value) => value === getPakistanDateValue()

const formatTime12Hour = (value) => {
  if (!value || typeof value !== 'string') return '-'
  const short = value.length >= 5 ? value.slice(0, 5) : value
  const [hStr, mStr = '00'] = short.split(':')
  const h = Number.parseInt(hStr, 10)
  const m = Number.parseInt(mStr, 10)
  if (Number.isNaN(h) || Number.isNaN(m)) return value
  const period = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12}:${String(m).padStart(2, '0')} ${period}`
}

const statusClass = (status) => {
  if (status === 'Late' || status === 'Late, left early')
    return 'border-rose-200 bg-rose-50 text-rose-800'
  if (status === 'Left early') return 'border-amber-200 bg-amber-50 text-amber-800'
  if (status === 'On time') return 'border-emerald-200 bg-emerald-50 text-emerald-800'
  return 'border-slate-200 bg-slate-50 text-slate-700'
}

const lateMinutesClass = (lateMinutes) =>
  (lateMinutes || 0) > 0
    ? 'bg-rose-50 text-rose-800 ring-rose-200'
    : 'bg-emerald-50 text-emerald-800 ring-emerald-200'

const normalizeEntries = (entries = []) =>
  [...entries].sort((a, b) => (b.attendanceId || 0) - (a.attendanceId || 0))

function CampusLiveAttendancePage() {
  const blocked = isZkTecoAttendance(getStoredCampusProfile())
  const [dateValue, setDateValue] = useState(getPakistanDateValue)
  const [entries, setEntries] = useState([])
  const [summary, setSummary] = useState({ totalEntries: 0, onTimeCount: 0, lateCount: 0 })
  const [searchText, setSearchText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [streamState, setStreamState] = useState('idle')
  const streamRef = useRef(null)

  const liveToday = isTodayPakistan(dateValue)

  const loadDay = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      const data = await getEmployeeAttendanceLiveDay({ date: dateValue })
      setEntries(normalizeEntries(data?.entries || []))
      setSummary({
        totalEntries: data?.totalEntries || 0,
        onTimeCount: data?.onTimeCount || 0,
        lateCount: data?.lateCount || 0,
      })
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to load live attendance.')
      setEntries([])
      setSummary({ totalEntries: 0, onTimeCount: 0, lateCount: 0 })
    } finally {
      setIsLoading(false)
    }
  }, [dateValue])

  useEffect(() => {
    if (blocked) return undefined
    loadDay()
  }, [blocked, loadDay])

  useEffect(() => {
    streamRef.current?.close()
    streamRef.current = null

    if (blocked || !liveToday) {
      setStreamState('paused')
      return undefined
    }

    const token = localStorage.getItem('token')
    if (!token) {
      setStreamState('offline')
      return undefined
    }

    const url = new URL('/api/employee-attendance/live/stream', API_BASE_URL)
    url.searchParams.set('date', dateValue)
    url.searchParams.set('access_token', token)

    const source = new EventSource(url.toString())
    streamRef.current = source
    setStreamState('connecting')

    source.onopen = () => setStreamState('live')
    source.onerror = () => setStreamState('reconnecting')
    source.addEventListener('attendance', (event) => {
      const row = JSON.parse(event.data)
      setEntries((previous) => normalizeEntries([row, ...previous.filter((item) => item.attendanceId !== row.attendanceId)]))
    })

    return () => {
      source.close()
      if (streamRef.current === source) streamRef.current = null
    }
  }, [blocked, dateValue, liveToday])

  const computedSummary = useMemo(() => {
    const totalEntries = entries.length
    const lateCount = entries.filter((entry) => entry.isLate).length
    return {
      totalEntries,
      lateCount,
      onTimeCount: totalEntries - lateCount,
    }
  }, [entries])

  const filteredEntries = useMemo(() => {
    const keyword = searchText.trim().toLowerCase()
    if (!keyword) return entries
    return entries.filter((entry) => {
      const name = (entry.employeeName || '').toLowerCase()
      const id = String(entry.employeeId || '')
      const status = (entry.status || '').toLowerCase()
      return name.includes(keyword) || id.includes(keyword) || status.includes(keyword)
    })
  }, [entries, searchText])

  const displaySummary = entries.length ? computedSummary : summary

  if (blocked) {
    return (
      <CampusAccessDenied
        title="Live attendance is not used here"
        message="This campus imports attendance from the wall-mounted device. Open Import Attendance instead."
      />
    )
  }

  return (
    <CampusShell headerContext="Live attendance">
      <div className="min-h-screen bg-slate-100 p-4 pt-[4.25rem] md:p-6 md:pt-[4.5rem]">
        <div className="mx-auto max-w-6xl space-y-4">
          <section className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
            <div className="mb-1 flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--campus-primary)] text-white">
                  <UsersRound size={18} />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-800">Live Attendance</h1>
                  <p className="text-sm text-slate-500">
                    Biometric check-ins for the selected day. Today updates as entries arrive.
                  </p>
                </div>
              </div>
              <div
                className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${
                  liveToday && streamState === 'live'
                    ? 'animate-pulse border-emerald-200 bg-emerald-50 text-emerald-800 shadow-sm shadow-emerald-100'
                    : 'border-slate-200 bg-white text-slate-600'
                }`}
              >
                <Radio className="h-3.5 w-3.5" />
                {liveToday ? (streamState === 'live' ? 'Live now' : 'Connecting live') : 'History mode'}
              </div>
            </div>

            <div className="grid gap-3 lg:grid-cols-[220px_1fr_auto] lg:items-end">
              <label className="text-xs font-medium text-slate-600">
                Date
                <div className="relative mt-1">
                  <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="date"
                    value={dateValue}
                    onChange={(event) => setDateValue(event.target.value)}
                    className="h-10 w-full rounded-lg border border-slate-300 pl-9 pr-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  />
                </div>
              </label>

              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  name="filterLiveAttendanceSearch"
                  value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
                  placeholder="Search employee, ID, or status"
                  className="h-10 w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  {...FILTER_INPUT_AUTOCOMPLETE_PROPS}
                />
              </div>

              <button
                type="button"
                onClick={() => void loadDay()}
                disabled={isLoading}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[var(--campus-primary)] px-4 text-sm font-medium text-white hover:bg-[#344574] disabled:opacity-60"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Refresh
              </button>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="rounded-lg bg-slate-50 px-3 py-2">
                <p className="text-xs text-slate-500">Entries</p>
                <p className="text-lg font-semibold text-slate-900">{displaySummary.totalEntries}</p>
              </div>
              <div className="rounded-lg bg-emerald-50 px-3 py-2">
                <p className="text-xs text-emerald-700">On time</p>
                <p className="text-lg font-semibold text-emerald-900">{displaySummary.onTimeCount}</p>
              </div>
              <div className="rounded-lg bg-rose-50 px-3 py-2">
                <p className="text-xs text-rose-700">Late</p>
                <p className="text-lg font-semibold text-rose-900">{displaySummary.lateCount}</p>
              </div>
            </div>

            {error ? (
              <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
              </div>
            ) : null}

            <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
              <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-[13px] leading-snug">
                <thead className="bg-[var(--campus-primary)] text-xs uppercase text-white">
                  <tr>
                    <th className="px-3 py-2 font-medium">Employee</th>
                    <th className="px-3 py-2 font-medium">CI TIME</th>
                    <th className="px-3 py-2 font-medium">Late minutes</th>
                    <th className="px-3 py-2 font-medium">LC</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEntries.map((entry) => (
                    <tr
                      key={entry.attendanceId}
                      className="border-t border-slate-100 bg-white hover:bg-slate-50"
                    >
                      <td className="px-3 py-1.5">
                        <p className="font-semibold text-slate-900">{entry.employeeName || '-'}</p>
                      </td>
                      <td className="px-3 py-1.5">
                        <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2.5 py-1 font-mono text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200">
                          <Clock className="h-3.5 w-3.5 text-emerald-500" />
                          {formatTime12Hour(entry.checkInTime)}
                        </span>
                      </td>
                      <td className="px-3 py-1.5">
                        <span className={`inline-flex min-w-12 justify-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${lateMinutesClass(entry.lateMinutes)}`}>
                          {entry.lateMinutes || 0}
                        </span>
                      </td>
                      <td className="px-3 py-1.5">
                        <span className="inline-flex min-w-10 justify-center rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-800 ring-1 ring-slate-200">
                          {entry.lateComings || 0}
                        </span>
                      </td>
                      <td className="px-3 py-1.5">
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass(entry.status)}`}>
                          {entry.status || (entry.isLate ? 'Late' : 'On time')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>

              {isLoading && entries.length === 0 ? (
                <div className="flex items-center justify-center gap-2 px-4 py-8 text-sm text-slate-600">
                  <Loader2 className="h-5 w-5 animate-spin text-[var(--campus-primary)]" />
                  Loading attendance...
                </div>
              ) : null}

              {!isLoading && filteredEntries.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-slate-500">No attendance entries found.</p>
              ) : null}
            </div>
          </section>
        </div>
      </div>
    </CampusShell>
  )
}

export default CampusLiveAttendancePage
