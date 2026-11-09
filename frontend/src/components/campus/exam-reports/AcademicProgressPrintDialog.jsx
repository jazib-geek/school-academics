import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Loader2, Printer, X } from 'lucide-react'
import ExamPrintAcademicProgress from './ExamPrintAcademicProgress'
import { EXAM_REPORT_PRINT_CSS } from './examPrintStyles'
import { getAcademicProgressFlags, runSmartExamReport } from '../../../services/examReportService'

export default function AcademicProgressPrintDialog({ studentId, studentName, onClose }) {
  const [step, setStep] = useState('loading')
  const [flags, setFlags] = useState({ hasDrawing: false, hasStemp: false })
  const [markDrawingAsGrade, setMarkDrawingAsGrade] = useState(true)
  const [markStempAsGrade, setMarkStempAsGrade] = useState(true)
  const [payload, setPayload] = useState(null)
  const [error, setError] = useState('')

  const loadCard = async (choices) => {
    setStep('card')
    setError('')
    setPayload(null)
    try {
      const data = await runSmartExamReport('result-card', {
        studentId,
        markDrawingAsGrade: choices.markDrawingAsGrade,
        markStempAsGrade: choices.markStempAsGrade,
      })
      setPayload(data?.layoutPayload || null)
    } catch (requestError) {
      setError(
        requestError?.response?.data?.message ||
          requestError?.response?.data?.Message ||
          'Unable to prepare this result card.',
      )
    }
  }

  useEffect(() => {
    let cancelled = false
    const start = async () => {
      try {
        const nextFlags = await getAcademicProgressFlags({ studentId })
        if (cancelled) return
        const hasDrawing = !!nextFlags?.hasDrawing
        const hasStemp = !!nextFlags?.hasStemp
        setFlags({ hasDrawing, hasStemp })
        if (hasDrawing || hasStemp) {
          setStep('ask')
          return
        }
        await loadCard({ markDrawingAsGrade: false, markStempAsGrade: true })
      } catch (requestError) {
        if (cancelled) return
        setStep('card')
        setError(
          requestError?.response?.data?.message ||
            requestError?.response?.data?.Message ||
            'Unable to prepare this result card.',
        )
      }
    }
    void start()
    return () => {
      cancelled = true
    }
    // studentId is fixed for the life of this dialog
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId])

  return (
    <>
      <style>{`
        ${EXAM_REPORT_PRINT_CSS}
        @page { size: 8.5in 13.5in; margin: 0.28in; }
        .ap-print-root { display: none; }
        @media print {
          body * { visibility: hidden !important; }
          .ap-print-root {
            display: block !important;
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            visibility: visible !important;
            background: #fff !important;
          }
          .ap-print-root, .ap-print-root * { visibility: visible !important; }
        }
      `}</style>
      <div className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto p-3 sm:p-6">
        <button type="button" aria-label="Close" className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
        <div className="relative z-10 mt-2 flex max-h-[calc(100vh-2rem)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200">
          <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3">
            <div className="min-w-0">
              <h2 className="truncate text-lg font-semibold text-slate-900">Result card</h2>
              <p className="text-xs text-slate-500">{studentName || `Student ${studentId}`}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {step === 'card' && payload && !error ? (
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  <Printer size={16} /> Print
                </button>
              ) : null}
              <button
                type="button"
                onClick={onClose}
                className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="min-h-[240px] flex-1 overflow-y-auto px-4 py-4">
            {step === 'loading' ? (
              <div className="flex min-h-[220px] items-center justify-center gap-3 text-slate-500">
                <Loader2 className="animate-spin" size={22} />
                <span className="text-sm">Preparing result card…</span>
              </div>
            ) : null}

            {step === 'ask' ? (
              <div className="mx-auto max-w-md py-6">
                <p className="text-sm text-slate-600">Choose how these subjects should appear on the card.</p>
                <div className="mt-4 space-y-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                  {flags.hasDrawing ? (
                    <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                      <input
                        type="checkbox"
                        checked={markDrawingAsGrade}
                        onChange={(event) => setMarkDrawingAsGrade(event.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                      />
                      Mark Drawing as grade
                    </label>
                  ) : null}
                  {flags.hasStemp ? (
                    <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                      <input
                        type="checkbox"
                        checked={markStempAsGrade}
                        onChange={(event) => setMarkStempAsGrade(event.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                      />
                      Mark Stemp as grade
                    </label>
                  ) : null}
                </div>
                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={() =>
                      void loadCard({
                        markDrawingAsGrade: flags.hasDrawing ? markDrawingAsGrade : false,
                        markStempAsGrade: flags.hasStemp ? markStempAsGrade : true,
                      })
                    }
                    className="rounded-lg bg-[var(--campus-primary)] px-3 py-2 text-sm font-semibold text-white"
                  >
                    Generate
                  </button>
                </div>
              </div>
            ) : null}

            {step === 'card' && error ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
            ) : null}

            {step === 'card' && !error && !payload ? (
              <div className="flex min-h-[220px] items-center justify-center gap-3 text-slate-500">
                <Loader2 className="animate-spin" size={22} />
                <span className="text-sm">Preparing result card…</span>
              </div>
            ) : null}

            {step === 'card' && payload ? (
              <div className="exam-print-preview overflow-auto rounded-xl border border-slate-200 p-4">
                <ExamPrintAcademicProgress payload={payload} />
              </div>
            ) : null}
          </div>
        </div>
      </div>
      {payload
        ? createPortal(
            <div className="ap-print-root exam-print-preview">
              <ExamPrintAcademicProgress payload={payload} />
            </div>,
            document.body,
          )
        : null}
    </>
  )
}
