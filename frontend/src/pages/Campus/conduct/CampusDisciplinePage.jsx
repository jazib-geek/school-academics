import { useEffect, useMemo, useState } from 'react'
import { ClipboardCheck, Loader2, Printer, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import CampusShell from '../../../components/campus/CampusShell'
import { AccessForbiddenPanel } from '../../../components/campus/CampusPermissionUi.jsx'
import CampusReportPrintHeader from '../../../components/campus/CampusReportPrintHeader'
import { hasCampusPermission } from '../../../services/authService'
import { getDisciplineCampusDay } from '../../../services/disciplineService'
import { CAMPUS_REPORT_PRINT_STYLES } from '../../../utils/campusReportPrint.js'
import { FILTER_INPUT_AUTOCOMPLETE_PROPS } from '../../../utils/filterInputProps'

const KIND_LABEL = {
  Concern: 'Concern',
  Praise: 'Praise',
  Note: 'Worth noting',
}

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

const formatDisplayDate = (iso) => {
  const parts = String(iso || '').split('-').map(Number)
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return iso
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(parts[0], parts[1] - 1, parts[2])))
}

const studentLine = (students) =>
  (students || [])
    .map((student) => (student.className ? `${student.studentName} (${student.className})` : student.studentName))
    .join(', ')

const statusChipClass = (status) => {
  if (status === 'Issue') return 'bg-red-50 text-red-700'
  if (status === 'Clear') return 'bg-emerald-50 text-emerald-700'
  if (status === 'Skipped') return 'bg-amber-50 text-amber-700'
  return 'bg-slate-100 text-slate-600'
}

function ListingTable({ title, countLabel, loading, empty, children }) {
  return (
    <section className="no-print overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2 text-[13px] text-slate-600">
        <span className="font-medium text-slate-800">{title}</span>
        <span>{loading ? 'Loading…' : countLabel}</span>
      </div>
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
          <Loader2 size={18} className="animate-spin text-indigo-600" />
          Loading…
        </div>
      ) : empty ? (
        <p className="px-4 py-12 text-center text-sm text-slate-500">{empty}</p>
      ) : (
        children
      )}
    </section>
  )
}

