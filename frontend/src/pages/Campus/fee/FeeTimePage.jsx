import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Clock3, Search, Save, Pencil, RefreshCw, X, Loader2, CalendarClock } from 'lucide-react'
import AsyncSelect from 'react-select/async'
import { toast } from 'sonner'
import CampusShell from '../../../components/campus/CampusShell.jsx'
import {
  getFeeTimes,
  getStudentFeeTime,
  searchFeeTimeStudents,
  saveStudentFeeTime,
  removeStudentFeeTime,
} from '../../../services/feeTimeService'

const field =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-[var(--campus-primary)] focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-50'
const primary =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--campus-primary)] px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50'
const errorMessage = (error, fallback) => error?.response?.data?.message || fallback
const studentOption = (row) => ({
  value: row.regId,
  label: `#${row.regId} · ${row.fullName || 'Student'}${row.className ? ` · ${row.className}` : ''}`,
})
const selectStyles = {
  control: (base, state) => ({
    ...base,
    minHeight: 44,
    borderRadius: 12,
    borderColor: state.isFocused ? 'var(--campus-primary)' : '#e2e8f0',
    boxShadow: state.isFocused ? '0 0 0 2px #e0e7ff' : 'none',
    fontSize: 14,
    '&:hover': { borderColor: 'var(--campus-primary)' },
  }),
  menu: (base) => ({ ...base, zIndex: 30, fontSize: 13 }),
  option: (base) => ({ ...base, whiteSpace: 'normal' }),
}
const dateLabel = (value) =>
  value
    ? new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(
        new Date(value),
      )
    : '—'

