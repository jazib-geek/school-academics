import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import EmployeeBackButton from '../../components/employee/EmployeeBackButton'
import EmployeeLayout from '../../components/employee/EmployeeLayout'
import { getDateSheet } from '../../services/campusDateSheetService'
import {
  buildDisplayColumns,
  buildEntryMap,
  entryKey,
  examDateKey,
  formatExamDate,
  getText,
  resolveCellLabel,
} from '../Campus/datesheets/dateSheetHelpers'

function EmployeeBrowseDateSheetDetailPage() {
  const { id } = useParams()
  const dateSheetId = Number(id)

  const [detail, setDetail] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!dateSheetId) {
      setError('Datesheet not found.')
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    setError('')
    try {
      setDetail(await getDateSheet(dateSheetId))
    } catch (err) {
      setDetail(null)
      setError(err?.response?.data?.message || 'Unable to load this datesheet.')
    } finally {
      setIsLoading(false)
    }
  }, [dateSheetId])

  useEffect(() => {
    load()
  }, [load])

  const days = detail?.days || detail?.Days || []
  const classes = detail?.classes || detail?.Classes || []
  const entries = detail?.entries || detail?.Entries || []
  const columns = useMemo(() => buildDisplayColumns(classes), [classes])
  const entryMap = useMemo(() => buildEntryMap(entries), [entries])

  const title = getText(detail, 'name', 'Name') || 'Date sheet'
  const subtitle =
    getText(detail, 'subtitle', 'Subtitle') ||
    getText(detail, 'displayTitle', 'DisplayTitle') ||
    'Read-only preview'

  return (
    <EmployeeLayout
      title={title}
      subtitle={subtitle}
      showProfileCard={false}
      showQuickTiles={false}
      compactContentTop
    >
      <div className="space-y-3 pb-4">
        <EmployeeBackButton label="Date sheets" to="/employee/datesheets" />

        {error ? (
          <div className="emp-surface rounded-2xl px-4 py-3 text-sm text-[var(--emp-danger)]">{error}</div>
        ) : null}

        {isLoading ? (
          <div className="emp-surface flex items-center justify-center gap-2 rounded-2xl py-16 text-sm text-[var(--emp-text-muted)]">
            <Loader2 size={18} className="animate-spin text-[var(--emp-primary)]" /> Loading…
          </div>
        ) : detail ? (
          <div className="emp-surface overflow-hidden rounded-2xl">
            <div className="overflow-x-auto">
              <table className="min-w-max border-collapse text-sm">
                <thead>
                  <tr>
                    <th className="sticky left-0 z-10 border border-indigo-200 bg-indigo-600 px-3 py-2 text-left text-xs font-bold text-white">
                      Date
                    </th>
                    {columns.map((column) => (
                      <th
                        key={column.key}
                        className="min-w-28 border border-indigo-200 bg-indigo-600 px-2 py-2 text-center text-xs font-bold text-white"
                      >
                        {column.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {days.map((day) => {
                    const examDate = examDateKey(getText(day, 'examDate', 'ExamDate'))
                    const dayName = getText(day, 'dayName', 'DayName')
                    return (
                      <tr key={examDate}>
                        <th className="sticky left-0 z-10 border border-slate-200 bg-white px-3 py-2 text-left">
                          <div className="font-semibold text-slate-800">{formatExamDate(examDate)}</div>
                          <div className="text-[11px] font-medium text-slate-500">{dayName}</div>
                        </th>
                        {columns.map((column) => {
                          const entry = entryMap.get(entryKey(column.classIds[0], examDate))
                          const label = resolveCellLabel(entry)
                          return (
                            <td
                              key={`${column.key}-${examDate}`}
                              className="border border-slate-200 px-2 py-3 text-center text-xs font-semibold text-slate-800"
                            >
                              {label || <span className="font-normal text-slate-300">—</span>}
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {days.length === 0 || columns.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-[var(--emp-text-muted)]">
                This datesheet has no schedule yet.
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </EmployeeLayout>
  )
}

export default EmployeeBrowseDateSheetDetailPage