export default function CampusDisciplinePage() {
  const canView = hasCampusPermission('view_discipline')
  const [date, setDate] = useState(pakistanToday)
  const [appliedDate, setAppliedDate] = useState(date)
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    if (!canView || !appliedDate) return undefined
    let active = true
    setLoading(true)
    setLoadFailed(false)
    getDisciplineCampusDay(appliedDate)
      .then((data) => {
        if (active) setReport(data)
      })
      .catch((error) => {
        if (active) {
          setReport(null)
          setLoadFailed(true)
          toast.error(error?.response?.data?.message || 'Could not load discipline for this day.')
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [appliedDate, canView, refreshKey])

  const incharges = useMemo(() => report?.incharges || [], [report])
  const roundRows = useMemo(
    () =>
      incharges.flatMap((person) =>
        (person.rounds || []).map((round) => ({
          key: `${person.employeeId}-${round.id}`,
          incharge: person.employeeName,
          ...round,
        })),
      ),
    [incharges],
  )
  const findingRows = useMemo(
    () =>
      incharges.flatMap((person) =>
        (person.findings || []).map((item) => ({
          ...item,
          incharge: person.employeeName,
        })),
      ),
    [incharges],
  )
  const subtitle = useMemo(() => formatDisplayDate(appliedDate), [appliedDate])

  if (!canView) {
    return (
      <CampusShell>
        <div className="p-4 pt-[4.25rem] md:p-6 md:pt-[4.5rem]">
          <AccessForbiddenPanel message="You don't have access to view discipline." />
        </div>
      </CampusShell>
    )
  }

  return (
    <div className="print-page-root min-h-screen bg-slate-100 text-slate-700">
      <style>{CAMPUS_REPORT_PRINT_STYLES}</style>
      <CampusShell
        rowClassName="print-main-wrap flex min-h-screen w-full"
        asideClassName="no-print"
        headerClassName="no-print"
      >
        <div className="print-content-wrap w-full space-y-4 p-4 pt-[4.25rem] md:p-6 md:pt-[4.5rem]">
          <section className="no-print rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--campus-primary)] text-white">
                <ClipboardCheck size={18} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-800">Discipline</h1>
                <p className="text-sm text-slate-500">Rounds, findings, and day reports.</p>
              </div>
            </div>
            <form
              className="flex flex-wrap items-end gap-3"
              onSubmit={(event) => {
                event.preventDefault()
                setAppliedDate(date)
                setRefreshKey((key) => key + 1)
              }}
            >
              <label className="text-xs font-medium text-slate-600">
                Date
                <input
                  type="date"
                  className="mt-1 block rounded-lg border border-slate-300 px-3 py-2 text-[13px]"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                  {...FILTER_INPUT_AUTOCOMPLETE_PROPS}
                />
              </label>
              <button
                type="submit"
                className="inline-flex h-10 items-center rounded-lg bg-[var(--campus-primary)] px-4 text-sm font-semibold text-white shadow-sm hover:bg-[#364574]"
              >
                Show
              </button>
              <button
                type="button"
                onClick={() => setRefreshKey((key) => key + 1)}
                disabled={loading}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                Refresh
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                disabled={loading}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Printer size={16} />
                Print
              </button>
            </form>
            </div>
          </section>

          <ListingTable
            title="Rounds"
            countLabel={`${roundRows.length} round${roundRows.length === 1 ? '' : 's'}`}
            loading={loading}
            empty={loadFailed ? 'Could not load this day.' : incharges.length === 0 ? 'No discipline incharge is assigned.' : null}
          >
            <table className="w-full">
              <thead className="bg-[#405189] text-left text-[13px] font-medium text-white">
                <tr>
                  <th className="px-3 py-2">Incharge</th>
                  <th className="px-3 py-2">Round</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Note</th>
                </tr>
              </thead>
              <tbody className="text-[13px] leading-snug text-slate-800">
                {roundRows.map((round) => (
                  <tr key={round.key} className="border-t border-slate-100">
                    <td className="px-3 py-1.5 font-medium">{round.incharge}</td>
                    <td className="px-3 py-1.5">{round.name}</td>
                    <td className="px-3 py-1.5">
                      {round.status ? (
                        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${statusChipClass(round.status)}`}>
                          {round.status}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-3 py-1.5 text-slate-600">{round.note || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ListingTable>

          {!loading && !loadFailed && incharges.length > 0 ? (
          <ListingTable
            title="Findings"
            countLabel={`${findingRows.length} finding${findingRows.length === 1 ? '' : 's'}`}
            loading={false}
            empty={findingRows.length === 0 ? 'No findings for this day.' : null}
          >
              <table className="w-full">
                <thead className="bg-[#405189] text-left text-[13px] font-medium text-white">
                  <tr>
                    <th className="px-3 py-2">Incharge</th>
                    <th className="px-3 py-2">Kind</th>
                    <th className="px-3 py-2">Place</th>
                    <th className="px-3 py-2">Detail</th>
                    <th className="px-3 py-2">Students</th>
                  </tr>
                </thead>
                <tbody className="text-[13px] leading-snug text-slate-800">
                  {findingRows.map((item) => (
                    <tr key={item.id} className="border-t border-slate-100">
                      <td className="px-3 py-1.5 font-medium">{item.incharge}</td>
                      <td className="px-3 py-1.5">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${statusChipClass(item.kind === 'Concern' ? 'Issue' : item.kind === 'Praise' ? 'Clear' : 'Skipped')}`}>
                          {KIND_LABEL[item.kind] || item.kind}
                        </span>
                      </td>
                      <td className="px-3 py-1.5">{item.place}</td>
                      <td className="px-3 py-1.5">
                        {item.whatHappened}
                        {item.whatWasDone ? <div className="mt-0.5 text-slate-600">{item.whatWasDone}</div> : null}
                      </td>
                      <td className="px-3 py-1.5 text-slate-600">{studentLine(item.students) || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
          </ListingTable>
          ) : null}

          {!loading && !loadFailed && incharges.length > 0 ? (
          <ListingTable
            title="Day reports"
            countLabel={`${incharges.length} incharge${incharges.length === 1 ? '' : 's'}`}
            loading={false}
            empty={null}
          >
            <table className="w-full">
              <thead className="bg-[#405189] text-left text-[13px] font-medium text-white">
                <tr>
                  <th className="px-3 py-2">Incharge</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">What they did</th>
                  <th className="px-3 py-2">Anything else</th>
                </tr>
              </thead>
              <tbody className="text-[13px] leading-snug text-slate-800">
                {incharges.map((person) => (
                  <tr key={person.employeeId} className="border-t border-slate-100">
                    <td className="px-3 py-1.5 font-medium">{person.employeeName}</td>
                    <td className="px-3 py-1.5">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${person.submitted ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                        {person.submitted ? 'Submitted' : 'Not submitted'}
                      </span>
                    </td>
                    <td className="px-3 py-1.5">{person.report?.whatWasDone || '—'}</td>
                    <td className="px-3 py-1.5 text-slate-600">{person.report?.anythingElse || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ListingTable>
          ) : null}

          <div className="print-only print-sheet">
            <CampusReportPrintHeader title="DISCIPLINE" subtitle={subtitle} />
            {incharges.map((person) => (
              <div key={`print-${person.employeeId}`}>
                <p style={{ fontWeight: 700, margin: '8px 0 4px' }}>
                  {person.employeeName} — {person.submitted ? 'Submitted' : 'Not submitted'}
                </p>
                <table className="legacy-print-table">
                  <thead>
                    <tr>
                      <th>Round</th>
                      <th>Status</th>
                      <th>Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(person.rounds || []).map((round) => (
                      <tr key={`p-${person.employeeId}-${round.id}`}>
                        <td>{round.name}</td>
                        <td>{round.status || '—'}</td>
                        <td>{round.note || '—'}</td>
                      </tr>
                    ))}
                    <tr className="band-row">
                      <td colSpan={3}>Findings</td>
                    </tr>
                    {(person.findings || []).length === 0 ? (
                      <tr>
                        <td colSpan={3}>None</td>
                      </tr>
                    ) : (
                      (person.findings || []).map((item) => (
                        <tr key={`pf-${item.id}`}>
                          <td colSpan={3}>
                            {`${KIND_LABEL[item.kind] || item.kind} · ${item.place}: ${item.whatHappened}`}
                            {item.whatWasDone ? ` Action: ${item.whatWasDone}` : ''}
                            {studentLine(item.students) ? ` — ${studentLine(item.students)}` : ''}
                          </td>
                        </tr>
                      ))
                    )}
                    <tr className="band-row">
                      <td colSpan={3}>Day report</td>
                    </tr>
                    <tr>
                      <td colSpan={3}>
                        {person.report
                          ? [person.report.whatWasDone, person.report.anythingElse].filter(Boolean).join(' ')
                          : 'Not submitted'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </div>
      </CampusShell>
    </div>
  )
}
