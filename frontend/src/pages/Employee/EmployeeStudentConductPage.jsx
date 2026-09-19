import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Loader2, Plus, X } from 'lucide-react'
import { EmployeeAsyncSelect as AsyncSelect } from '../../components/employee/EmployeeSelect'
import { toast } from 'sonner'
import EmployeeBackButton from '../../components/employee/EmployeeBackButton'
import EmployeeConductRecordSheet, {
  noteDateKey,
} from '../../components/employee/EmployeeConductRecordSheet'
import EmployeeLayout from '../../components/employee/EmployeeLayout'
import { searchStudents } from '../../services/studentService'
import {
  deleteConductNote,
  getConductCatalog,
  getStudentConductHistory,
  notePolarity,
  dayPolarity,
  polarityCardClass,
  upsertConductNote,
} from '../../services/studentConductService'

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

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

const pakistanParts = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Karachi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())

const getPakistanToday = () => {
  const parts = pakistanParts()
  return {
    year: Number(parts.find((p) => p.type === 'year')?.value),
    month: Number(parts.find((p) => p.type === 'month')?.value),
    day: Number(parts.find((p) => p.type === 'day')?.value),
  }
}

const toIsoDate = (year, month, day) =>
  `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`

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
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(parts[0], parts[1] - 1, parts[2])))
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

