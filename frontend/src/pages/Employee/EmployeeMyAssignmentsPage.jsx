import { useCallback, useEffect, useState } from 'react'
import { BookMarked, Loader2, RefreshCw } from 'lucide-react'
import EmployeeBackButton from '../../components/employee/EmployeeBackButton'
import EmployeeLayout from '../../components/employee/EmployeeLayout'
import { getMyTeacherAssignments } from '../../services/teacherClassSubjectAssignmentService'

function EmployeeMyAssignmentsPage() {
  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      setData(await getMyTeacherAssignments())
    } catch (err) {
      setData(null)
      setError(err?.response?.data?.message || 'Unable to load your assignments.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const classes = data?.classes || data?.Classes || []
  const classCount = data?.classCount ?? data?.ClassCount ?? classes.length
  const subjectCount = data?.subjectCount ?? data?.SubjectCount ?? 0

  return (
    <EmployeeLayout
      title="My assignments"
      subtitle="Classes and subjects assigned to you"
      showProfileCard={false}
      compactContentTop
    >
      <div className="space-y-3 pb-4">
        <EmployeeBackButton />

        <div className="flex items-center justify-between gap-2">
          <p className="min-w-0 px-0.5 text-xs text-[var(--emp-text-muted)]">
            {isLoading && !data
              ? 'Loading…'
              : `${classCount} class${classCount === 1 ? '' : 'es'} · ${subjectCount} subject${
                  subjectCount === 1 ? '' : 's'
                }`}
          </p>
          <button
            type="button"
            onClick={load}
            disabled={isLoading}
            className="emp-cta-btn emp-cta-btn-tonal h-9 shrink-0 px-3"
            aria-label="Refresh"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>

        {error ? (
          <div className="emp-surface rounded-2xl px-4 py-3 text-sm text-[var(--emp-danger)]">{error}</div>
        ) : null}

        {isLoading && !data ? (
          <div className="emp-surface flex items-center justify-center gap-2 rounded-2xl py-16 text-sm text-[var(--emp-text-muted)]">
            <Loader2 size={18} className="animate-spin text-[var(--emp-primary)]" /> Loading…
          </div>
        ) : classes.length === 0 ? (
          <div className="emp-surface rounded-2xl px-4 py-12 text-center">
            <BookMarked className="mx-auto text-[var(--emp-text-muted)]" size={28} />
            <p className="mt-3 text-sm font-medium text-[var(--emp-text)]">No subjects assigned yet</p>
            <p className="mt-1 text-xs text-[var(--emp-text-muted)]">
              Ask your coordinator to allocate classes and subjects to you.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {classes.map((row) => {
              const classId = row.classId ?? row.ClassId
              const className = row.className || row.ClassName || 'Class'
              const subjects = row.subjects || row.Subjects || []
              return (
                <section key={classId} className="emp-surface overflow-hidden rounded-2xl">
                  <div className="border-b border-[var(--emp-border)] px-4 py-3">
                    <p className="text-[0.9375rem] font-semibold text-[var(--emp-text)]">{className}</p>
                    <p className="mt-0.5 text-xs text-[var(--emp-text-muted)]">
                      {subjects.length} subject{subjects.length === 1 ? '' : 's'}
                    </p>
                  </div>
                  <ul className="divide-y divide-[var(--emp-border)]">
                    {subjects.map((subject) => {
                      const subjectId = subject.subjectId ?? subject.SubjectId
                      const subjectName = subject.subjectName || subject.SubjectName || 'Subject'
                      return (
                        <li
                          key={`${classId}-${subjectId}`}
                          className="flex items-center gap-3 px-4 py-2.5"
                        >
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--emp-primary-soft)] text-[var(--emp-primary)]">
                            <BookMarked size={15} />
                          </span>
                          <span className="min-w-0 text-sm font-medium text-[var(--emp-text)]">
                            {subjectName}
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                </section>
              )
            })}
          </div>
        )}
      </div>
    </EmployeeLayout>
  )
}

export default EmployeeMyAssignmentsPage
