import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Loader2, Lock, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { EmployeeAsyncSelect as AsyncSelect } from '../../components/employee/EmployeeSelect'
import EmployeeLayout from '../../components/employee/EmployeeLayout'
import {
  deleteDisciplineFinding,
  getMyDisciplineDay,
  saveDisciplineFinding,
  saveDisciplineRound,
  submitDisciplineDayReport,
} from '../../services/disciplineService'
import { searchStudents } from '../../services/studentService'

const STATUSES = [
  { id: 'Clear', label: 'Clear' },
  { id: 'Issue', label: 'Issue' },
  { id: 'Skipped', label: 'Skipped' },
]

const KINDS = [
  { id: 'Concern', label: 'Concern' },
  { id: 'Praise', label: 'Praise' },
  { id: 'Note', label: 'Worth noting' },
]

const KIND_LABEL = Object.fromEntries(KINDS.map((item) => [item.id, item.label]))

const pakistanToday = () => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Karachi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const year = parts.find((part) => part.type === 'year')?.value
  const month = parts.find((part) => part.type === 'month')?.value
  const day = parts.find((part) => part.type === 'day')?.value
  return `${year}-${month}-${day}`
}

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

const mapStudentOption = (student) => {
  const regId = student.reg_Id ?? student.Reg_Id
  const fullName = student.fullName ?? student.FullName ?? 'Student'
  const className = student.className ?? student.ClassName ?? ''
  return {
    value: regId,
    label: className ? `${fullName} (${className})` : fullName,
  }
}

