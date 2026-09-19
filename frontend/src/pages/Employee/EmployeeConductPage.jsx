import { useEffect, useMemo, useState } from 'react'
import { EmployeeSelect as Select } from '../../components/employee/EmployeeSelect'
import { toast } from 'sonner'
import EmployeeBackButton from '../../components/employee/EmployeeBackButton'
import EmployeeConductRecordSheet from '../../components/employee/EmployeeConductRecordSheet'
import EmployeeLayout from '../../components/employee/EmployeeLayout'
import { getClasses } from '../../services/classService'
import {
  deleteConductNote,
  getConductCatalog,
  getConductClassSheet,
  notePolarity,
  polarityChipClass,
  upsertConductNote,
} from '../../services/studentConductService'

const getPakistanToday = () => {
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

function EmployeeConductPage() {
  const [date, setDate] = useState(getPakistanToday)
  const [classes, setClasses] = useState([])
  const [classId, setClassId] = useState('')
  const [sheet, setSheet] = useState(null)
  const [types, setTypes] = useState([])
  const [searchText, setSearchText] = useState('')
  const [loadingSheet, setLoadingSheet] = useState(false)
  const [loadingClasses, setLoadingClasses] = useState(false)
  const [error, setError] = useState('')
  const [recordingStudent, setRecordingStudent] = useState(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    let active = true
    const load = async () => {
      setLoadingClasses(true)
      try {
        const [classResult, catalog] = await Promise.all([getClasses(), getConductCatalog()])
        if (!active) return
        setClasses(classResult)
        setTypes(Array.isArray(catalog) ? catalog : [])
      } catch (err) {
        if (!active) return
        setError(err?.response?.data?.message || 'Unable to load classes.')
      } finally {
        if (active) setLoadingClasses(false)
      }
    }
    void load()
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!date || !classId) {
      setSheet(null)
      return
    }

    let active = true
    const loadSheet = async () => {
      setLoadingSheet(true)
      setError('')
      try {
        const result = await getConductClassSheet({
          date,
          classSectionCompositeId: Number(classId),
        })
        if (active) setSheet(result)
      } catch (err) {
        if (!active) return
        setSheet(null)
        setError(err?.response?.data?.message || 'Unable to load the class list.')
      } finally {
        if (active) setLoadingSheet(false)
      }
    }

    void loadSheet()
    return () => {
      active = false
    }
  }, [date, classId])

  const classOptions = useMemo(
    () => classes.map((item) => ({ value: String(item.id), label: item.className })),
    [classes],
  )

  const selectedClassOption = useMemo(
    () => classOptions.find((option) => option.value === classId) || null,
    [classId, classOptions],
  )

  const filteredStudents = useMemo(() => {
    const students = sheet?.students || []
    if (!searchText.trim()) return students
    const keyword = searchText.trim().toLowerCase()
    return students.filter((student) => (student.studentName || '').toLowerCase().includes(keyword))
  }, [sheet, searchText])

  const getSheetTitle = () => {
    const rawClassName = (sheet?.className || '').trim()
    if (!rawClassName) return '-'
    const segments = rawClassName.split(' - ').map((segment) => segment.trim()).filter(Boolean)
    if (segments.length >= 2 && segments[0].toLowerCase() === segments[1].toLowerCase()) {
      segments.splice(1, 1)
    }
    return segments.join(' - ')
  }

  const reloadSheet = async () => {
    if (!date || !classId) return
    const result = await getConductClassSheet({
      date,
      classSectionCompositeId: Number(classId),
    })
    setSheet(result)
    if (recordingStudent) {
      const updated = (result?.students || []).find((row) => row.studentId === recordingStudent.studentId)
      if (updated) setRecordingStudent(updated)
    }
  }

  const onSave = async ({ conductTypeId, tagIds, remarks }) => {
    if (!recordingStudent) return
    setIsSaving(true)
    const toastId = `emp-conduct-${recordingStudent.studentId}`
    toast.loading('Saving…', { id: toastId })
    try {
      await upsertConductNote({
        studentId: recordingStudent.studentId,
        noteDate: date,
        conductTypeId,
        tagIds,
        remarks,
      })
      await reloadSheet()
      setRecordingStudent(null)
      toast.success('Saved.', { id: toastId })
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not save.', { id: toastId })
    } finally {
      setIsSaving(false)
    }
  }

  const onDelete = async (noteId) => {
    setIsSaving(true)
    const toastId = `emp-conduct-del-${noteId}`
    toast.loading('Removing…', { id: toastId })
    try {
      await deleteConductNote(noteId)
      await reloadSheet()
      toast.success('Removed.', { id: toastId })
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not remove this record.', { id: toastId })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <EmployeeLayout
      title="Class Conduct"
      subtitle="Record uniform, homework, and behaviour"
      showQuickTiles={false}
      showProfileCard={false}
      compactContentTop
    >
      <EmployeeBackButton />

      <section className="emp-surface rounded-2xl p-4">
        <h2 className="text-sm font-semibold text-slate-900">Select class and date</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="text-xs font-medium text-slate-600">
            Date
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
            />
          </label>
          <label className="text-xs font-medium text-slate-600">
            Class
            <div className="relative mt-1 text-sm">
              <Select
                isClearable
                isSearchable
                isLoading={loadingClasses}
                options={classOptions}
                value={selectedClassOption}
                placeholder="Search class…"
                onChange={(option) => setClassId(option?.value || '')}
                className="text-sm"
                styles={{
                  control: (base) => ({
                    ...base,
                    minHeight: '42px',
                    borderRadius: '0.75rem',
                    borderColor: '#cbd5e1',
                    boxShadow: 'none',
                  }),
                  menu: (base) => ({
                    ...base,
                    zIndex: 70,
                    borderRadius: '0.75rem',
                    overflow: 'hidden',
                  }),
                }}
              />
            </div>
          </label>
        </div>
      </section>

      {error ? (
        <section className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </section>
      ) : null}

      {sheet ? (
        <section className="emp-surface rounded-2xl p-4">
          <h3 className="text-sm font-semibold text-slate-900">
            {getSheetTitle()} – {String(sheet.date || date).slice(0, 10)}
          </h3>
          <div className="mt-3">
            <input
              type="text"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Search by student name"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
            />
          </div>
          <div className="mt-3 space-y-2">
            {filteredStudents.map((student) => {
              const notes = student.notes || []
              return (
                <div
                  key={student.studentId}
                  className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 px-3 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">{student.studentName}</p>
                    <p className="text-[11px] text-slate-500">#{student.studentId}</p>
                    {notes.length > 0 ? (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {notes.map((note) => (
                          <span
                            key={note.id}
                            className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${polarityChipClass(notePolarity(note))}`}
                          >
                            {note.conductTypeName}
                            {note.tags?.length ? ` · ${note.tags.map((tag) => tag.name).join(', ')}` : ''}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => setRecordingStudent(student)}
                    className="emp-cta-btn emp-cta-btn-primary shrink-0"
                  >
                    Record
                  </button>
                </div>
              )
            })}
            {filteredStudents.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500">No students in this class.</p>
            ) : null}
          </div>
        </section>
      ) : null}

      {loadingSheet ? (
        <section className="emp-surface rounded-2xl p-4 text-sm text-slate-600">
          <div className="flex items-center gap-2">
            <span className="emp-loader emp-loader-lg" />
            <span>Loading class list…</span>
          </div>
        </section>
      ) : null}

      {recordingStudent ? (
        <EmployeeConductRecordSheet
          studentName={recordingStudent.studentName}
          date={date}
          types={types}
          existingNotes={recordingStudent.notes || []}
          isSaving={isSaving}
          onSave={onSave}
          onDelete={onDelete}
          onClose={() => !isSaving && setRecordingStudent(null)}
        />
      ) : null}
    </EmployeeLayout>
  )
}

export default EmployeeConductPage
