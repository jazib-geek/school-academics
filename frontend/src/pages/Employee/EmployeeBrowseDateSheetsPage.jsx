import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, Loader2, NotebookPen, RefreshCw } from 'lucide-react'
import EmployeeBackButton from '../../components/employee/EmployeeBackButton'
import EmployeeLayout from '../../components/employee/EmployeeLayout'
import { getDateSheets } from '../../services/campusDateSheetService'
import {
  formatDateRangeLabel,
  getId,
  getText,
} from '../Campus/datesheets/dateSheetHelpers'

function EmployeeBrowseDateSheetsPage() {
  const navigate = useNavigate()
  const [rows, setRows] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      setRows(await getDateSheets())
    } catch (err) {
      setRows([])
      setError(err?.response?.data?.message || 'Unable to load datesheets.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return (
    <EmployeeLayout
      title="Date sheets"
      subtitle="Exam schedules for this campus"
      showProfileCard={false}
      compactContentTop
    >
      <div className="space-y-3 pb-4">
        <EmployeeBackButton />

        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-[var(--emp-text-muted)]">
            {isLoading ? 'Loading…' : `${rows.length} datesheet${rows.length === 1 ? '' : 's'}`}
          </p>
          <button
            type="button"
            onClick={load}
            disabled={isLoading}
            className="emp-cta-btn emp-cta-btn-tonal h-9 shrink-0 px-3"
            aria-label="Refresh"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {error ? (
          <div className="emp-surface rounded-2xl px-4 py-3 text-sm text-[var(--emp-danger)]">{error}</div>
        ) : null}

        {isLoading && rows.length === 0 ? (
          <div className="emp-surface flex items-center justify-center gap-2 rounded-2xl py-16 text-sm text-[var(--emp-text-muted)]">
            <Loader2 size={18} className="animate-spin text-[var(--emp-primary)]" /> Loading…
          </div>
        ) : rows.length === 0 ? (
          <div className="emp-surface rounded-2xl px-4 py-12 text-center">
            <NotebookPen className="mx-auto text-[var(--emp-text-muted)]" size={28} />
            <p className="mt-3 text-sm font-medium text-[var(--emp-text)]">No datesheets yet</p>
            <p className="mt-1 text-xs text-[var(--emp-text-muted)]">
              Datesheets will appear here once they are published.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {rows.map((row) => {
              const id = getId(row, 'id', 'ID')
              const dayCount = getId(row, 'dayCount', 'DayCount')
              const classCount = getId(row, 'classCount', 'ClassCount')
              const subtitle = getText(row, 'subtitle', 'Subtitle')
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => navigate(`/employee/datesheets/${id}`)}
                  className="emp-action-row w-full text-left"
                >
                  <span className="emp-sheet-icon shrink-0">
                    <NotebookPen size={20} strokeWidth={2} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[0.9375rem] font-semibold leading-tight text-[var(--emp-text)]">
                      {getText(row, 'name', 'Name')}
                    </span>
                    {subtitle ? (
                      <span className="mt-0.5 block text-xs text-[var(--emp-text-muted)]">
                        {subtitle}
                      </span>
                    ) : null}
                    <span className="mt-1 block text-xs text-[var(--emp-text-muted)]">
                      {formatDateRangeLabel(
                        getText(row, 'startDate', 'StartDate'),
                        getText(row, 'endDate', 'EndDate'),
                      )}
                      {` · ${dayCount} days · ${classCount} classes`}
                    </span>
                  </span>
                  <ChevronRight size={18} className="shrink-0 text-[var(--emp-text-muted)]" />
                </button>
              )
            })}
          </div>
        )}
      </div>
    </EmployeeLayout>
  )
}

export default EmployeeBrowseDateSheetsPage