const shiftIsoDate = (iso, delta) => {
  const [year, month, day] = String(iso).split('-').map(Number)
  const next = new Date(Date.UTC(year, month - 1, day + delta))
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}-${String(next.getUTCDate()).padStart(2, '0')}`
}

const formatDayLabel = (iso) => {
  const [year, month, day] = String(iso).split('-').map(Number)
  if (!year || !month || !day) return iso
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, day)))
}

const emptyFinding = (place = '', roundId = null) => ({
  id: null,
  kind: 'Concern',
  place,
  roundId,
  whatHappened: '',
  whatWasDone: '',
  students: [],
})

function statusClass(status, active) {
  if (!active) return 'border-[var(--emp-border)] bg-white text-[var(--emp-text-muted)]'
  if (status === 'Clear') return 'border-[var(--emp-success)] bg-[var(--emp-success-soft)] text-[var(--emp-success)]'
  if (status === 'Issue') return 'border-[var(--emp-danger)] bg-[var(--emp-danger-soft)] text-[var(--emp-danger)]'
  return 'border-[var(--emp-warning)] bg-[var(--emp-warning-soft)] text-[var(--emp-warning)]'
}

export default function EmployeeDisciplinePage() {
  const today = useMemo(() => pakistanToday(), [])
  const [selectedDate, setSelectedDate] = useState(today)
  const [day, setDay] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [notes, setNotes] = useState({})
  const [finding, setFinding] = useState(null)
  const [savingFinding, setSavingFinding] = useState(false)
  const [report, setReport] = useState({ whatWasDone: '', anythingElse: '' })
  const [submitting, setSubmitting] = useState(false)

  const pendingStatus = useRef({})
  const loadStudentOptions = useRef(
    debouncePromise(async (inputValue) => {
      const term = inputValue?.trim()
      if (!term || term.length < 2) return []
      const items = await searchStudents(term, 20)
      return items.map(mapStudentOption)
    }, 300),
  ).current

  const applyDay = useCallback((data) => {
    setDay(data)
    const nextNotes = {}
    for (const round of data?.rounds || []) nextNotes[round.id] = round.note || ''
    setNotes(nextNotes)
    setReport({
      whatWasDone: data?.report?.whatWasDone || '',
      anythingElse: data?.report?.anythingElse || '',
    })
  }, [])

  useEffect(() => {
    let active = true
    setLoading(true)
    setLoadError('')
    setFinding(null)
    getMyDisciplineDay(selectedDate)
      .then((data) => {
        if (active) applyDay(data)
      })
      .catch((error) => {
        if (!active) return
        const message = error?.response?.data?.message || 'Could not load this day.'
        setLoadError(message)
        toast.error(message)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [applyDay, selectedDate])

  const isToday = selectedDate === today
  const locked = !isToday || Boolean(day?.submitted)
  const rounds = day?.rounds || []
  const allMarked = rounds.length > 0 && rounds.every((round) => round.status)

  const onStatus = async (round, status) => {
    if (locked || round.status === status) return
    const previous = round.status
    pendingStatus.current[round.id] = status
    setDay((current) => ({
      ...current,
      rounds: (current?.rounds || []).map((item) =>
        item.id === round.id ? { ...item, status } : item,
      ),
    }))
    if (status === 'Issue') {
      setFinding(emptyFinding(round.name, round.id))
    }
    try {
      await saveDisciplineRound({
        date: today,
        roundId: round.id,
        status,
        note: notes[round.id] || '',
      })
    } catch (error) {
      if (pendingStatus.current[round.id] !== status) return
      setDay((current) => ({
        ...current,
        rounds: (current?.rounds || []).map((item) =>
          item.id === round.id ? { ...item, status: previous } : item,
        ),
      }))
      toast.error(error?.response?.data?.message || 'Could not save this round.')
    }
  }

  const onNoteBlur = async (round) => {
    if (locked || !round.status) return
    const note = notes[round.id] || ''
    if ((round.note || '') === note) return
    try {
      await saveDisciplineRound({
        date: today,
        roundId: round.id,
        status: round.status,
        note,
      })
      setDay((current) => ({
        ...current,
        rounds: (current?.rounds || []).map((item) =>
          item.id === round.id ? { ...item, note } : item,
        ),
      }))
    } catch (error) {
      setNotes((current) => ({ ...current, [round.id]: round.note || '' }))
      toast.error(error?.response?.data?.message || 'Could not save the note.')
    }
  }

  const onSaveFinding = async () => {
    if (!finding || locked) return
    if (!finding.place.trim() || !finding.whatHappened.trim()) {
      toast.error('Say where this was and what you found.')
      return
    }
    setSavingFinding(true)
    try {
      const data = await saveDisciplineFinding({
        id: finding.id,
        date: today,
        roundId: finding.roundId,
        kind: finding.kind,
        place: finding.place.trim(),
        whatHappened: finding.whatHappened.trim(),
        whatWasDone: finding.whatWasDone.trim(),
        studentIds: (finding.students || []).map((item) => item.value).filter(Boolean),
      })
      applyDay(data)
      setFinding(null)
      toast.success('Saved.')
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Could not save this finding.')
    } finally {
      setSavingFinding(false)
    }
  }

  const onDeleteFinding = async (id) => {
    if (locked) return
    try {
      const data = await deleteDisciplineFinding(id)
      applyDay(data)
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Could not remove this finding.')
    }
  }

  const onSubmit = async () => {
    if (locked || submitting) return
    if (!report.whatWasDone.trim()) {
      toast.error('Say what you did to keep discipline today.')
      return
    }
    setSubmitting(true)
    try {
      const data = await submitDisciplineDayReport({
        date: today,
        whatWasDone: report.whatWasDone.trim(),
        anythingElse: report.anythingElse.trim(),
      })
      applyDay(data)
      toast.success('Day report submitted.')
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Could not submit the day report.')
    } finally {
      setSubmitting(false)
    }
  }

  const editFinding = (item) => {
    if (locked) return
    setFinding({
      id: item.id,
      kind: item.kind,
      place: item.place,
      roundId: item.roundId,
      whatHappened: item.whatHappened,
      whatWasDone: item.whatWasDone || '',
      students: (item.students || []).map((student) => ({
        value: student.studentId,
        label: student.className ? `${student.studentName} (${student.className})` : student.studentName,
      })),
    })
  }

  return (
    <EmployeeLayout title="Discipline" subtitle="Rounds and day report" compactContentTop>
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-[var(--emp-primary)]" />
        </div>
      ) : loadError ? (
        <p className="rounded-2xl bg-[var(--emp-danger-soft)] px-4 py-3 text-sm text-[var(--emp-danger)]">{loadError}</p>
      ) : (
        <div className="space-y-4 pb-4">
          <div className="emp-surface flex items-center justify-between gap-2 rounded-2xl px-2 py-2">
            <button
              type="button"
              aria-label="Previous day"
              className="grid h-11 w-11 place-items-center rounded-xl text-[var(--emp-text)]"
              onClick={() => setSelectedDate((current) => shiftIsoDate(current, -1))}
            >
              <ChevronLeft size={20} />
            </button>
            <div className="min-w-0 text-center">
              <p className="text-sm font-semibold text-[var(--emp-text)]">{formatDayLabel(selectedDate)}</p>
              <p className="text-xs text-[var(--emp-text-muted)]">{isToday ? 'Today' : 'Earlier day'}</p>
            </div>
            <button
              type="button"
              aria-label="Next day"
              disabled={isToday}
              className="grid h-11 w-11 place-items-center rounded-xl text-[var(--emp-text)] disabled:opacity-30"
              onClick={() => setSelectedDate((current) => shiftIsoDate(current, 1))}
            >
              <ChevronRight size={20} />
            </button>
          </div>

          {locked ? (
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-slate-500">
                <Lock size={18} />
              </span>
              <span>
                <span className="block text-sm font-semibold text-slate-900">
                  {day?.submitted ? 'Day report submitted' : 'View only'}
                </span>
                <span className="block text-sm text-slate-500">
                  {day?.submitted ? 'This day is closed.' : 'Earlier days cannot be changed.'}
                </span>
              </span>
            </div>
          ) : null}

          <section className={`emp-surface space-y-3 rounded-2xl p-4 ${locked ? 'bg-slate-50' : ''}`}>
            <h2 className="text-base font-semibold text-[var(--emp-text)]">Rounds</h2>
            {rounds.map((round) => (
              <div key={round.id} className="border-t border-[var(--emp-border)] pt-3 first:border-t-0 first:pt-0">
                <p className="text-sm font-medium text-[var(--emp-text)]">{round.name}</p>
                {locked ? (
                  <p className="mt-2">
                    <span className={`inline-flex min-h-9 items-center rounded-full border px-3 text-sm font-semibold ${round.status ? statusClass(round.status, true) : 'border-slate-200 bg-white text-slate-400'}`}>
                      {round.status || 'Not marked'}
                    </span>
                  </p>
                ) : (
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {STATUSES.map((status) => (
                      <button
                        key={status.id}
                        type="button"
                        onClick={() => onStatus(round, status.id)}
                        className={`min-h-11 rounded-xl border px-2 text-sm font-semibold ${statusClass(status.id, round.status === status.id)}`}
                      >
                        {status.label}
                      </button>
                    ))}
                  </div>
                )}
                {locked ? (
                  round.note ? <p className="mt-2 text-sm text-slate-600">{round.note}</p> : null
                ) : (
                  <input
                    className="mt-2 w-full rounded-xl border border-[var(--emp-border)] px-3 py-2.5 text-sm"
                    placeholder="Short note"
                    value={notes[round.id] || ''}
                    disabled={!round.status}
                    onChange={(event) => setNotes((current) => ({ ...current, [round.id]: event.target.value }))}
                    onBlur={() => onNoteBlur(round)}
                  />
                )}
              </div>
            ))}
          </section>

          <section className={`emp-surface space-y-3 rounded-2xl p-4 ${locked ? 'bg-slate-50' : ''}`}>
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-[var(--emp-text)]">Findings</h2>
              {!locked ? (
                <button
                  type="button"
                  onClick={() => setFinding(emptyFinding())}
                  className="inline-flex min-h-11 items-center gap-1 rounded-xl bg-[var(--emp-primary)] px-3 text-sm font-semibold text-white"
                >
                  <Plus size={16} />
                  Add
                </button>
              ) : null}
            </div>
            {(day?.findings || []).length === 0 ? (
              <p className="text-sm text-[var(--emp-text-muted)]">Nothing recorded yet.</p>
            ) : (
              (day?.findings || []).map((item) => (
                <div key={item.id} className="rounded-xl border border-[var(--emp-border)] p-3">
                  <div className="flex items-start justify-between gap-2">
                    <button type="button" className="min-w-0 flex-1 text-left disabled:cursor-default" onClick={() => editFinding(item)} disabled={locked}>
                      <p className="text-sm font-semibold text-[var(--emp-text)]">
                        {KIND_LABEL[item.kind] || item.kind} · {item.place}
                      </p>
                      <p className="mt-1 text-sm text-[var(--emp-text)]">{item.whatHappened}</p>
                      {item.whatWasDone ? (
                        <p className="mt-1 text-sm text-[var(--emp-text-muted)]">{item.whatWasDone}</p>
                      ) : null}
                      {(item.students || []).length > 0 ? (
                        <p className="mt-1 text-xs text-[var(--emp-text-muted)]">
                          {(item.students || [])
                            .map((student) =>
                              student.className ? `${student.studentName} (${student.className})` : student.studentName,
                            )
                            .join(', ')}
                        </p>
                      ) : null}
                    </button>
                    {!locked ? (
                      <button
                        type="button"
                        aria-label="Remove finding"
                        className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-[var(--emp-danger)]"
                        onClick={() => onDeleteFinding(item.id)}
                      >
                        <Trash2 size={18} />
                      </button>
                    ) : null}
                  </div>
                </div>
              ))
            )}

            {finding && !locked ? (
              <div className="space-y-3 rounded-xl border border-[var(--emp-border)] p-3">
                <div className="grid grid-cols-3 gap-2">
                  {KINDS.map((kind) => (
                    <button
                      key={kind.id}
                      type="button"
                      onClick={() => setFinding((current) => ({ ...current, kind: kind.id }))}
                      className={`min-h-11 rounded-xl border px-1 text-xs font-semibold ${
                        finding.kind === kind.id
                          ? 'border-[var(--emp-primary)] bg-[var(--emp-primary-soft)] text-[var(--emp-primary)]'
                          : 'border-[var(--emp-border)] text-[var(--emp-text-muted)]'
                      }`}
                    >
                      {kind.label}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  {rounds.map((round) => (
                    <button
                      key={round.id}
                      type="button"
                      onClick={() => setFinding((current) => ({ ...current, place: round.name, roundId: round.id }))}
                      className={`rounded-full border px-3 py-2 text-xs font-medium ${
                        finding.place === round.name
                          ? 'border-[var(--emp-primary)] bg-[var(--emp-primary-soft)] text-[var(--emp-primary)]'
                          : 'border-[var(--emp-border)] text-[var(--emp-text-muted)]'
                      }`}
                    >
                      {round.name}
                    </button>
                  ))}
                </div>
                <input
                  className="w-full rounded-xl border border-[var(--emp-border)] px-3 py-2.5 text-sm"
                  placeholder="Place"
                  value={finding.place}
                  onChange={(event) => setFinding((current) => ({ ...current, place: event.target.value, roundId: null }))}
                />
                <textarea
                  className="min-h-24 w-full rounded-xl border border-[var(--emp-border)] px-3 py-2.5 text-sm"
                  placeholder="What happened"
                  value={finding.whatHappened}
                  onChange={(event) => setFinding((current) => ({ ...current, whatHappened: event.target.value }))}
                />
                <textarea
                  className="min-h-20 w-full rounded-xl border border-[var(--emp-border)] px-3 py-2.5 text-sm"
                  placeholder="What you did"
                  value={finding.whatWasDone}
                  onChange={(event) => setFinding((current) => ({ ...current, whatWasDone: event.target.value }))}
                />
                <AsyncSelect
                  isMulti
                  cacheOptions
                  defaultOptions={false}
                  loadOptions={loadStudentOptions}
                  value={finding.students}
                  onChange={(value) => setFinding((current) => ({ ...current, students: value || [] }))}
                  placeholder="Students, if any"
                  classNamePrefix="emp-select"
                />
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    className="min-h-11 rounded-xl border border-[var(--emp-border)] text-sm font-semibold"
                    onClick={() => setFinding(null)}
                    disabled={savingFinding}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="min-h-11 rounded-xl bg-[var(--emp-primary)] text-sm font-semibold text-white"
                    onClick={onSaveFinding}
                    disabled={savingFinding}
                  >
                    {savingFinding ? 'Saving…' : 'Save finding'}
                  </button>
                </div>
              </div>
            ) : null}
          </section>

          <section className={`emp-surface space-y-3 rounded-2xl p-4 ${locked ? 'bg-slate-50' : ''}`}>
            <h2 className="text-base font-semibold text-[var(--emp-text)]">Day report</h2>
            {locked ? (
              day?.report ? (
                <>
                  <p className="text-sm text-[var(--emp-text)]">{report.whatWasDone}</p>
                  {report.anythingElse ? (
                    <p className="text-sm text-[var(--emp-text-muted)]">{report.anythingElse}</p>
                  ) : null}
                </>
              ) : (
                <p className="text-sm text-[var(--emp-text-muted)]">No day report.</p>
              )
            ) : (
              <>
            <textarea
              className="min-h-28 w-full rounded-xl border border-[var(--emp-border)] px-3 py-2.5 text-sm"
              placeholder="What you did to keep discipline today"
              value={report.whatWasDone}
              onChange={(event) => setReport((current) => ({ ...current, whatWasDone: event.target.value }))}
            />
            <textarea
              className="min-h-20 w-full rounded-xl border border-[var(--emp-border)] px-3 py-2.5 text-sm"
              placeholder="Anything else — good, bad, or worth noting"
              value={report.anythingElse}
              onChange={(event) => setReport((current) => ({ ...current, anythingElse: event.target.value }))}
            />
              </>
            )}
            {!locked ? (
              <>
                {!allMarked ? (
                  <p className="text-sm text-[var(--emp-text-muted)]">Mark every round, then close the day.</p>
                ) : null}
                <button
                  type="button"
                  className="min-h-12 w-full rounded-xl bg-[var(--emp-primary)] text-sm font-semibold text-white disabled:opacity-60"
                  onClick={onSubmit}
                  disabled={submitting || !allMarked}
                >
                  {submitting ? 'Submitting…' : 'Submit day report'}
                </button>
              </>
            ) : null}
          </section>
        </div>
      )}
    </EmployeeLayout>
  )
}
