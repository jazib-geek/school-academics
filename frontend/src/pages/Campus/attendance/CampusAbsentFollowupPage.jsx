import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, Loader2, PhoneCall, Printer, Save } from 'lucide-react'
import { toast } from 'sonner'
import CampusShell from '../../../components/campus/CampusShell.jsx'
import CampusReportPrintHeader from '../../../components/campus/CampusReportPrintHeader.jsx'
import { CAMPUS_REPORT_PRINT_STYLES } from '../../../utils/campusReportPrint.js'
import {
  getAbsentFollowupByDate,
  getAbsentFollowupReasons,
  saveAbsentFollowup,
} from '../../../services/absentFollowupService'
import { sortClassesByCustomOrder } from '../../../services/classSort.js'
import { FILTER_INPUT_AUTOCOMPLETE_PROPS } from '../../../utils/filterInputProps'

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

const OTHER_REASON_NOTE_MESSAGE = 'Add follow-up notes when the reason is Other.'

const isOtherReason = (reasonId, reasonList, reasonName) => {
  const name =
    reasonName ??
    reasonList.find((r) => r.id === reasonId)?.name ??
    ''
  return String(name).trim().toLowerCase() === 'other'
}

const formatPrintSubtitleDate = (isoDate) => {
  if (!isoDate) return ''
  const d = new Date(`${isoDate}T12:00:00`)
  if (Number.isNaN(d.getTime())) return isoDate
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function CampusAbsentFollowupPage() {
  const [date, setDate] = useState(getPakistanToday)
  const [reasons, setReasons] = useState([])
  const [rows, setRows] = useState([])
  const [drafts, setDrafts] = useState({})
  const [loading, setLoading] = useState(false)
  const [savingStudentId, setSavingStudentId] = useState(null)
  const [reasonUpdatedIds, setReasonUpdatedIds] = useState(() => new Set())
  const [error, setError] = useState('')
  const [printIncludeContacts, setPrintIncludeContacts] = useState(false)
  const followupInputRefs = useRef({})

  const sortedRows = useMemo(() => sortClassesByCustomOrder(rows), [rows])

  const focusFollowup = (studentId) => {
    const el = followupInputRefs.current[studentId]
    if (!el) return
    requestAnimationFrame(() => {
      el.focus()
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    })
  }

  useEffect(() => {
    let cancelled = false

    const loadReasons = async () => {
      try {
        const result = await getAbsentFollowupReasons()
        if (!cancelled) setReasons(Array.isArray(result) ? result : [])
      } catch {
        if (!cancelled) setReasons([])
      }
    }

    loadReasons()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!date) return

    let cancelled = false

    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const result = await getAbsentFollowupByDate(date)
        if (cancelled) return
        const list = Array.isArray(result) ? result : []
        setRows(list)
        setReasonUpdatedIds(new Set())
        const nextDrafts = {}
        for (const row of list) {
          nextDrafts[row.studentId] = row.description ?? ''
        }
        setDrafts(nextDrafts)
      } catch (err) {
        if (cancelled) return
        const msg = err?.response?.data?.message || 'Unable to load absent students.'
        setError(msg)
        setRows([])
        setDrafts({})
        setReasonUpdatedIds(new Set())
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [date])

  const applySaved = (studentId, saved) => {
    const reasonName =
      saved?.reasonName ??
      reasons.find((r) => r.id === saved?.reasonId)?.name ??
      null

    setRows((prev) =>
      prev.map((row) =>
        row.studentId === studentId
          ? {
              ...row,
              followupId: saved?.followupId ?? row.followupId,
              reasonId: saved?.reasonId ?? null,
              reasonName,
              description: saved?.description ?? null,
            }
          : row,
      ),
    )
    setDrafts((prev) => ({
      ...prev,
      [studentId]: saved?.description ?? '',
    }))
  }

  const onSaveDescription = async (studentId) => {
    if (!date || !studentId) return

    const row = rows.find((r) => r.studentId === studentId)
    const description = (drafts[studentId] ?? '').trim()
    if (isOtherReason(row?.reasonId, reasons, row?.reasonName) && !description) {
      toast.message(OTHER_REASON_NOTE_MESSAGE)
      focusFollowup(studentId)
      return
    }

    const toastId = `absent-followup-${studentId}`
    toast.loading('Saving follow-up…', { id: toastId })
    setSavingStudentId(studentId)
    setError('')
    try {
      const saved = await saveAbsentFollowup({
        studentId,
        date,
        reasonId: row?.reasonId ?? null,
        description,
      })
      applySaved(studentId, saved)
      toast.success('Follow-up saved.', { id: toastId })
    } catch (err) {
      const msg = err?.response?.data?.message || 'Unable to save follow-up.'
      setError(msg)
      toast.error(msg, { id: toastId })
    } finally {
      setSavingStudentId(null)
    }
  }

  const onReasonChange = async (studentId, nextReasonId) => {
    if (!date || !studentId) return

    const previous = rows.find((r) => r.studentId === studentId)
    const previousReasonId = previous?.reasonId ?? null
    const reasonId = nextReasonId ? Number(nextReasonId) : null
    const reasonName = reasons.find((r) => r.id === reasonId)?.name ?? null
    const description = (drafts[studentId] ?? previous?.description ?? '').trim()

    setRows((prev) =>
      prev.map((row) =>
        row.studentId === studentId ? { ...row, reasonId, reasonName } : row,
      ),
    )

    if (isOtherReason(reasonId, reasons, reasonName) && !description) {
      toast.message(OTHER_REASON_NOTE_MESSAGE)
      focusFollowup(studentId)
      return
    }

    const toastId = `absent-followup-reason-${studentId}`
    toast.loading('Saving reason…', { id: toastId })
    setSavingStudentId(studentId)
    setError('')
    try {
      const saved = await saveAbsentFollowup({
        studentId,
        date,
        reasonId,
        description,
      })
      applySaved(studentId, saved)
      setReasonUpdatedIds((prev) => {
        const next = new Set(prev)
        next.add(studentId)
        return next
      })
      toast.success('Reason saved.', { id: toastId })
    } catch (err) {
      setRows((prev) =>
        prev.map((row) =>
          row.studentId === studentId
            ? {
                ...row,
                reasonId: previousReasonId,
                reasonName: previous?.reasonName ?? null,
              }
            : row,
        ),
      )
      const msg = err?.response?.data?.message || 'Unable to save reason.'
      setError(msg)
      toast.error(msg, { id: toastId })
    } finally {
      setSavingStudentId(null)
    }
  }

  const printSubtitle = formatPrintSubtitleDate(date)

  return (
    <div className="print-page-root min-h-screen bg-slate-100 text-slate-700">
      <style>{CAMPUS_REPORT_PRINT_STYLES}</style>
      <CampusShell
        rowClassName="print-main-wrap flex min-h-screen w-full"
        asideClassName="no-print"
        headerClassName="no-print"
      >
        <div className="print-content-wrap w-full space-y-4 p-4 pt-[4.25rem] md:p-6 md:pt-[4.5rem]">
        <div className="no-print rounded-2xl bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--campus-primary)] text-white">
                <PhoneCall size={18} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-800">Absent Followup</h1>
                <p className="text-sm text-slate-500">
                  Call parents of absent students and save a short follow-up note.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <label className="inline-flex cursor-pointer items-center gap-2 text-[13px] text-slate-600">
                <input
                  type="checkbox"
                  checked={printIncludeContacts}
                  onChange={(e) => setPrintIncludeContacts(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-[var(--campus-primary)] focus:ring-[#405189]/30"
                />
                Include contact no.
              </label>
              <button
                type="button"
                disabled={loading || rows.length === 0}
                onClick={() => window.print()}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Printer size={16} />
                Print
              </button>
            </div>
          </div>

          <div className="mt-4 flex justify-center">
            <label className="inline-flex items-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-sm focus-within:border-[var(--campus-primary)] focus-within:ring-2 focus-within:ring-[#405189]/20">
              <span className="border-r border-slate-200 bg-[var(--campus-primary)] px-3 py-2 text-[13px] font-semibold text-white">
                Date
              </span>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-10 min-w-[11rem] border-0 bg-transparent px-3 text-[13px] text-slate-800 outline-none"
                {...FILTER_INPUT_AUTOCOMPLETE_PROPS}
              />
            </label>
          </div>
        </div>

        {error ? (
          <div className="no-print rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <div className="no-print overflow-hidden rounded-2xl bg-white shadow-sm">
          {loading ? (
            <div className="flex items-center justify-center gap-2 px-4 py-16 text-sm text-slate-500">
              <Loader2 size={16} className="animate-spin" />
              Loading absent students…
            </div>
          ) : rows.length === 0 ? (
            <div className="px-4 py-16 text-center text-sm text-slate-500">
              No absent students for this date.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-[13px] leading-snug">
                <thead>
                  <tr>
                    <th className="whitespace-nowrap px-3 py-2 text-left font-semibold text-white">
                      Name
                    </th>
                    <th className="whitespace-nowrap px-3 py-2 text-left font-semibold text-white">
                      Father name
                    </th>
                    <th className="whitespace-nowrap px-3 py-2 text-left font-semibold text-white">
                      Class
                    </th>
                    <th className="whitespace-nowrap px-3 py-2 text-left font-semibold text-white">
                      Father contact
                    </th>
                    <th className="whitespace-nowrap px-3 py-2 text-left font-semibold text-white">
                      Mother contact
                    </th>
                    <th className="whitespace-nowrap px-3 py-2 text-left font-semibold text-white">
                      Reason
                    </th>
                    <th className="min-w-[16rem] px-3 py-2 text-left font-semibold text-white">
                      Followup
                    </th>
                    <th className="whitespace-nowrap px-3 py-2 text-right font-semibold text-white">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedRows.map((row) => {
                    const saving = savingStudentId === row.studentId
                    const draft = drafts[row.studentId] ?? ''
                    const dirty = draft !== (row.description ?? '')
                    const needsOtherNote =
                      isOtherReason(row.reasonId, reasons, row.reasonName) &&
                      !draft.trim()

                    return (
                      <tr key={row.studentId} className="border-t border-slate-100">
                        <td className="px-3 py-1.5 font-medium text-slate-800">
                          {row.fullName || '—'}
                        </td>
                        <td className="px-3 py-1.5 text-slate-700">{row.fatherName || '—'}</td>
                        <td className="whitespace-nowrap px-3 py-1.5 text-slate-700">
                          {row.className || '—'}
                        </td>
                        <td className="whitespace-nowrap px-3 py-1.5 text-slate-700">
                          {row.fatherMobile || '—'}
                        </td>
                        <td className="whitespace-nowrap px-3 py-1.5 text-slate-700">
                          {row.motherPhone || '—'}
                        </td>
                        <td className="px-3 py-1.5">
                          <div className="flex items-center gap-1.5">
                            <select
                              value={row.reasonId ?? ''}
                              disabled={saving}
                              onChange={(e) => onReasonChange(row.studentId, e.target.value)}
                              className={`h-8 min-w-[10.5rem] rounded-md border bg-white px-2 text-[13px] text-slate-800 outline-none focus:ring-1 disabled:cursor-not-allowed disabled:opacity-60 ${
                                reasonUpdatedIds.has(row.studentId)
                                  ? 'border-emerald-500 focus:border-emerald-500 focus:ring-emerald-500/40'
                                  : 'border-slate-200 focus:border-[var(--campus-primary)] focus:ring-[#405189]/40'
                              }`}
                            >
                              <option value="">Select reason</option>
                              {reasons.map((reason) => (
                                <option key={reason.id} value={reason.id}>
                                  {reason.name}
                                </option>
                              ))}
                            </select>
                            {reasonUpdatedIds.has(row.studentId) ? (
                              <span
                                title="Reason updated"
                                className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"
                              >
                                <Check size={12} strokeWidth={3} aria-hidden />
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-3 py-1.5">
                          <textarea
                            ref={(el) => {
                              if (el) followupInputRefs.current[row.studentId] = el
                              else delete followupInputRefs.current[row.studentId]
                            }}
                            rows={2}
                            value={draft}
                            onChange={(e) =>
                              setDrafts((prev) => ({
                                ...prev,
                                [row.studentId]: e.target.value,
                              }))
                            }
                            maxLength={1000}
                            placeholder={
                              needsOtherNote ? 'Required for Other — add follow-up notes…' : 'Follow-up notes…'
                            }
                            className={`w-full min-w-[14rem] resize-y rounded-md border px-2 py-1.5 text-[13px] leading-snug text-slate-800 outline-none focus:ring-1 ${
                              needsOtherNote
                                ? 'border-amber-400 focus:border-amber-500 focus:ring-amber-500/40'
                                : 'border-slate-200 focus:border-[var(--campus-primary)] focus:ring-[#405189]/40'
                            }`}
                          />
                        </td>
                        <td className="px-3 py-1.5 text-right">
                          <button
                            type="button"
                            onClick={() => onSaveDescription(row.studentId)}
                            disabled={saving || !dirty}
                            className="inline-flex h-7 items-center gap-1.5 rounded-md bg-[var(--campus-primary)] px-2.5 text-[12px] font-medium text-white hover:bg-[#364574] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {saving ? (
                              <Loader2 size={13} className="animate-spin" />
                            ) : (
                              <Save size={13} />
                            )}
                            Save
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {rows.length > 0 ? (
          <div className="print-only print-sheet">
            <CampusReportPrintHeader
              title="ABSENT FOLLOWUP"
              subtitle={printSubtitle}
              showPhones={false}
            />
            <table className="legacy-print-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Father name</th>
                  <th>Class</th>
                  {printIncludeContacts ? (
                    <>
                      <th>Father contact</th>
                      <th>Mother contact</th>
                    </>
                  ) : null}
                  <th>Reason</th>
                  <th>Followup</th>
                </tr>
              </thead>
              <tbody>
                {sortedRows.map((row) => {
                  const followup =
                    (drafts[row.studentId] ?? row.description ?? '').trim() || '—'
                  const reasonLabel =
                    row.reasonName ??
                    reasons.find((r) => r.id === row.reasonId)?.name ??
                    '—'

                  return (
                    <tr key={row.studentId}>
                      <td>{row.fullName || '—'}</td>
                      <td>{row.fatherName || '—'}</td>
                      <td>{row.className || '—'}</td>
                      {printIncludeContacts ? (
                        <>
                          <td>{row.fatherMobile || '—'}</td>
                          <td>{row.motherPhone || '—'}</td>
                        </>
                      ) : null}
                      <td>{reasonLabel}</td>
                      <td>{followup}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : null}
        </div>
      </CampusShell>
    </div>
  )
}