export default function FeeTimePage() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [searchMode, setSearchMode] = useState('reg')
  const [searchText, setSearchText] = useState('')
  const [selectedOption, setSelectedOption] = useState(null)
  const [student, setStudent] = useState(null)
  const [feeTime, setFeeTime] = useState('')
  const [lookingUp, setLookingUp] = useState(false)
  const [saving, setSaving] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [removeTarget, setRemoveTarget] = useState(null)
  const [search, setSearch] = useState('')
  const [classFilter, setClassFilter] = useState('')
  const [page, setPage] = useState(1)
  const lookupVersion = useRef(0)
  const searchTimer = useRef(null)
  const searchRef = useRef(null)
  const focusFeeWhenReady = useRef(false)
  const focusSearchWhenReady = useRef(false)
  const listVersion = useRef(0)
  const editorRef = useRef(null)
  const dialogRef = useRef(null)
  const removeTriggerRef = useRef(null)
  const removingRef = useRef(false)
  const busy = saving || removing || lookingUp

  const refresh = useCallback(async () => {
    const version = ++listVersion.current
    setLoading(true)
    setLoadError('')
    try {
      const items = await getFeeTimes()
      if (version === listVersion.current) setRows(items || [])
    } catch (error) {
      if (version === listVersion.current) {
        setLoadError(errorMessage(error, 'Could not load fee times. Please try again.'))
      }
    } finally {
      if (version === listVersion.current) setLoading(false)
    }
  }, [])
  useEffect(() => {
    refresh()
  }, [refresh])
  useEffect(
    () => () => {
      lookupVersion.current += 1
      listVersion.current += 1
      clearTimeout(searchTimer.current)
    },
    [],
  )
  useEffect(() => {
    if (focusFeeWhenReady.current && student && !lookingUp && !saving) {
      focusFeeWhenReady.current = false
      editorRef.current?.focus()
      editorRef.current?.select()
    }
    if (focusSearchWhenReady.current && !saving) {
      focusSearchWhenReady.current = false
      searchRef.current?.focus()
    }
  }, [student, lookingUp, saving])
  useEffect(() => {
    removingRef.current = removing
  }, [removing])
  useEffect(() => {
    if (!removeTarget) return undefined
    const previousFocus = removeTriggerRef.current
    const focusFrame = requestAnimationFrame(() => dialogRef.current?.querySelector('[data-cancel]')?.focus())
    const handleKey = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        if (!removingRef.current) setRemoveTarget(null)
      }
      if (event.key !== 'Tab') return
      const controls = dialogRef.current?.querySelectorAll('button:not(:disabled)')
      if (!controls?.length) {
        event.preventDefault()
        return
      }
      const first = controls[0]
      const last = controls[controls.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      }
      if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => {
      cancelAnimationFrame(focusFrame)
      document.removeEventListener('keydown', handleKey)
      if (previousFocus?.isConnected) previousFocus.focus()
      else document.getElementById('fee-time-reg')?.focus()
    }
  }, [removeTarget])

  const classes = useMemo(() => [...new Set(rows.map((row) => row.className).filter(Boolean))].sort(), [rows])
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return rows.filter(
      (row) =>
        (!classFilter || row.className === classFilter) &&
        (!term ||
          [row.regId, row.fullName, row.fatherName, row.className, row.feeTime].some((value) =>
            String(value || '')
              .toLowerCase()
              .includes(term),
          )),
    )
  }, [rows, search, classFilter])
  const pages = Math.max(1, Math.ceil(filtered.length / 15))
  const currentPage = Math.min(page, pages)
  const visible = filtered.slice((currentPage - 1) * 15, currentPage * 15)

  const loadOptions = useCallback(
    (input, callback) => {
      clearTimeout(searchTimer.current)
      const term = input.trim()
      if (!term || (searchMode === 'name' && term.length < 2)) {
        callback([])
        return
      }
      const version = lookupVersion.current
      searchTimer.current = setTimeout(async () => {
        try {
          const items = await searchFeeTimeStudents(term, searchMode)
          if (version === lookupVersion.current) callback((items || []).map(studentOption))
        } catch (error) {
          if (version === lookupVersion.current) {
            callback([])
            toast.error(errorMessage(error, 'Could not search students.'))
          }
        }
      }, 250)
    },
    [searchMode],
  )

  async function selectStudent(option) {
    const version = ++lookupVersion.current
    setSelectedOption(option)
    setSearchText('')
    setStudent(null)
    setFeeTime('')
    if (!option) return
    setLookingUp(true)
    try {
      const detail = await getStudentFeeTime(option.value)
      if (version !== lookupVersion.current) return
      focusFeeWhenReady.current = true
      setStudent(detail)
      setFeeTime(detail.feeTime || '')
    } catch (error) {
      if (version === lookupVersion.current) toast.error(errorMessage(error, 'Could not find this student.'))
    } finally {
      if (version === lookupVersion.current) setLookingUp(false)
    }
  }

  function changeSearchMode(mode) {
    lookupVersion.current += 1
    clearTimeout(searchTimer.current)
    setSearchMode(mode)
    setSearchText('')
    setSelectedOption(null)
    setStudent(null)
    setFeeTime('')
    requestAnimationFrame(() => searchRef.current?.focus())
  }

  function edit(row) {
    lookupVersion.current += 1
    setLookingUp(false)
    setSelectedOption(studentOption(row))
    setSearchText('')
    focusFeeWhenReady.current = true
    setStudent(row)
    setFeeTime(row.feeTime || '')
    editorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  async function save(event) {
    event.preventDefault()
    if (document.activeElement?.id === 'fee-time-reg') return
    if (!student || !feeTime.trim() || busy) return
    setSaving(true)
    try {
      await saveStudentFeeTime(student.regId, feeTime.trim())
      focusSearchWhenReady.current = true
      setStudent(null)
      setSelectedOption(null)
      setSearchText('')
      setFeeTime('')
      toast.success('Fee time saved.')
      void refresh()
    } catch (error) {
      toast.error(errorMessage(error, 'Could not save fee time.'))
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    if (!removeTarget || busy) return
    setRemoving(true)
    try {
      const cleared = await removeStudentFeeTime(removeTarget.regId)
      if (student?.regId === removeTarget.regId) {
        setStudent(cleared)
        setFeeTime('')
      }
      setRemoveTarget(null)
      toast.success('Fee time removed. You can set it again at any time.')
      await refresh()
    } catch (error) {
      toast.error(errorMessage(error, 'Could not remove fee time.'))
    } finally {
      setRemoving(false)
    }
  }

  return (
    <CampusShell headerContext="Fee Time">
      <main className="min-h-screen bg-slate-50 px-4 pb-8 pt-[4.5rem] md:px-6 md:pt-[5rem]">
        <div className="mx-auto max-w-[1800px] space-y-6">
          <header className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-indigo-100 p-3 text-[var(--campus-primary)]">
                <Clock3 size={25} />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                  Fee management
                </p>
                <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Fee time</h1>
                <p className="mt-1 text-sm text-slate-500">
                  Keep each student's agreed payment timing in one place.
                </p>
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-500">
              <span className="mr-2 font-bold text-slate-900">
                {loading || loadError ? '—' : rows.length}
              </span>{' '}
              defined fee times
            </div>
          </header>

          <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,7fr)]">
            <form
              onSubmit={save}
              aria-label="Fee time entry"
              className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-20"
            >
              <h2 className="flex items-center gap-2 font-semibold text-slate-900">
                <CalendarClock size={18} className="text-[var(--campus-primary)]" />{' '}
                {student?.feeTime ? 'Update fee time' : 'Set fee time'}
              </h2>
              <p className="mt-1 text-sm text-slate-500">Find a student and set their payment timing.</p>
              <fieldset disabled={busy} className="mt-5">
                <legend className="mb-2 text-xs font-semibold text-slate-600">Search by</legend>
                <div className="flex flex-wrap gap-4 text-sm text-slate-700">
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      name="fee-time-search-mode"
                      value="reg"
                      checked={searchMode === 'reg'}
                      onChange={() => changeSearchMode('reg')}
                      className="accent-[var(--campus-primary)]"
                    />
                    Reg no
                  </label>
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      name="fee-time-search-mode"
                      value="name"
                      checked={searchMode === 'name'}
                      onChange={() => changeSearchMode('name')}
                      className="accent-[var(--campus-primary)]"
                    />
                    Name
                  </label>
                </div>
              </fieldset>
              <label htmlFor="fee-time-reg" className="mb-2 mt-5 block text-xs font-semibold text-slate-600">
                {searchMode === 'reg' ? 'Student registration ID' : 'Student name'}
              </label>
              <AsyncSelect
                key={searchMode}
                ref={searchRef}
                inputId="fee-time-reg"
                instanceId="fee-time-student"
                value={selectedOption}
                inputValue={searchText}
                loadOptions={loadOptions}
                onChange={selectStudent}
                onInputChange={(value, meta) => {
                  setSearchText(value)
                  if (meta.action === 'input-change') {
                    setSelectedOption(null)
                    setStudent(null)
                    setFeeTime('')
                  }
                }}
                onKeyDown={(event) => {
                  if (
                    event.key === 'Enter' &&
                    !event.nativeEvent.isComposing &&
                    student &&
                    !searchText.trim()
                  ) {
                    event.preventDefault()
                    editorRef.current?.focus()
                    editorRef.current?.select()
                  }
                }}
                isDisabled={busy}
                isLoading={lookingUp}
                isClearable
                autoFocus
                openMenuOnFocus={false}
                filterOption={null}
                styles={selectStyles}
                placeholder={searchMode === 'reg' ? 'Enter exact registration ID' : 'Type a student name…'}
                noOptionsMessage={({ inputValue }) =>
                  !inputValue.trim()
                    ? 'Start typing to find a student'
                    : searchMode === 'name' && inputValue.trim().length < 2
                      ? 'Enter at least 2 characters'
                      : 'No matching student'
                }
                loadingMessage={() => 'Searching students…'}
              />
              <label
                htmlFor="fee-time-student-detail"
                className="mb-2 mt-5 block text-xs font-semibold text-slate-600"
              >
                Selected student / class
              </label>
              <input
                id="fee-time-student-detail"
                className={`${field} disabled:text-slate-600`}
                disabled
                value={
                  student
                    ? `${student.fullName || 'Student'} | ${student.className || 'No class assigned'}`
                    : ''
                }
                placeholder={lookingUp ? 'Loading student…' : 'Select a student above'}
                title={
                  student
                    ? `${student.fullName || 'Student'} | ${student.className || 'No class assigned'}`
                    : ''
                }
              />
              <label
                htmlFor="fee-time-value"
                className="mb-2 mt-5 block text-xs font-semibold text-slate-600"
              >
                Payment timing or reference
              </label>
              <textarea
                ref={editorRef}
                id="fee-time-value"
                rows={3}
                maxLength={500}
                className={field}
                placeholder={student ? 'e.g. 25 every month' : 'Find a student to get started'}
                disabled={!student || busy}
                value={feeTime}
                onChange={(event) => setFeeTime(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return
                  event.preventDefault()
                  if (!event.repeat) void save(event)
                }}
                required
              />
              <div className="mt-2 flex justify-between gap-3 text-xs text-slate-400">
                <span>Enter to save · Shift+Enter for a new line</span>
                <span>{feeTime.length}/500</span>
              </div>
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-slate-400">
                  {student?.updatedAt
                    ? `Last updated ${dateLabel(student.updatedAt)}`
                    : 'Saved fee times appear in the list.'}
                </p>
                <button className={primary} disabled={!student || busy || !feeTime.trim()}>
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save fee time
                </button>
              </div>
            </form>

            <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5">
                <div>
                  <h2 className="font-semibold text-slate-900">Defined fee times</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    View, edit, or temporarily remove a student's fee time.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={refresh}
                  disabled={loading || busy}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 disabled:opacity-50"
                >
                  <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
                </button>
              </div>
              <div className="flex flex-col gap-3 p-5 sm:flex-row">
                <div className="relative flex-1">
                  <Search size={16} className="absolute left-3 top-3 text-slate-400" />
                  <input
                    aria-label="Search defined fee times"
                    className={`${field} pl-10`}
                    placeholder="Search student, father, registration ID, or fee time…"
                    value={search}
                    onChange={(event) => {
                      setSearch(event.target.value)
                      setPage(1)
                    }}
                  />
                </div>
                <select
                  aria-label="Filter by class"
                  className={`${field} sm:max-w-52`}
                  value={classFilter}
                  onChange={(event) => {
                    setClassFilter(event.target.value)
                    setPage(1)
                  }}
                >
                  <option value="">All classes</option>
                  {classes.map((name) => (
                    <option key={name}>{name}</option>
                  ))}
                </select>
              </div>
              {loadError ? (
                <div role="alert" className="px-5 pb-6 text-sm text-rose-600">
                  {loadError}{' '}
                  <button onClick={refresh} className="font-semibold underline">
                    Try again
                  </button>
                </div>
              ) : loading ? (
                <div
                  role="status"
                  className="flex items-center justify-center gap-2 p-12 text-sm text-slate-500"
                >
                  <Loader2 size={18} className="animate-spin" /> Loading fee times…
                </div>
              ) : !filtered.length ? (
                <div className="px-5 py-12 text-center">
                  <Clock3 size={30} className="mx-auto mb-3 text-slate-300" />
                  <p className="text-sm font-medium text-slate-700">
                    {rows.length ? 'No matching fee times' : 'No fee times defined yet'}
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    {rows.length
                      ? 'Try a different search or class.'
                      : 'Find a student in the entry form and save their payment timing.'}
                  </p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[850px] text-left text-sm">
                      <thead className="border-y border-slate-100 bg-slate-50 text-xs text-slate-500">
                        <tr>
                          {[
                            'Reg ID',
                            'Student',
                            'Father',
                            'Class',
                            'Last updated',
                            'Fee time',
                            'Actions',
                          ].map((label) => (
                            <th key={label} className="px-5 py-3 font-medium">
                              {label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {visible.map((row) => (
                          <tr key={row.regId} className="transition hover:bg-slate-50/70">
                            <td className="px-5 py-4 font-medium tabular-nums text-slate-500">
                              #{row.regId}
                            </td>
                            <td className="px-5 py-4 font-semibold text-slate-800">{row.fullName || '—'}</td>
                            <td className="px-5 py-4 text-slate-500">{row.fatherName || '—'}</td>
                            <td className="px-5 py-4 text-slate-600">{row.className || '—'}</td>
                            <td className="whitespace-nowrap px-5 py-4 text-xs text-slate-500">
                              {dateLabel(row.updatedAt)}
                            </td>
                            <td className="max-w-72 whitespace-pre-wrap break-words px-5 py-4 text-slate-700">
                              {row.feeTime}
                            </td>
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  aria-label={`Edit fee time for ${row.fullName || row.regId}`}
                                  disabled={busy}
                                  onClick={() => edit(row)}
                                  className="rounded-lg p-2 text-slate-500 hover:bg-indigo-50 hover:text-indigo-700 disabled:opacity-40"
                                >
                                  <Pencil size={16} />
                                </button>
                                <button
                                  type="button"
                                  aria-label={`Remove fee time for ${row.fullName || row.regId}`}
                                  disabled={busy}
                                  onClick={(event) => {
                                    removeTriggerRef.current = event.currentTarget
                                    setRemoveTarget(row)
                                  }}
                                  className="rounded-lg px-2 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-40"
                                >
                                  Remove
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-5 py-4 text-xs text-slate-500">
                    <span>
                      {(currentPage - 1) * 15 + 1}–{Math.min(currentPage * 15, filtered.length)} of{' '}
                      {filtered.length}
                    </span>
                    <div className="flex items-center gap-3">
                      <button
                        disabled={currentPage === 1}
                        onClick={() => setPage(currentPage - 1)}
                        className="rounded-lg border border-slate-200 px-3 py-2 disabled:opacity-40"
                      >
                        Previous
                      </button>
                      <span>
                        {currentPage} / {pages}
                      </span>
                      <button
                        disabled={currentPage === pages}
                        onClick={() => setPage(currentPage + 1)}
                        className="rounded-lg border border-slate-200 px-3 py-2 disabled:opacity-40"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </>
              )}
            </section>
          </div>
        </div>
      </main>
      {removeTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 p-4">
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="fee-time-remove-title"
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="flex items-center justify-between">
              <h2 id="fee-time-remove-title" className="text-lg font-semibold text-slate-900">
                Remove fee time?
              </h2>
              <button
                aria-label="Close"
                disabled={removing}
                onClick={() => setRemoveTarget(null)}
                className="rounded-lg p-1 text-slate-400"
              >
                <X size={20} />
              </button>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              Remove the fee time for{' '}
              <strong className="text-slate-700">
                {removeTarget.fullName} (#{removeTarget.regId})
              </strong>{' '}
              from this list? You can define it again later.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                data-cancel
                disabled={removing}
                onClick={() => setRemoveTarget(null)}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600"
              >
                Cancel
              </button>
              <button
                disabled={removing}
                onClick={remove}
                className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {removing && <Loader2 size={16} className="animate-spin" />} Remove fee time
              </button>
            </div>
          </div>
        </div>
      )}
    </CampusShell>
  )
}
