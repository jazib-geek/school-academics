import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Ban, History, Loader2, Search } from 'lucide-react'
import { toast } from 'sonner'
import CampusShell from '../../../components/campus/CampusShell.jsx'
import { AccessForbiddenPanel } from '../../../components/campus/CampusPermissionUi.jsx'
import { hasCampusPermission } from '../../../services/authService'
import {
  getFeeReceiptForReprint,
  voidFeeReceipt,
} from '../../../services/feeReceiptHistoryService'
import { buildFeeReceiptPreviewHtml } from '../../../utils/feeReceiptPrint'

function money(value) {
  return Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
}

export default function VoidFeeReceiptPage() {
  const canAccess = hasCampusPermission('void_rcpt')
  const [rcptId, setRcptId] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isVoiding, setIsVoiding] = useState(false)
  const [previewHtml, setPreviewHtml] = useState('')
  const [loadedReceipt, setLoadedReceipt] = useState(null)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const loadReceipt = async () => {
    const id = Number(String(rcptId).trim())
    if (!id || id <= 0) {
      toast.error('Enter a valid receipt number.')
      return
    }

    setIsLoading(true)
    setPreviewHtml('')
    setLoadedReceipt(null)
    try {
      const receipt = await getFeeReceiptForReprint(id)
      if (!receipt) {
        toast.error('Receipt not found.')
        return
      }
      setLoadedReceipt(receipt)
      setPreviewHtml(buildFeeReceiptPreviewHtml(receipt))
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Could not load receipt.')
    } finally {
      setIsLoading(false)
    }
  }

  const confirmVoid = async () => {
    if (!loadedReceipt?.receiptId) return
    setIsVoiding(true)
    try {
      await voidFeeReceipt(loadedReceipt.receiptId)
      toast.success(`Receipt #${loadedReceipt.receiptId} voided.`)
      setConfirmOpen(false)
      setLoadedReceipt(null)
      setPreviewHtml('')
      setRcptId('')
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Could not void receipt.')
    } finally {
      setIsVoiding(false)
    }
  }

  if (!canAccess) {
    return (
      <CampusShell headerContext="Void Receipt">
        <div className="min-h-screen bg-slate-100 p-4 pt-[4.25rem] md:p-6 md:pt-[4.5rem]">
          <AccessForbiddenPanel />
        </div>
      </CampusShell>
    )
  }

  return (
    <CampusShell headerContext="Void Receipt">
      <div className="min-h-screen bg-slate-100 p-4 pt-[4.25rem] md:p-6 md:pt-[4.5rem]">
        <div className="mx-auto max-w-6xl">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-rose-600 text-white">
                <Ban size={18} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-800">Void Receipt</h1>
                <p className="text-sm text-slate-500">
                  Enter a receipt number, check the preview, then confirm to void it.
                </p>
              </div>
            </div>
            <Link
              to="/campus/activity-logs/void-receipts"
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <History size={16} />
              Void history
            </Link>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="space-y-4 rounded-2xl bg-white p-5 shadow-sm">
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] leading-relaxed text-amber-950">
                <p className="font-semibold text-amber-900">Before you void</p>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  <li>Voiding permanently removes this payment from the student account.</li>
                  <li>The receipt number will not be reused.</li>
                  <li>This cannot be undone. Use edit on Transaction History if you only need to change the date or amount.</li>
                  <li>Check the preview on the right carefully before confirming.</li>
                </ul>
              </div>

              <label className="block text-[13px] font-medium text-slate-700">
                Receipt number
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="e.g. 2031"
                  className="mt-1 h-14 w-full rounded-xl border-2 border-slate-300 bg-white px-4 text-center text-3xl font-bold tracking-wide text-slate-900 outline-none transition focus:border-rose-500 focus:ring-2 focus:ring-rose-100"
                  value={rcptId}
                  onChange={(e) => setRcptId(e.target.value.replace(/[^\d]/g, ''))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      void loadReceipt()
                    }
                  }}
                />
              </label>

              <button
                type="button"
                disabled={isLoading || !String(rcptId).trim()}
                onClick={() => void loadReceipt()}
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[var(--campus-primary)] px-4 text-sm font-medium text-white hover:bg-[#364574] disabled:opacity-60 sm:w-auto"
              >
                {isLoading ? <Loader2 className="animate-spin" size={16} /> : <Search size={16} />}
                Load receipt
              </button>

              {loadedReceipt ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-[13px] text-slate-700">
                  <div className="font-medium text-slate-900">{loadedReceipt.studentName}</div>
                  <div className="mt-1 text-slate-600">
                    Acc {loadedReceipt.studentId}
                    {loadedReceipt.className ? ` · ${loadedReceipt.className}` : ''}
                    {' · '}
                    {money(loadedReceipt.totalReceived)}
                  </div>
                </div>
              ) : null}

              <button
                type="button"
                disabled={!loadedReceipt || isVoiding}
                onClick={() => setConfirmOpen(true)}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
              >
                Void this receipt
              </button>
            </section>

            <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
              <div className="border-b border-slate-100 px-4 py-3 text-[13px] font-medium text-slate-700">
                Receipt preview
              </div>
              {previewHtml ? (
                <iframe
                  title="Receipt preview"
                  srcDoc={previewHtml}
                  className="w-full bg-white"
                  style={{ height: 'min(78vh, 820px)' }}
                />
              ) : (
                <div className="flex h-[28rem] items-center justify-center px-6 text-center text-sm text-slate-500">
                  Enter a receipt number and load it to see the preview here.
                </div>
              )}
            </section>
          </div>
        </div>
      </div>

      {confirmOpen && loadedReceipt ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
            <div className="px-5 py-4">
              <h2 className="text-lg font-semibold text-slate-900">
                Void receipt #{loadedReceipt.receiptId}?
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                This removes the payment for {loadedReceipt.studentName} (
                {money(loadedReceipt.totalReceived)}). The receipt number will not be reused. This cannot be
                undone.
              </p>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4">
              <button
                type="button"
                className="h-10 rounded-lg border border-slate-300 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
                onClick={() => setConfirmOpen(false)}
                disabled={isVoiding}
              >
                Cancel
              </button>
              <button
                type="button"
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-rose-600 px-4 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-60"
                onClick={() => void confirmVoid()}
                disabled={isVoiding}
              >
                {isVoiding ? <Loader2 className="animate-spin" size={16} /> : null}
                Confirm void
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </CampusShell>
  )
}
