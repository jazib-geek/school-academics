import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { EmployeeAsyncSelect as AsyncSelect } from '../../components/employee/EmployeeSelect'
import EmployeeBackButton from '../../components/employee/EmployeeBackButton'
import EmployeeLayout from '../../components/employee/EmployeeLayout'
import { searchStudents } from '../../services/studentService'
import {
  getConductDayReport,
  getStudentConductHistory,
  notePolarity,
  polarityCardClass,
} from '../../services/studentConductService'

const TABS = [
  { id: 'date', label: 'By date' },
  { id: 'student', label: 'By student' },
]

const getPakistanToday = () => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Karachi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  return `${parts.find((p) => p.type === 'year')?.value}-${parts.find((p) => p.type === 'month')?.value}-${parts.find((p) => p.type === 'day')?.value}`
}

const pakistanParts = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Karachi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())

const getPakistanTodayParts = () => {
  const parts = pakistanParts()
  return {
    year: Number(parts.find((p) => p.type === 'year')?.value),
    month: Number(parts.find((p) => p.type === 'month')?.value),
  }
}

const shiftMonth = (year, month, delta) => {
  const date = new Date(Date.UTC(year, month - 1 + delta, 1))
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 }
}

const formatMonthLabel = (year, month) =>
  new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, 1)))

const formatDayLabel = (iso) => {
  const parts = String(iso || '').split('-').map(Number)
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return iso
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(parts[0], parts[1] - 1, parts[2])))
}

const noteDateKey = (value) => String(value || '').slice(0, 10)

function debouncePromise(fn, waitMs) {
  let timeoutId
  return (...args) =>
    new Promise((resolve) => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        fn(...args)
          .then(resolve)
          .catch(() => resolve([]))
      }, waitMs)
    })
}

const normalizeClassName = (className) => {
  const parts = (className || '')
    .split(' - ')
    .map((part) => part.trim())
    .filter(Boolean)
  if (parts.length >= 2 && parts[0].toLowerCase() === parts[1].toLowerCase()) {
    parts.splice(1, 1)
  }
  return parts.join(' - ')
}

const mapStudentOption = (student) => {
  const regId = student.reg_Id ?? student.Reg_Id
  const fullName = student.fullName ?? student.FullName ?? 'Student'
  const className = normalizeClassName(student.className ?? student.ClassName)
  return {
    value: regId,
    label: className ? `${fullName} (${className})` : fullName,
    student,
  }
}

function matchesPolarity(note, filter) {
  if (filter === 'all') return true
  const polarity = notePolarity(note)
  if (filter === 'good') return polarity === 'good' || polarity === 'mixed'
  if (filter === 'bad') return polarity === 'bad' || polarity === 'mixed'
  return true
}

function ReportNoteCard({ note, showStudent }) {
  return (
    <div className={`rounded-xl border px-3 py-2.5 ${polarityCardClass(notePolarity(note))}`}>
      {showStudent ? (
        <p className="text-sm font-semibold text-slate-900">{note.studentName}</p>
      ) : null}
      <p className={`text-sm ${showStudent ? 'mt-0.5 text-slate-800' : 'font-semibold text-slate-900'}`}>
        {note.conductTypeName}
        {note.tags?.length ? ` · ${note.tags.map((tag) => tag.name).join(', ')}` : ''}
      </p>
      {note.remarks ? <p className="mt-1 text-sm text-slate-700">{note.remarks}</p> : null}
      {note.recordedByName ? (
        <p className="mt-1 text-[11px] text-slate-400">By {note.recordedByName}</p>
      ) : null}
    </div>
  )
}

