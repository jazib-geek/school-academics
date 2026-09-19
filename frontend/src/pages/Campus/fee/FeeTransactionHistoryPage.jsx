import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Eye, History, Loader2, Pencil, Printer, Search, X } from 'lucide-react'
import { toast } from 'sonner'
import CampusShell from '../../../components/campus/CampusShell.jsx'
import { AccessForbiddenPanel } from '../../../components/campus/CampusPermissionUi.jsx'
import { hasCampusPermission } from '../../../services/authService'
import {
  editFeeReceipt,
  getFeeReceiptForReprint,
  getVoidedFeeReceiptForPrint,
  searchFeeReceipts,
} from '../../../services/feeReceiptHistoryService'
import { buildVoidReceiptPreviewHtml, printFeeReceipts } from '../../../utils/feeReceiptPrint'
import { FILTER_INPUT_AUTOCOMPLETE_PROPS } from '../../../utils/filterInputProps'

const inputClass =
  'h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-[13px] text-slate-800 outline-none transition focus:border-[var(--campus-primary)] focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400'

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

function money(value) {
  return Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
}

function toDateInputValue(value) {
  if (!value) return todayIso()
  const raw = String(value)
  const isoDate = raw.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (isoDate) return `${isoDate[1]}-${isoDate[2]}-${isoDate[3]}`
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return todayIso()
  const yyyy = parsed.getFullYear()
  const mm = String(parsed.getMonth() + 1).padStart(2, '0')
  const dd = String(parsed.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

export default function FeeTransactionHistoryPage() {
  const canAccess = hasCampusPermission('submit_fee')
  const canEditReceipt = hasCampusPermission('void_rcpt')
  const [searchParams, setSearchParams] = useSearchParams()
  const [searchMode, setSearchMode] = useState('date')
  const [dateFrom, setDateFrom] = useState(todayIso)
  const [dateTo, setDateTo] = useState(todayIso)
  const [studentName, setStudentName] = useState('')
  const [rows, setRows] = useState([])
  const [hasSearched, setHasSearched] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [reprintingId, setReprintingId] = useState(null)
  const [editState, setEditState] = useState(null)
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const [voidPreview, setVoidPreview] = useState(null)
  const [highlightTxnId, setHighlightTxnId] = useState(null)

  const canSearch = useMemo(() => {
    if (searchMode === 'name') return studentName.trim().length >= 2
    return Boolean(dateFrom && dateTo)
  }, [searchMode, dateFrom, dateTo, studentName])

  const setMode = (mode) => {
    if (mode === searchMode) return
    setSearchMode(mode)
    setRows([])
    setHasSearched(false)
    if (mode === 'date') {
      setStudentName('')
      setDateFrom(todayIso())
      setDateTo(todayIso())
    } else {
      setDateFrom('')
      setDateTo('')
      setStudentName('')
    }
  }

  const runSearch = useCallback(async (overrides = {}) => {
    const mode = overrides.searchMode ?? searchMode
    const from = overrides.dateFrom ?? dateFrom
    const to = overrides.dateTo ?? dateTo
    const nameValue = overrides.studentName ?? studentName

    if (mode === 'name') {
      const name = String(nameValue || '').trim()
      if (name.length < 2) {
        toast.error('Enter at least 2 letters of the student name.')
        return
      }
    } else {
      if (!from || !to) {
        toast.error('Select both from and to dates.')
        return
      }
      if (from > to) {
        toast.error('From date cannot be after to date.')
        return
      }
    }

    setIsLoading(true)
    setHasSearched(true)
    try {
      const data = await searchFeeReceipts(
        mode === 'name'
          ? { studentName: String(nameValue || '').trim() }
          : { dateFrom: from, dateTo: to },
      )
      setRows(Array.isArray(data) ? data : [])
      return Array.isArray(data) ? data : []
    } catch (error) {
      setRows([])
      toast.error(error?.response?.data?.message || 'Could not load transactions.')
      return []
    } finally {
      setIsLoading(false)
    }
  }, [searchMode, dateFrom, dateTo, studentName])

  useEffect(() => {
    if (!canAccess) return
    if (searchParams.get('autoSearch') !== '1') return

    const date = searchParams.get('date') || todayIso()
    const txnRaw = Number.parseInt(searchParams.get('txn') || '', 10)
    const txnId = Number.isFinite(txnRaw) && txnRaw > 0 ? txnRaw : null

    setSearchMode('date')
    setDateFrom(date)
    setDateTo(date)
    setStudentName('')
    setSearchParams({}, { replace: true })

    let pulseTimer
    void (async () => {
      const data = await runSearch({
        searchMode: 'date',
        dateFrom: date,
        dateTo: date,
      })
      if (!txnId || !data?.length) return
      const hasMatch = data.some((row) => Number(row.transactionId) === txnId)
      if (!hasMatch) return
      setHighlightTxnId(txnId)
      pulseTimer = window.setTimeout(() => setHighlightTxnId(null), 2000)
    })()

    return () => {
      if (pulseTimer) window.clearTimeout(pulseTimer)
    }
  }, [canAccess, searchParams, setSearchParams, runSearch])

  const onReprint = async (receiptId) => {
    setReprintingId(receiptId)
    try {
      const receipt = await getFeeReceiptForReprint(receiptId)
      if (!receipt) {
        toast.error('Receipt not found.')
        return
      }
      printFeeReceipts([receipt])
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Could not reprint receipt.')
    } finally {
      setReprintingId(null)
    }
  }

  const onViewVoided = async (activityLogId, listReceiptId) => {
    setReprintingId(`void-${activityLogId}`)
    try {
      const receipt = await getVoidedFeeReceiptForPrint(activityLogId)
      if (!receipt) {
        toast.error('Voided receipt not found.')
        return
      }
      setVoidPreview({
        receiptId: listReceiptId ?? receipt.receiptId,
        html: buildVoidReceiptPreviewHtml(receipt),
      })
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Could not open voided receipt.')
    } finally {
      setReprintingId(null)
    }
  }

  const openEdit = async (receiptId) => {
    try {
      const receipt = await getFeeReceiptForReprint(receiptId)
      if (!receipt) {
        toast.error('Receipt not found.')
        return
      }
      setEditState({
        receiptId,
        date: toDateInputValue(receipt.date),
        lines: (receipt.lines || []).map((line) => ({
          id: line.id,
          description: line.description || 'Fee',
          amount: String(Math.round(Number(line.amount) || 0)),
        })),
        studentName: receipt.studentName || '',
      })
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Could not load receipt.')
    }
  }

  const saveEdit = async () => {
    if (!editState) return
    const lines = editState.lines.map((line) => ({
      id: line.id,
      amount: Math.floor(Number(line.amount) || 0),
    }))
    if (lines.some((line) => line.amount <= 0)) {
      toast.error('Each amount must be greater than zero.')
      return
    }

    setIsSavingEdit(true)
    try {
      await editFeeReceipt(editState.receiptId, {
        date: editState.date,
        lines,
      })
      toast.success('Receipt updated.')
      setEditState(null)
      await runSearch()
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Could not update receipt.')
    } finally {
      setIsSavingEdit(false)
    }
  }

  if (!canAccess) {
    return (
      <CampusShell headerContext="Transaction History">
        <div className="min-h-screen bg-slate-100 p-4 pt-[4.25rem] md:p-6 md:pt-[4.5rem]">
          <AccessForbiddenPanel />
        </div>
      </CampusShell>
    )
  }

  return (
    <CampusShell headerContext="Transaction History">
      <div className="min-h-screen bg-slate-100 p-4 pt-[4.25rem] md:p-6 md:pt-[4.5rem]">
        <div className="mx-auto max-w-6xl">
          <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
            <div className="space-y-5 p-5">
              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--campus-primary)] text-white">
                  <History size={18} />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-800">Transaction History</h1>
                  <p className="text-sm text-slate-500">
                    Search by date range or by student name, then reprint a receipt.
                    {canEditReceipt ? ' You can also edit the date or amount.' : ''}
                  </p>
                </div>
              </div>

              <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
                <button
                  type="button"
                  onClick={() => setMode('date')}
                  className={`rounded-md px-3 py-1.5 text-[13px] font-medium transition ${
                    searchMode === 'date'
                      ? 'bg-[var(--campus-primary)] text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-800'
                  }`}
                >
                  Date range
                </button>
                <button
                  type="button"
                  onClick={() => setMode('name')}
                  className={`rounded-md px-3 py-1.5 text-[13px] font-medium transition ${
                    searchMode === 'name'
                      ? 'bg-[var(--campus-primary)] text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-800'
                  }`}
                >
                  Student name
                </button>
              </div>

              <div className="flex flex-wrap items-end gap-3">
                {searchMode === 'date' ? (
                  <>
                    <label className="block min-w-[10rem] flex-1 text-[13px] font-medium text-slate-700 sm:max-w-[12rem]">
                      From date
                      <input
                        type="date"
                        className={`${inputClass} mt-1`}
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                      />
                    </label>
                    <label className="block min-w-[10rem] flex-1 text-[13px] font-medium text-slate-700 sm:max-w-[12rem]">
                      To date
                      <input
                        type="date"
                        className={`${inputClass} mt-1`}
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                      />
                    </label>
                  </>
                ) : (
                  <label className="block min-w-[14rem] flex-1 text-[13px] font-medium text-slate-700 sm:max-w-sm">
                    Student name
                    <input
                      type="text"
                      name="filterStudentName"
                      placeholder="At least 2 letters"
                      className={`${inputClass} mt-1`}
                      value={studentName}
                      onChange={(e) => setStudentName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          void runSearch()
                        }
                      }}
                      {...FILTER_INPUT_AUTOCOMPLETE_PROPS}
                    />
                  </label>
                )}
                <button
                  type="button"
                  disabled={!canSearch || isLoading}
                  onClick={() => void runSearch()}
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
                  Choose date range or student name, then search.
                </p>
              ) : rows.length === 0 ? (
                <p className="px-5 py-10 text-center text-sm text-slate-500">No receipts found.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-[13px] leading-snug">
                    <thead>
                      <tr>
                        <th className="px-3 py-2 font-semibold">Receipt #</th>
                        <th className="px-3 py-2 font-semibold">Date</th>
                        <th className="px-3 py-2 font-semibold">Student</th>
                        <th className="px-3 py-2 font-semibold">Class</th>
                        <th className="px-3 py-2 font-semibold">Received by</th>
                        <th className="px-3 py-2 text-right font-semibold">Amount</th>
                        <th className="px-3 py-2 text-right font-semibold">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => {
                        const isVoided = Boolean(row.isVoided)
                        const key = isVoided
                          ? `void-${row.voidActivityLogId || row.receiptId}`
                          : `rcpt-${row.receiptId}`
                        const isHighlighted =
                          highlightTxnId != null && Number(row.transactionId) === highlightTxnId
                        return (
                          <tr
                            key={key}
                            className={`border-b border-slate-100 ${
                              isVoided ? 'bg-rose-50/40 text-slate-500' : 'hover:bg-slate-50/80'
                            } ${isHighlighted ? 'fee-txn-row-pulse' : ''}`}
                          >
                            <td className="px-3 py-1.5 font-medium text-slate-800">
                              {row.receiptId}
                              {row.manualRcptNo ? (
                                <span className="ml-1 text-slate-500">/{row.manualRcptNo}</span>
                              ) : null}
                              {isVoided ? (
                                <span className="ml-2 rounded bg-rose-100 px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-rose-700">
                                  Voided
                                </span>
                              ) : null}
                            </td>
                            <td className="px-3 py-1.5 text-slate-700">
                              {formatDisplayDate(row.date)}
                              {row.time ? <span className="ml-1 text-slate-500">{row.time}</span> : null}
                            </td>
                            <td className="px-3 py-1.5 text-slate-800">
                              <div>{row.studentName}</div>
                              {row.studentId ? (
                                <div className="text-[12px] text-slate-500">Acc {row.studentId}</div>
                              ) : null}
                            </td>
                            <td className="px-3 py-1.5 text-slate-700">{row.className || '—'}</td>
                            <td className="px-3 py-1.5 text-slate-700">{row.receivedBy || '—'}</td>
                            <td className="px-3 py-1.5 text-right font-medium text-slate-900">
                              {money(row.totalReceived)}
                            </td>
                            <td className="px-3 py-1.5 text-right">
                              <div className="inline-flex items-center justify-end gap-1">
                                {isVoided ? (
                                  canEditReceipt && row.voidActivityLogId ? (
                                    <button
                                      type="button"
                                      title="View voided receipt"
                                      disabled={reprintingId === `void-${row.voidActivityLogId}`}
                                      onClick={() =>
                                        void onViewVoided(row.voidActivityLogId, row.receiptId)
                                      }
                                      className="btn-icon-soft btn-table-action inline-flex h-7 w-7 items-center justify-center rounded-md text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                                    >
                                      {reprintingId === `void-${row.voidActivityLogId}` ? (
                                        <Loader2 className="animate-spin" size={14} />
                                      ) : (
                                        <Eye size={14} />
                                      )}
                                    </button>
                                  ) : (
                                    <span className="text-[12px] text-slate-400">—</span>
                                  )
                                ) : (
                                  <>
                                    <button
                                      type="button"
                                      title="Reprint receipt"
                                      disabled={reprintingId === row.receiptId}
                                      onClick={() => void onReprint(row.receiptId)}
                                      className="btn-icon-soft btn-table-action inline-flex h-7 w-7 items-center justify-center rounded-md text-[var(--campus-primary)] hover:bg-indigo-50 disabled:opacity-50"
                                    >
                                      {reprintingId === row.receiptId ? (
                                        <Loader2 className="animate-spin" size={14} />
                                      ) : (
                                        <Printer size={14} />
                                      )}
                                    </button>
                                    {canEditReceipt ? (
                                      <button
                                        type="button"
                                        title="Edit date or amount"
                                        onClick={() => void openEdit(row.receiptId)}
                                        className="btn-icon-soft btn-table-action inline-flex h-7 w-7 items-center justify-center rounded-md text-[var(--campus-primary)] hover:bg-indigo-50"
                                      >
                                        <Pencil size={14} />
                                      </button>
                                    ) : null}
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      {editState ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="text-lg font-semibold text-slate-900">Edit receipt #{editState.receiptId}</h2>
              <p className="mt-1 text-sm text-slate-500">
                {editState.studentName}. Only the date and amounts can be changed. Void the receipt to change anything else.
              </p>
            </div>
            <div className="space-y-4 px-5 py-4">
              <label className="block text-[13px] font-medium text-slate-700">
                Receipt date
                <input
                  type="date"
                  className={`${inputClass} mt-1`}
                  value={editState.date}
                  onChange={(e) => setEditState((current) => ({ ...current, date: e.target.value }))}
                  disabled={isSavingEdit}
                />
              </label>
              <div className="space-y-2">
                <div className="text-[13px] font-medium text-slate-700">Amounts</div>
                {editState.lines.map((line, index) => (
                  <label key={line.id} className="block text-[13px] text-slate-600">
                    {line.description}
                    <input
                      type="number"
                      min="1"
                      step="1"
                      className={`${inputClass} mt-1`}
                      value={line.amount}
                      onChange={(e) => {
                        const value = e.target.value
                        setEditState((current) => ({
                          ...current,
                          lines: current.lines.map((item, i) =>
                            i === index ? { ...item, amount: value } : item,
                          ),
                        }))
                      }}
                      disabled={isSavingEdit}
                    />
                  </label>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4">
              <button
                type="button"
                className="h-10 rounded-lg border border-slate-300 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
                onClick={() => setEditState(null)}
                disabled={isSavingEdit}
              >
                Cancel
              </button>
              <button
                type="button"
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-[var(--campus-primary)] px-4 text-sm font-medium text-white hover:bg-[#364574] disabled:opacity-60"
                onClick={() => void saveEdit()}
                disabled={isSavingEdit}
              >
                {isSavingEdit ? <Loader2 className="animate-spin" size={16} /> : null}
                Save
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {voidPreview ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-3 sm:p-4">
          <div className="flex h-[94vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-5 py-3">
              <h2 className="text-base font-semibold text-slate-900">
                Voided receipt #{voidPreview.receiptId}
              </h2>
              <button
                type="button"
                title="Close"
                onClick={() => setVoidPreview(null)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800"
              >
                <X size={16} />
              </button>
            </div>
            <iframe
              title={`Voided receipt ${voidPreview.receiptId}`}
              srcDoc={voidPreview.html}
              className="min-h-0 w-full flex-1 bg-white"
            />
          </div>
        </div>
      ) : null}
    </CampusShell>
  )
}