function NoteCard({ note, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-xl border px-3 py-2.5 text-left ${polarityCardClass(notePolarity(note))}`}
    >
      <p className="text-sm font-semibold text-slate-900">{note.conductTypeName}</p>
      {note.tags?.length ? (
        <p className="mt-0.5 text-xs text-slate-600">{note.tags.map((tag) => tag.name).join(', ')}</p>
      ) : null}
      {note.remarks ? <p className="mt-1 text-sm text-slate-700">{note.remarks}</p> : null}
      {note.recordedByName ? (
        <p className="mt-1 text-[11px] text-slate-400">By {note.recordedByName}</p>
      ) : null}
    </button>
  )
}

function EmployeeStudentConductPage() {
  const current = useMemo(() => getPakistanToday(), [])
  const todayIso = toIsoDate(current.year, current.month, current.day)
  const [selected, setSelected] = useState(null)
  const [year, setYear] = useState(current.year)
  const [month, setMonth] = useState(current.month)
  const [selectedDate, setSelectedDate] = useState(todayIso)
  const [history, setHistory] = useState(null)
  const [types, setTypes] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [dayModalOpen, setDayModalOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [initialTypeId, setInitialTypeId] = useState(null)

  const canGoNext = year < current.year || (year === current.year && month < current.month)

  useEffect(() => {
    getConductCatalog()
      .then((catalog) => setTypes(Array.isArray(catalog) ? catalog : []))
      .catch(() => setTypes([]))
  }, [])

  const loadStudentOptions = useRef(
    debouncePromise(async (inputValue) => {
      const term = inputValue?.trim()
      if (!term || term.length < 2) return []
      const items = await searchStudents(term, 20)
      return items.map(mapStudentOption)
    }, 300),
  ).current

  const loadHistory = useCallback(async (studentId, targetYear, targetMonth) => {
    if (!studentId) return
    setIsLoading(true)
    setError('')
    try {
      const data = await getStudentConductHistory(studentId, {
        year: targetYear,
        month: targetMonth,
      })
      setHistory(data || null)
    } catch (err) {
      setHistory(null)
      setError(err?.response?.data?.message || 'Unable to load this student’s records.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!selected?.value) {
      setHistory(null)
      return
    }
    void loadHistory(selected.value, year, month)
  }, [selected, year, month, loadHistory])

  const onSelectStudent = (option) => {
    setSelected(option)
    setYear(current.year)
    setMonth(current.month)
    setSelectedDate(todayIso)
    setSheetOpen(false)
    setDayModalOpen(false)
  }

  const goPrev = () => {
    const next = shiftMonth(year, month, -1)
    setYear(next.year)
    setMonth(next.month)
    setSelectedDate(toIsoDate(next.year, next.month, 1))
    setDayModalOpen(false)
  }

  const goNext = () => {
    if (!canGoNext) return
    const next = shiftMonth(year, month, 1)
    setYear(next.year)
    setMonth(next.month)
    const day = year === current.year && next.month === current.month ? current.day : 1
    setSelectedDate(toIsoDate(next.year, next.month, day))
    setDayModalOpen(false)
  }

  const notes = history?.notes || []
  const notesByDay = useMemo(() => {
    const map = new Map()
    for (const note of notes) {
      const iso = noteDateKey(note.noteDate)
      const day = Number(iso.split('-')[2])
      if (!Number.isFinite(day)) continue
      const list = map.get(day) || []
      list.push(note)
      map.set(day, list)
    }
    return map
  }, [notes])

  const calendarCells = useMemo(() => {
    const firstWeekday = new Date(year, month - 1, 1).getDay()
    const daysInMonth = new Date(year, month, 0).getDate()
    const cells = []
    for (let i = 0; i < firstWeekday; i += 1) {
      cells.push({ empty: true, key: `e-${i}`, isSunday: i === 0 })
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
      cells.push({
        empty: false,
        key: `d-${day}`,
        day,
        isSunday: new Date(year, month - 1, day).getDay() === 0,
        polarity: dayPolarity(notesByDay.get(day) || []),
        iso: toIsoDate(year, month, day),
      })
    }
    return cells
  }, [year, month, notesByDay])

  const selectedDayNotes = useMemo(
    () => notes.filter((note) => noteDateKey(note.noteDate) === selectedDate),
    [notes, selectedDate],
  )

  const monthNotesNewestFirst = useMemo(
    () =>
      [...notes].sort((a, b) => {
        const byDate = noteDateKey(b.noteDate).localeCompare(noteDateKey(a.noteDate))
        if (byDate !== 0) return byDate
        return (b.id || 0) - (a.id || 0)
      }),
    [notes],
  )

  const openDay = (iso) => {
    setSelectedDate(iso)
    setDayModalOpen(true)
  }

  const openSheet = (typeId = null) => {
    setInitialTypeId(typeId)
    setSheetOpen(true)
  }

  const onSave = async ({ conductTypeId, tagIds, remarks }) => {
    if (!selected?.value) return
    setIsSaving(true)
    const toastId = 'emp-conduct-student-save'
    toast.loading('Saving…', { id: toastId })
    try {
      await upsertConductNote({
        studentId: selected.value,
        noteDate: selectedDate,
        conductTypeId,
        tagIds,
        remarks,
      })
      await loadHistory(selected.value, year, month)
      setSheetOpen(false)
      setDayModalOpen(true)
      toast.success('Saved.', { id: toastId })
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not save.', { id: toastId })
    } finally {
      setIsSaving(false)
    }
  }

  const onDelete = async (noteId) => {
    setIsSaving(true)
    const toastId = `emp-conduct-student-del-${noteId}`
    toast.loading('Removing…', { id: toastId })
    try {
      await deleteConductNote(noteId)
      await loadHistory(selected.value, year, month)
      toast.success('Removed.', { id: toastId })
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not remove this record.', { id: toastId })
    } finally {
      setIsSaving(false)
    }
  }

  const isCurrentMonth = year === current.year && month === current.month

  return (
    <EmployeeLayout
      title="Student Conduct"
      subtitle="Look up a student and review their notes"
      showQuickTiles={false}
      showProfileCard={false}
      compactContentTop
    >
      <EmployeeBackButton />

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
              onChange={onSelectStudent}
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
          Search for a student to see and record their conduct notes.
        </section>
      ) : (
        <div className="space-y-3">
          <section className="emp-surface rounded-2xl p-4">
            <p className="truncate text-sm font-semibold text-slate-900">{selected.label}</p>
            <p className="mt-1 text-xs text-slate-500">
              {notes.length} note{notes.length === 1 ? '' : 's'} this month
            </p>
          </section>

          <section className="emp-surface rounded-2xl p-4">
            <div className="flex items-center justify-between gap-2">
              <button type="button" onClick={goPrev} className="emp-icon-btn" aria-label="Previous month">
                <ChevronLeft size={20} />
              </button>
              <p className="min-w-0 truncate text-center text-sm font-semibold text-slate-900">
                {formatMonthLabel(year, month)}
              </p>
              <button
                type="button"
                onClick={goNext}
                disabled={!canGoNext}
                className="emp-icon-btn disabled:opacity-40"
                aria-label="Next month"
              >
                <ChevronRight size={20} />
              </button>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
                <Loader2 size={18} className="animate-spin text-indigo-600" />
                Loading…
              </div>
            ) : error ? (
              <p className="mt-4 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
            ) : (
              <>
                <div className="mt-4 grid grid-cols-7 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  {WEEKDAYS.map((label, index) => (
                    <div
                      key={`${label}-${index}`}
                      className={index === 0 ? 'rounded-t-md bg-slate-100 py-1 text-slate-300' : 'py-1'}
                    >
                      {label}
                    </div>
                  ))}
                </div>
                <div className="mt-0 grid grid-cols-7 gap-y-1.5">
                  {calendarCells.map((cell, index) => {
                    const sundayCol = cell.isSunday
                      ? `bg-slate-100${index + 7 >= calendarCells.length ? ' rounded-b-md' : ''}`
                      : ''
                    if (cell.empty) {
                      return <div key={cell.key} className={sundayCol || undefined} />
                    }
                    const isToday = isCurrentMonth && cell.day === current.day
                    const isSelected = cell.iso === selectedDate && dayModalOpen
                    const polarity = cell.polarity
                    const mixedStyle =
                      polarity === 'mixed'
                        ? { backgroundImage: 'linear-gradient(90deg, #fecdd3 50%, #a7f3d0 50%)' }
                        : undefined
                    const fillClass =
                      polarity === 'good'
                        ? 'bg-emerald-200 text-emerald-950'
                        : polarity === 'bad'
                          ? 'bg-rose-200 text-rose-950'
                          : polarity === 'mixed'
                            ? 'text-slate-900'
                            : cell.isSunday
                              ? 'text-slate-400'
                              : 'text-slate-700'
                    return (
                      <div key={cell.key} className={`flex justify-center ${sundayCol}`}>
                        <button
                          type="button"
                          onClick={() => openDay(cell.iso)}
                          style={mixedStyle}
                          className={`relative flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold ${fillClass} ${
                            isSelected ? 'ring-2 ring-indigo-500 ring-offset-1' : ''
                          } ${isToday && !isSelected ? 'ring-2 ring-indigo-400 ring-offset-1' : ''}`}
                        >
                          {cell.day}
                        </button>
                      </div>
                    )
                  })}
                </div>
                <p className="mt-3 text-center text-[11px] text-slate-500">Tap a day to see notes</p>
              </>
            )}
          </section>

          {monthNotesNewestFirst.length > 0 ? (
            <section className="emp-surface rounded-2xl p-4">
              <h3 className="text-sm font-semibold text-slate-900">This month</h3>
              <ul className="mt-3 space-y-2">
                {monthNotesNewestFirst.map((note) => (
                  <li key={`m-${note.id}`}>
                    <button
                      type="button"
                      onClick={() => openDay(noteDateKey(note.noteDate))}
                      className={`w-full rounded-xl border px-3 py-2 text-left text-sm text-slate-800 ${polarityCardClass(notePolarity(note))}`}
                    >
                      <p className="text-[11px] font-medium text-slate-500">
                        {formatDayLabel(noteDateKey(note.noteDate))}
                      </p>
                      <p className="font-semibold">{note.conductTypeName}</p>
                      {note.tags?.length ? (
                        <p className="text-xs text-slate-600">{note.tags.map((tag) => tag.name).join(', ')}</p>
                      ) : null}
                      {note.remarks ? <p className="mt-0.5 text-slate-700">{note.remarks}</p> : null}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      )}

      {dayModalOpen && selected && !sheetOpen ? (
        <div className="emp-modal-backdrop fixed inset-0 z-[80] flex items-end justify-center bg-slate-900/40 sm:items-center sm:p-4">
          <div className="emp-modal-card flex max-h-[92vh] w-full max-w-lg flex-col rounded-t-3xl bg-white shadow-2xl ring-1 ring-slate-200 sm:rounded-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-base font-semibold text-slate-900">{formatDayLabel(selectedDate)}</p>
                <p className="mt-0.5 truncate text-xs text-slate-500">{selected.label}</p>
              </div>
              <button
                type="button"
                onClick={() => setDayModalOpen(false)}
                className="emp-icon-btn shrink-0"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
              {selectedDayNotes.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-500">Nothing recorded for this date.</p>
              ) : (
                <ul className="space-y-2">
                  {selectedDayNotes.map((note) => (
                    <li key={note.id}>
                      <NoteCard note={note} onClick={() => openSheet(note.conductTypeId)} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="border-t border-slate-100 px-4 py-3">
              <button
                type="button"
                onClick={() => openSheet(selectedDayNotes[0]?.conductTypeId)}
                className="emp-cta-btn emp-cta-btn-primary w-full"
              >
                {selectedDayNotes.length > 0 ? (
                  'Update'
                ) : (
                  <>
                    <Plus size={16} />
                    Record
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {sheetOpen && selected ? (
        <EmployeeConductRecordSheet
          studentName={selected.label}
          date={selectedDate}
          types={types}
          existingNotes={selectedDayNotes}
          initialTypeId={initialTypeId}
          isSaving={isSaving}
          onSave={onSave}
          onDelete={onDelete}
          onClose={() => !isSaving && setSheetOpen(false)}
        />
      ) : null}
    </EmployeeLayout>
  )
}

export default EmployeeStudentConductPage
