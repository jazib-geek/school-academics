import { useEffect, useMemo, useState } from 'react'
import { Loader2, PhoneCall } from 'lucide-react'
import { getAbsentFollowupByDate } from '../../services/absentFollowupService'
import { sortClassesByCustomOrder } from '../../services/classSort.js'

export const ABSENT_FOLLOWUP_NONE_LABEL = 'No followup recorded'

export function absentFollowupReasonLabel(row) {
  const name = String(row?.reasonName ?? '').trim()
  return name || ABSENT_FOLLOWUP_NONE_LABEL
}

export default function AbsentFollowupReadOnlyList({
  date,
  campusKey,
  visible = true,
  onCountChange,
  formatDateLabel,
  showIntro = true,
}) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const sortedRows = useMemo(() => sortClassesByCustomOrder(rows), [rows])

  useEffect(() => {
    onCountChange?.(rows.length)
  }, [rows.length, onCountChange])

  useEffect(() => {
    if (!date) return
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const result = await getAbsentFollowupByDate(date, campusKey)
        if (cancelled) return
        setRows(Array.isArray(result) ? result : [])
      } catch (err) {
        if (cancelled) return
        setError(err?.response?.data?.message || 'Unable to load absent students.')
        setRows([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [date, campusKey])

  if (!visible) return null

  const dateLabel = formatDateLabel ? formatDateLabel(date) : date

  return (
    <div className="cw-absent-readonly" aria-busy={loading}>
      {showIntro && (
        <>
          <div className="cw-section-heading">
            <div>
              {dateLabel ? <p className="cw-eyebrow">{dateLabel}</p> : null}
              <h3>Absentee follow-up</h3>
            </div>
            <span className="cw-tag">{sortedRows.length} absent</span>
          </div>
          <p className="cw-muted">Absent students for this date and whether a follow-up reason was recorded.</p>
        </>
      )}

      {error ? (
        <p className="cw-notice cw-notice--error" role="alert">{error}</p>
      ) : null}

      {loading ? (
        <div className="cw-empty" role="status">
          <Loader2 size={22} className="cw-spin" aria-hidden="true" />
          <p>Loading absent students…</p>
        </div>
      ) : sortedRows.length === 0 ? (
        <div className="cw-empty">
          <PhoneCall size={28} strokeWidth={1.5} aria-hidden="true" />
          <h3>No absent students</h3>
          <p>Everyone marked present for this date, or attendance is not recorded yet.</p>
        </div>
      ) : (
        <ul className="cw-absent-readonly-list" aria-label="Absent students">
          <li className="cw-absent-readonly-row cw-absent-readonly-head">
            <span>Student name</span>
            <span>Class</span>
            <span>Reason</span>
          </li>
          {sortedRows.map((row) => (
            <li className="cw-absent-readonly-row" key={row.studentId}>
              <span className="cw-absent-readonly-name">{row.fullName || '—'}</span>
              <span className="cw-absent-readonly-class">{row.className || '—'}</span>
              <span
                className={
                  absentFollowupReasonLabel(row) === ABSENT_FOLLOWUP_NONE_LABEL
                    ? 'cw-absent-readonly-reason cw-absent-readonly-reason--empty'
                    : 'cw-absent-readonly-reason'
                }
              >
                {absentFollowupReasonLabel(row)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