function EmployeeConductReportPage() {
  const todayParts = useMemo(() => getPakistanTodayParts(), [])
  const [tab, setTab] = useState('date')
  const [date, setDate] = useState(getPakistanToday)
  const [filter, setFilter] = useState('all')
  const [classFilter, setClassFilter] = useState('all')
  const [searchText, setSearchText] = useState('')
  const [report, setReport] = useState(null)
  const [loadingDate, setLoadingDate] = useState(false)
  const [dateError, setDateError] = useState('')

  const [selected, setSelected] = useState(null)
  const [year, setYear] = useState(todayParts.year)
  const [month, setMonth] = useState(todayParts.month)
  const [studentFilter, setStudentFilter] = useState('all')
  const [history, setHistory] = useState(null)
  const [loadingStudent, setLoadingStudent] = useState(false)
  const [studentError, setStudentError] = useState('')

  const canGoNext = year < todayParts.year || (year === todayParts.year && month < todayParts.month)

  const loadStudentOptions = useRef(
    debouncePromise(async (inputValue) => {
      const term = inputValue?.trim()
      if (!term || term.length < 2) return []
      const items = await searchStudents(term, 20)
      return items.map(mapStudentOption)
    }, 300),
  ).current

  useEffect(() => {
    if (tab !== 'date') return
    if (!date) {
      setReport(null)
      return
    }
    let active = true
    const load = async () => {
      setLoadingDate(true)
      setDateError('')
      try {
        const data = await getConductDayReport({ date })
        if (active) setReport(data || null)
      } catch (err) {
        if (!active) return
        setReport(null)
        setDateError(err?.response?.data?.message || 'Unable to load this day’s notes.')
      } finally {
        if (active) setLoadingDate(false)
      }
    }
    void load()
    return () => {
      active = false
    }
  }, [tab, date])

  const loadHistory = useCallback(async (studentId, targetYear, targetMonth) => {
    setLoadingStudent(true)
    setStudentError('')
    try {
      const data = await getStudentConductHistory(studentId, { year: targetYear, month: targetMonth })
      setHistory(data || null)
    } catch (err) {
      setHistory(null)
      setStudentError(err?.response?.data?.message || 'Unable to load this student’s notes.')
    } finally {
      setLoadingStudent(false)
    }
  }, [])

  useEffect(() => {
    if (tab !== 'student' || !selected?.value) {
      if (!selected?.value) setHistory(null)
      return
    }
    void loadHistory(selected.value, year, month)
  }, [tab, selected, year, month, loadHistory])

  const filteredClasses = useMemo(() => {
    const query = searchText.trim().toLowerCase()
    return (report?.classes || [])
      .filter((group) => classFilter === 'all' || group.className === classFilter)
      .map((group) => ({
        ...group,
        notes: (group.notes || []).filter((note) => {
          if (!matchesPolarity(note, filter)) return false
          if (!query) return true
          return String(note.studentName || '').toLowerCase().includes(query)
        }),
      }))
      .filter((group) => group.notes.length > 0)
  }, [report, filter, classFilter, searchText])

  const studentNotesByDate = useMemo(() => {
    const notes = (history?.notes || []).filter((note) => matchesPolarity(note, studentFilter))
    const groups = []
    const byDate = new Map()
    for (const note of notes) {
      const iso = noteDateKey(note.noteDate)
      if (!byDate.has(iso)) {
        const group = { date: iso, notes: [] }
        byDate.set(iso, group)
        groups.push(group)
      }
      byDate.get(iso).notes.push(note)
    }
    groups.sort((a, b) => b.date.localeCompare(a.date))
    return groups
  }, [history, studentFilter])

  const studentSummary = useMemo(() => {
    const notes = history?.notes || []
    let good = 0
    let bad = 0
    for (const note of notes) {
      const polarity = notePolarity(note)
      if (polarity === 'good' || polarity === 'mixed') good += 1
      if (polarity === 'bad' || polarity === 'mixed') bad += 1
    }
    return { total: notes.length, good, bad }
  }, [history])

  return (
    <EmployeeLayout
      title="Conduct Report"
      subtitle="All classes, or one student"
      showQuickTiles={false}
      showProfileCard={false}
      compactContentTop
    >
      <EmployeeBackButton />

      <div className="inline-flex w-full rounded-full bg-slate-100 p-1">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`flex-1 rounded-full px-3 py-2 text-sm font-semibold ${
              tab === item.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'date' ? (
        <div className="space-y-3">
          <section className="emp-surface rounded-2xl p-4">
            <label className="text-xs font-medium text-slate-600">
              Date
              <input
                type="date"
                value={date}
                onChange={(event) => {
                  setDate(event.target.value)
                  setFilter('all')
                  setClassFilter('all')
                  setSearchText('')
                }}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              />
            </label>
          </section>

          {loadingDate ? (
            <section className="emp-surface rounded-2xl p-4 text-sm text-slate-600">
              <div className="flex items-center gap-2">
                <Loader2 size={18} className="animate-spin text-indigo-600" />
                Loading…
              </div>
            </section>
          ) : dateError ? (
            <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{dateError}</p>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'all', label: 'All', value: report?.totalCount ?? 0, tone: 'bg-slate-100 text-slate-800' },
                  { id: 'good', label: 'Good', value: report?.goodCount ?? 0, tone: 'bg-emerald-50 text-emerald-800' },
                  { id: 'bad', label: 'Needs work', value: report?.badCount ?? 0, tone: 'bg-rose-50 text-rose-800' },
                ].map((tile) => (
                  <button
                    key={tile.id}
                    type="button"
                    onClick={() => setFilter(tile.id)}
                    className={`rounded-2xl px-2 py-3 text-center ${tile.tone} ${
                      filter === tile.id ? 'ring-2 ring-indigo-400 ring-offset-1' : ''
                    }`}
                  >
                    <p className="text-xl font-bold leading-none">{tile.value}</p>
                    <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide">{tile.label}</p>
                  </button>
                ))}
              </div>

              {(report?.classes || []).length > 1 ? (
                <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5">
                  <button
                    type="button"
                    onClick={() => setClassFilter('all')}
                    className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${
                      classFilter === 'all'
                        ? 'bg-slate-900 text-white'
                        : 'bg-white text-slate-600 ring-1 ring-slate-200'
                    }`}
                  >
                    All classes
                  </button>
                  {(report?.classes || []).map((group) => (
                    <button
                      key={group.className}
                      type="button"
                      onClick={() => setClassFilter(group.className)}
                      className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${
                        classFilter === group.className
                          ? 'bg-slate-900 text-white'
                          : 'bg-white text-slate-600 ring-1 ring-slate-200'
                      }`}
                    >
                      {group.className}
                      <span className="ml-1 opacity-70">{group.count ?? group.notes?.length ?? 0}</span>
                    </button>
                  ))}
                </div>
              ) : null}

              {(report?.totalCount ?? 0) > 0 ? (
                <input
                  type="search"
                  value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
                  placeholder="Find a student"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                />
              ) : null}

              {(filteredClasses.length === 0) ? (
                <section className="emp-surface rounded-2xl px-4 py-10 text-center text-sm text-slate-500">
                  {searchText.trim() || filter !== 'all' || classFilter !== 'all'
                    ? 'No matching notes.'
                    : 'No notes recorded for this date.'}
                </section>
              ) : (
                filteredClasses.map((group) => (
                  <section key={group.className} className="emp-surface rounded-2xl p-4">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold text-slate-900">{group.className}</h3>
                      <span className="text-[11px] font-medium text-slate-500">{group.notes.length}</span>
                    </div>
                    <ul className="mt-3 space-y-2">
                      {group.notes.map((note) => (
                        <li key={note.id}>
                          <ReportNoteCard note={note} showStudent />
                        </li>
                      ))}
                    </ul>
                  </section>
                ))
              )}
            </>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <section className="emp-surface rounded-2xl p-4">
            <label className="text-xs font-medium text-slate-600">
              Student
              <div className="mt-1">
                <AsyncSelect
                  cacheOptions
                  defaultOptions={false}
                  isClearable
                  placeholder="Type a name…"
                  loadOptions={loadStudentOptions}
                  value={selected}
                  onChange={(option) => {
                    setSelected(option)
                    setYear(todayParts.year)
                    setMonth(todayParts.month)
                    setStudentFilter('all')
                  }}
                  noOptionsMessage={({ inputValue }) =>
                    inputValue?.trim().length >= 2 ? 'No matching students' : 'Type at least 2 letters'
                  }
                  styles={{
                    control: (base) => ({
                      ...base,
                      minHeight: '44px',
                      borderRadius: '0.75rem',
                      borderColor: '#cbd5e1',
                      boxShadow: 'none',
                    }),
                    menu: (base) => ({ ...base, zIndex: 70, borderRadius: '0.75rem' }),
                  }}
                />
              </div>
            </label>
          </section>

          {!selected ? (
            <section className="emp-surface rounded-2xl px-4 py-10 text-center text-sm text-slate-500">
              Search for a student to see their notes this month.
            </section>
          ) : (
            <>
              <section className="emp-surface rounded-2xl p-4">
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const next = shiftMonth(year, month, -1)
                      setYear(next.year)
                      setMonth(next.month)
                    }}
                    className="emp-icon-btn"
                    aria-label="Previous month"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <p className="min-w-0 truncate text-center text-sm font-semibold text-slate-900">
                    {formatMonthLabel(year, month)}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      if (!canGoNext) return
                      const next = shiftMonth(year, month, 1)
                      setYear(next.year)
                      setMonth(next.month)
                    }}
                    disabled={!canGoNext}
                    className="emp-icon-btn disabled:opacity-40"
                    aria-label="Next month"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              </section>

              {loadingStudent ? (
                <section className="emp-surface rounded-2xl p-4 text-sm text-slate-600">
                  <div className="flex items-center gap-2">
                    <Loader2 size={18} className="animate-spin text-indigo-600" />
                    Loading…
                  </div>
                </section>
              ) : studentError ? (
                <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{studentError}</p>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'all', label: 'All', value: studentSummary.total, tone: 'bg-slate-100 text-slate-800' },
                      { id: 'good', label: 'Good', value: studentSummary.good, tone: 'bg-emerald-50 text-emerald-800' },
                      { id: 'bad', label: 'Needs work', value: studentSummary.bad, tone: 'bg-rose-50 text-rose-800' },
                    ].map((tile) => (
                      <button
                        key={tile.id}
                        type="button"
                        onClick={() => setStudentFilter(tile.id)}
                        className={`rounded-2xl px-2 py-3 text-center ${tile.tone} ${
                          studentFilter === tile.id ? 'ring-2 ring-indigo-400 ring-offset-1' : ''
                        }`}
                      >
                        <p className="text-xl font-bold leading-none">{tile.value}</p>
                        <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide">{tile.label}</p>
                      </button>
                    ))}
                  </div>

                  {studentNotesByDate.length === 0 ? (
                    <section className="emp-surface rounded-2xl px-4 py-10 text-center text-sm text-slate-500">
                      {studentFilter === 'all' ? 'No notes this month.' : 'No matching notes this month.'}
                    </section>
                  ) : (
                    studentNotesByDate.map((group) => (
                      <section key={group.date} className="emp-surface rounded-2xl p-4">
                        <h3 className="text-sm font-semibold text-slate-900">{formatDayLabel(group.date)}</h3>
                        <ul className="mt-3 space-y-2">
                          {group.notes.map((note) => (
                            <li key={note.id}>
                              <ReportNoteCard note={note} showStudent={false} />
                            </li>
                          ))}
                        </ul>
                      </section>
                    ))
                  )}
                </>
              )}
            </>
          )}
        </div>
      )}
    </EmployeeLayout>
  )
}

export default EmployeeConductReportPage
