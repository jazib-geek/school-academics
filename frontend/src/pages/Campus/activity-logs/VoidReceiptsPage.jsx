import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import { Ban, Eye, Loader2, Search, X } from 'lucide-react'
import { toast } from 'sonner'
import CampusShell from '../../../components/campus/CampusShell.jsx'
import { AccessForbiddenPanel } from '../../../components/campus/CampusPermissionUi.jsx'
import { hasCampusPermission } from '../../../services/authService'
import {
  getVoidedFeeReceiptForPrint,
  searchVoidedFeeReceipts,
} from '../../../services/feeReceiptHistoryService'
import { buildVoidReceiptPreviewHtml } from '../../../utils/feeReceiptPrint'
import { FILTER_INPUT_AUTOCOMPLETE_PROPS } from '../../../utils/filterInputProps'

const PAGE_SIZE = 25

const inputClass =
  'h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-[13px] text-slate-800 outline-none transition focus:border-[var(--campus-primary)] focus:ring-2 focus:ring-indigo-100'

function todayIso() {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function formatDisplayDate(value) {
  if (!value) return '—'
  const raw = String(value)
  const isoDate = raw.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (isoDate) {
    const [, year, month, day] = isoDate
    return `${day}/${month}/${year}`
  }
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return '—'
  return parsed.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function formatPktDateTime(value) {
  if (!value) return '—'
  const raw = String(value)
  const parsed = new Date(raw.includes('T') ? raw : raw.replace(' ', 'T'))
  if (Number.isNaN(parsed.getTime())) return raw
  return parsed.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function money(value) {
  return Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
}

export default function VoidReceiptsPage() {
  const canAccess = hasCampusPermission('void_rcpt')
  const [dateFrom, setDateFrom] = useState(todayIso)
  const [dateTo, setDateTo] = useState(todayIso)
  const [studentName, setStudentName] = useState('')
  const [receiptId, setReceiptId] = useState('')
  const [rows, setRows] = useState([])
  const [pageNumber, setPageNumber] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [hasSearched, setHasSearched] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [viewingId, setViewingId] = useState(null)
  const [preview, setPreview] = useState(null)

  const runSearch = useCallback(
    async (page = 1) => {
      if (dateFrom && dateTo && dateFrom > dateTo) {
        toast.error('From date cannot be after to date.')
        return
      }

      setIsLoading(true)
      setHasSearched(true)
      try {
        const data = await searchVoidedFeeReceipts({
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
          studentName: studentName.trim().length >= 2 ? studentName.trim() : undefined,
          receiptId: receiptId.trim() ? Number(receiptId.trim()) : undefined,
          pageNumber: page,
          pageSize: PAGE_SIZE,
        })
        setRows(Array.isArray(data.items) ? data.items : [])
        setPageNumber(data.pageNumber || page)
        setTotalPages(data.totalPages || 0)
        setTotalCount(data.totalCount || 0)
      } catch (error) {
        setRows([])
        setTotalPages(0)
        setTotalCount(0)
        toast.error(error?.response?.data?.message || 'Could not load voided receipts.')
      } finally {
        setIsLoading(false)
      }
    },
    [dateFrom, dateTo, studentName, receiptId],
  )

  const onView = async (activityLogId, listReceiptId) => {
    setViewingId(activityLogId)
    try {
      const receipt = await getVoidedFeeReceiptForPrint(activityLogId)
      if (!receipt) {
        toast.error('Voided receipt not found.')
        return
      }
      setPreview({
        receiptId: listReceiptId ?? receipt.receiptId,
        html: buildVoidReceiptPreviewHtml(receipt),
      })
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Could not open voided receipt.')
    } finally {
      setViewingId(null)
    }
  }

  if (!canAccess) {
    return (
      <CampusShell headerContext="Void Receipts">
        <div className="min-h-screen bg-slate-100 p-4 pt-[4.25rem] md:p-6 md:pt-[4.5rem]">
          <AccessForbiddenPanel />
        </div>
      </CampusShell>
    )
  }

  return (
    <CampusShell headerContext="Void Receipts">
      <div className="min-h-screen bg-slate-100 p-4 pt-[4.25rem] md:p-6 md:pt-[4.5rem]">
        <div className="mx-auto max-w-6xl">
          <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
            <div className="space-y-5 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-rose-600 text-white">
                    <Ban size={18} />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-slate-800">Void Receipts</h1>
                    <p className="text-sm text-slate-500">
                      View receipts that were voided. These are no longer valid.
                    </p>
                  </div>
                </div>
                <Link
                  to="/campus/fee/void-receipt"
                  className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  <Ban size={16} />
                  Void a receipt
                </Link>
              </div>

              <div className="flex flex-wrap items-end gap-3">
                <label className="block min-w-[10rem] flex-1 text-[13px] font-medium text-slate-700 sm:max-w-[12rem]">
                  Voided from
                  <input
                    type="date"
                    className={`${inputClass} mt-1`}
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                </label>
                <label className="block min-w-[10rem] flex-1 text-[13px] font-medium text-slate-700 sm:max-w-[12rem]">
                  Voided to
                  <input
                    type="date"
                    className={`${inputClass} mt-1`}
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                  />
                </label>
                <label className="block min-w-[12rem] flex-1 text-[13px] font-medium text-slate-700 sm:max-w-xs">
                  Student name
                  <input
                    type="text"
                    className={`${inputClass} mt-1`}
                    placeholder="Optional"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    {...FILTER_INPUT_AUTOCOMPLETE_PROPS}
                  />
                </label>
                <label className="block min-w-[8rem] text-[13px] font-medium text-slate-700">
                  Receipt #
                  <input
                    type="number"
                    className={`${inputClass} mt-1`}
                    placeholder="Optional"
                    value={receiptId}
                    onChange={(e) => setReceiptId(e.target.value)}
                  />
                </label>
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => void runSearch(1)}
                  className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-[var(--campus-primary)] px-4 text-sm font-medium text-white hover:bg-[#364574] disabled:opacity-60"
                >
                  {isLoading ? <Loader2 className="animate-spin" size={16} /> : <Search size={16} />}
                  Search
                </button>
              </div>
            </div>

            <div className="border-t border-slate-100">
              {isLoading ? (
                <div className="flex items-center gap-2 px-5 py-10 text-slate-500">
                  <Loader2 className="animate-spin" size={16} />
                  Loading…
                </div>
              ) : !hasSearched ? (
                <p className="px-5 py-10 text-center text-sm text-slate-500">
                  Choose filters, then search.
                </p>
              ) : rows.length === 0 ? (
                <p className="px-5 py-10 text-center text-sm text-slate-500">No voided receipts found.</p>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-[13px] leading-snug">
                      <thead>
                        <tr>
                          <th className="px-3 py-2 font-semibold">Receipt #</th>
                          <th className="px-3 py-2 font-semibold">Receipt date</th>
                          <th className="px-3 py-2 font-semibold">Student</th>
                          <th className="px-3 py-2 font-semibold">Class</th>
                          <th className="px-3 py-2 text-right font-semibold">Amount</th>
                          <th className="px-3 py-2 font-semibold">Voided by</th>
                          <th className="px-3 py-2 font-semibold">Voided at</th>
                          <th className="px-3 py-2 text-right font-semibold">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row) => (
                          <tr key={row.activityLogId} className="border-b border-slate-100 hover:bg-slate-50/80">
                            <td className="px-3 py-1.5 font-medium text-slate-800">{row.receiptId}</td>
                            <td className="px-3 py-1.5 text-slate-700">{formatDisplayDate(row.receiptDate)}</td>
                            <td className="px-3 py-1.5 text-slate-800">
                              <div>{row.studentName}</div>
                              {row.studentId ? (
                                <div className="text-[12px] text-slate-500">Acc {row.studentId}</div>
                              ) : null}
                            </td>
                            <td className="px-3 py-1.5 text-slate-700">{row.className || '—'}</td>
                            <td className="px-3 py-1.5 text-right font-medium text-slate-900">
                              {money(row.totalReceived)}
                            </td>
                            <td className="px-3 py-1.5 text-slate-700">{row.voidedBy || '—'}</td>
                            <td className="px-3 py-1.5 text-slate-700">{formatPktDateTime(row.voidedAtPkt)}</td>
                            <td className="px-3 py-1.5 text-right">
                              <button
                                type="button"
                                title="View voided receipt"
                                disabled={viewingId === row.activityLogId}
                                onClick={() => void onView(row.activityLogId, row.receiptId)}
                                className="btn-icon-soft btn-table-action inline-flex h-7 w-7 items-center justify-center rounded-md text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                              >
                                {viewingId === row.activityLogId ? (
                                  <Loader2 className="animate-spin" size={14} />
                                ) : (
                                  <Eye size={14} />
                                )}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {totalPages > 1 ? (
                    <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-5 py-3 text-[13px] text-slate-600">
                      <span>
                        {totalCount} voided · page {pageNumber} of {totalPages}
                      </span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={pageNumber <= 1 || isLoading}
                          onClick={() => void runSearch(pageNumber - 1)}
                          className="h-8 rounded-md border border-slate-300 px-3 disabled:opacity-50"
                        >
                          Previous
                        </button>
                        <button
                          type="button"
                          disabled={pageNumber >= totalPages || isLoading}
                          onClick={() => void runSearch(pageNumber + 1)}
                          className="h-8 rounded-md border border-slate-300 px-3 disabled:opacity-50"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  ) : null}
                </>
              )}
            </div>
          </section>
        </div>
      </div>

      {preview ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-3 sm:p-4">
          <div className="flex h-[94vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-5 py-3">
              <h2 className="text-base font-semibold text-slate-900">
                Voided receipt #{preview.receiptId}
              </h2>
              <button
                type="button"
                title="Close"
                onClick={() => setPreview(null)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800"
              >
                <X size={16} />
              </button>
            </div>
            <iframe
              title={`Voided receipt ${preview.receiptId}`}
              srcDoc={preview.html}
              className="min-h-0 w-full flex-1 bg-white"
            />
          </div>
        </div>
      ) : null}
    </CampusShell>
  )
}
