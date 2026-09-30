import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { ArrowRight, Banknote, ClipboardCheck, Users, CheckCircle2, AlertCircle, TriangleAlert } from 'lucide-react'
import CampusShell from '../../../components/campus/CampusShell.jsx'
import ConfirmDialog from '../../../components/campus/ConfirmDialog.jsx'
import { getClasses } from '../../../services/classService'
import { getFeeIncrementStudents, previewFeeIncrement, applyFeeIncrement } from '../../../services/studentService'

const field = 'h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm disabled:bg-slate-100'
const button = 'rounded-lg bg-[var(--campus-primary)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50'
const money = (value) => value == null ? 'Missing' : Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 })

function FeeComparison({ before, after, highlight = false }) {
  return <div className="flex items-center justify-end gap-2 tabular-nums">
    <div className="text-right"><span className="block text-[10px] font-medium uppercase tracking-wide text-slate-400">Current</span><span className="text-slate-500">{money(before)}</span></div>
    <ArrowRight aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-slate-300" />
    <div className={`min-w-20 rounded-xl px-3 py-1.5 text-right ${highlight ? 'bg-emerald-50 text-emerald-800 ring-1 ring-inset ring-emerald-100' : 'bg-slate-50 text-slate-800'}`}>
      <span className="block text-[10px] font-medium uppercase tracking-wide opacity-70">Proposed</span><span className="font-bold">{money(after)}</span>
    </div>
  </div>
}

function RecentFeeUpdatePill({ row }) {
  if (row.recentFeeUpdateDaysAgo == null) return null
  const days = row.recentFeeUpdateDaysAgo
  const when = days === 0 ? 'today' : `${days} ${days === 1 ? 'day' : 'days'} ago`
  return <span
    title={`Last logged fee update: ${row.recentFeeUpdateAtPkt?.replace('T', ' ')} (Pakistan time). Check before incrementing again.`}
    className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800 ring-1 ring-inset ring-amber-200"
  ><AlertCircle aria-hidden="true" className="h-3 w-3 shrink-0" />Fee {row.recentFeeUpdateWasIncrement ? 'incremented' : 'updated'} {when}</span>
}

export default function CampusStudentIncrementFeePage() {
  const [classes, setClasses] = useState([])
  const [scope, setScope] = useState('class')
  const [classId, setClassId] = useState('')
  const [rows, setRows] = useState([])
  const [selected, setSelected] = useState(new Set())
  const [tuition, setTuition] = useState('')
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [preview, setPreview] = useState(null)
  const [confirm, setConfirm] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [reload, setReload] = useState(0)
  const submitting = useRef(false)

  useEffect(() => {
    let cancelled = false
    getClasses().then((data) => { if (!cancelled) setClasses(data) })
      .catch(() => { if (!cancelled) setError('Could not load classes. Refresh the page to retry.') })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    let cancelled = false
    if (scope !== 'class' || !classId) return
    getFeeIncrementStudents(Number(classId)).then((data) => {
      if (cancelled) return
      setRows(data)
      setSelected(new Set(data.map((row) => row.regId)))
    }).catch((err) => {
      if (!cancelled) setError(err?.response?.data?.message || 'Could not load students.')
    }).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [scope, classId, reload])

  const invalidate = () => { setPreview(null); setConfirm(false); setError(''); setSuccess('') }
  const changeScope = (value) => {
    invalidate()
    setScope(value)
    setRows([])
    setSelected(new Set())
    setLoading(value === 'class' && Boolean(classId))
  }
  const changeClass = (value) => {
    invalidate()
    setClassId(value)
    setRows([])
    setSelected(new Set())
    setLoading(Boolean(value))
  }
  const toggle = (id) => {
    invalidate()
    setSelected((old) => {
      const next = new Set(old)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  const createPreview = async (event) => {
    event.preventDefault()
    if (submitting.current) return
    invalidate()
    const tuitionIncrement = Number(tuition)
    if (tuition === '' || !Number.isSafeInteger(tuitionIncrement) || tuitionIncrement <= 0 ||
      tuitionIncrement > 2147483647) {
      setError('Enter a positive whole-number tuition increment. The same amount is added to Total Fee.')
      return
    }
    submitting.current = true
    setBusy(true)
    try {
      const result = await previewFeeIncrement({ scope, tuitionIncrement,
        classCompositeId: scope === 'class' ? Number(classId) : null,
        studentIds: scope === 'class' ? [...selected] : [],
      })
      setPreview(result)
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not preview the increment.')
    } finally { submitting.current = false; setBusy(false) }
  }
  const apply = async () => {
    if (submitting.current || !preview?.canApply) return
    submitting.current = true
    setBusy(true)
    setError('')
    try {
      const result = await applyFeeIncrement(preview.previewId)
      const message = `Fee increment applied to ${result.updatedCount} active students.`
      setSuccess(message)
      toast.success(message)
      setPreview(null)
      setTuition('')
      if (scope === 'class') {
        setRows([])
        setSelected(new Set())
        setLoading(true)
        setReload((value) => value + 1)
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not confirm the result. Reload current fees before creating another preview.')
      // Keep the token on network/server errors so retrying cannot apply twice.
      if ([400, 403, 409].includes(err?.response?.status)) setPreview(null)
    } finally { setConfirm(false); submitting.current = false; setBusy(false) }
  }

  const displayed = preview?.rows || rows
  const totals = preview?.rows.reduce((acc, row) => {
    for (const key of Object.keys(acc)) acc[key] += Number(row[key] || 0)
    return acc
  }, { totalFee: 0, newTotalFee: 0, tuitionFee: 0, newTuitionFee: 0, concession: 0, newConcession: 0 })

  return (
    <CampusShell headerContext="Increment Fee">
      <div className="min-h-screen bg-slate-100 p-4 pt-[4.25rem] md:p-6 md:pt-[4.5rem]">
        <div className="mx-auto max-w-7xl space-y-4">
          <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-white p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-xl bg-emerald-50 p-2 text-emerald-700"><Banknote aria-hidden="true" className="h-5 w-5" /></div>
              <div><h1 className="text-lg font-semibold text-slate-900">Increment Fee</h1>
                <p className="mt-0.5 text-[13px] text-slate-500">Increase tuition and total fees together, then review each student's revised amounts.</p></div>
            </div>
            <div className="flex items-center gap-2 text-xs font-medium" aria-label="Progress">
              <span className={`rounded-full px-3 py-1.5 ${preview ? 'bg-slate-100 text-slate-500' : 'bg-indigo-50 text-indigo-700'}`}>1. Select</span>
              <ArrowRight aria-hidden="true" className="h-3 w-3 text-slate-300" />
              <span className={`rounded-full px-3 py-1.5 ${preview ? 'bg-amber-50 text-amber-800' : 'text-slate-400'}`}>2. Proofread</span>
              <ArrowRight aria-hidden="true" className="h-3 w-3 text-slate-300" /><span className="text-slate-400">3. Confirm</span>
            </div>
          </section>
          {error && <div role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-800">{error}</div>}
          {success && <div role="status" className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">{success}</div>}
          <form onSubmit={createPreview} className="rounded-2xl bg-white p-5 shadow-sm">
            <fieldset disabled={busy} className="space-y-4">
              <div className={`grid items-end gap-4 md:grid-cols-2 ${scope === 'class' ? 'lg:grid-cols-[1fr_1fr_1fr_auto]' : 'lg:grid-cols-[1fr_1fr_auto]'}`}>
                <label className="space-y-1 text-sm font-medium">Apply to
                  <select className={field} value={scope} onChange={(e) => changeScope(e.target.value)}>
                    <option value="class">Class</option><option value="school">Entire school (current campus)</option>
                  </select></label>
                {scope === 'class' && <label className="space-y-1 text-sm font-medium">Class / Section
                  <select required className={field} value={classId} onChange={(e) => changeClass(e.target.value)}>
                    <option value="">Choose class</option>
                    {classes.map((item) => <option key={item.id} value={item.id}>{item.className}</option>)}
                  </select></label>}
                <label className="space-y-1 text-sm font-medium">Increase Tuition Fee by
                  <input required type="number" min="1" max="2147483647" step="1" className={field} value={tuition}
                    onChange={(e) => { invalidate(); setTuition(e.target.value) }} placeholder="e.g. 300" /></label>
                <button className={`${button} h-10 whitespace-nowrap`} disabled={busy || loading || (scope === 'class' && (!classId || selected.size === 0))}>
                  {busy ? 'Please wait…' : 'Preview Changes'}
                </button>
              </div>
              <p className="text-xs text-slate-500">The same amount is added to Tuition Fee and Total Fee. Concession is recalculated from their difference and stays unchanged when existing fees are consistent.</p>
              {scope === 'school' && <p className="text-sm text-amber-800">All active students across all classes in the current campus will be included.</p>}
            </fieldset>
          </form>

          {(loading || displayed.length > 0 || (scope === 'class' && classId)) && <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
            <div className={`flex flex-wrap items-center justify-between gap-3 border-b p-4 ${preview ? 'border-amber-100 bg-amber-50/70' : 'border-slate-200'}`}>
              <div className="flex items-center gap-3">
                <div className={`rounded-xl p-2 ${preview ? 'bg-amber-100 text-amber-700' : 'bg-indigo-50 text-indigo-600'}`}>{preview ? <ClipboardCheck aria-hidden="true" className="h-5 w-5" /> : <Users aria-hidden="true" className="h-5 w-5" />}</div>
                <div><h2 className="font-semibold text-slate-900">{preview ? 'Fee increment · Proofreading sheet' : 'Active students'}</h2>
                <p className="text-sm text-slate-500">{preview ? `${displayed.length} students · Campus: ${preview.campus}` : `${selected.size} of ${rows.length} selected`}</p></div>
              </div>
              {preview && <button type="button" disabled={busy} className="rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs font-semibold text-amber-900 disabled:opacity-50" onClick={() => setPreview(null)}>Edit selection</button>}
            </div>
            {preview && <div className="space-y-4 border-b border-slate-200 p-4 md:p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-slate-600">Compare the current and proposed amounts below before confirming.</p>
                <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">Review only · Not saved</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3"><p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Students included</p><p className="mt-1 text-xl font-bold tabular-nums text-slate-900">{displayed.length}</p><p className="mt-1 text-xs text-slate-500">{scope === 'school' ? 'All active students in this campus' : classes.find((c) => String(c.id) === classId)?.className}</p></div>
                <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-3"><p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">Increase per student</p><p className="mt-1 text-xl font-bold tabular-nums text-emerald-800">+{money(tuition)}</p><p className="mt-1 text-xs text-emerald-700">Added to tuition and total fee</p></div>
                <div className={`rounded-xl border p-3 ${preview.canApply ? 'border-slate-200 bg-slate-50/70' : 'border-rose-200 bg-rose-50'}`}><p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Review status</p><p className={`mt-1 flex items-center gap-2 font-semibold ${preview.canApply ? 'text-slate-800' : 'text-rose-700'}`}>{preview.canApply ? <CheckCircle2 aria-hidden="true" className="h-4 w-4 text-emerald-600" /> : <AlertCircle aria-hidden="true" className="h-4 w-4" />}{preview.canApply ? 'Ready for your review' : `${displayed.filter((row) => row.error).length} rows need attention`}</p><p className="mt-2 text-xs text-slate-500">Check names, amounts and concessions</p></div>
              </div>
            </div>}
            {loading ? <p role="status" className="p-5 text-sm">Loading active students…</p> : <div className="max-h-[60vh] overflow-auto">
              <table className="w-full whitespace-nowrap text-left text-sm">
                <thead className="sticky top-0 bg-slate-100 text-xs uppercase text-slate-600"><tr>
                  {!preview && <th className="p-3"><input type="checkbox" aria-label="Select all students" disabled={busy || rows.length === 0}
                    checked={rows.length > 0 && selected.size === rows.length}
                    onChange={(e) => { invalidate(); setSelected(e.target.checked ? new Set(rows.map((r) => r.regId)) : new Set()) }} /></th>}
                  <th className="p-3">Reg #</th><th className="p-3">Student</th><th className="p-3">Class</th>
                  <th className="p-3 text-right">Total Fee</th>
                  <th className="p-3 text-right">Concession</th>
                  <th className="p-3 text-right">Tuition Fee</th>
                </tr></thead>
                <tbody className="divide-y divide-slate-100">{displayed.map((row) => <tr key={row.regId} className={row.error ? 'bg-rose-50' : ''}>
                  {!preview && <td className="p-3"><input type="checkbox" aria-label={`Include ${row.fullName || row.regId}`} checked={selected.has(row.regId)} disabled={busy} onChange={() => toggle(row.regId)} /></td>}
                  <td className="p-3">{row.regId}</td><td className="p-3 font-medium"><div>{row.fullName}</div><RecentFeeUpdatePill row={row} />{preview && row.error && <p className="mt-1 max-w-xs whitespace-normal text-xs text-rose-700">{row.error}</p>}</td><td className="p-3">{row.className || '—'}</td>
                  <td className="p-3 text-right tabular-nums">{preview ? <FeeComparison before={row.totalFee} after={row.newTotalFee} /> : money(row.totalFee)}</td>
                  <td className="p-3 text-right tabular-nums">{preview ? <FeeComparison before={row.concession} after={row.newConcession} /> : money(row.concession)}</td>
                  <td className="p-3 text-right tabular-nums">{preview ? <FeeComparison before={row.tuitionFee} after={row.newTuitionFee} highlight /> : <span className="inline-flex min-w-20 justify-end rounded-full bg-emerald-50 px-3 py-1 font-bold text-emerald-800 ring-1 ring-inset ring-emerald-100">{money(row.tuitionFee)}</span>}</td>
                </tr>)}</tbody>
                {totals && preview.canApply && <tfoot className="border-t-2 border-slate-200 bg-slate-50 font-semibold"><tr><td colSpan={3} className="p-3">Reviewed batch totals<p className="mt-1 text-xs font-normal text-slate-500">{displayed.length} students included</p></td>
                  <td className="p-3 text-right"><FeeComparison before={totals.totalFee} after={totals.newTotalFee} /></td>
                  <td className="p-3 text-right"><FeeComparison before={totals.concession} after={totals.newConcession} /></td>
                  <td className="p-3 text-right"><FeeComparison before={totals.tuitionFee} after={totals.newTuitionFee} highlight /></td></tr></tfoot>}
              </table>
              {displayed.length === 0 && <p className="p-5 text-sm text-slate-500">No active students in this class.</p>}
            </div>}
            {preview && <div className="space-y-3 border-t border-slate-200 p-4">
              {!preview.canApply && <p role="alert" className="text-sm text-rose-700">Resolve the highlighted fees, adjust the increment, or deselect affected students in class mode, then preview again.</p>}
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div><p className="text-sm font-semibold text-slate-800">Finished proofreading?</p><p className="mt-1 text-xs text-slate-500">Continue to the final confirmation when all amounts look correct. Preview valid for 15 minutes.</p></div>
                <button type="button" className={`${button} inline-flex items-center gap-2`} disabled={busy || !preview.canApply} onClick={() => setConfirm(true)}>Continue to confirmation <ArrowRight aria-hidden="true" className="h-4 w-4" /></button>
              </div>
            </div>}
          </section>}
        </div>
      </div>
      <ConfirmDialog open={confirm} title="Confirm fee increment" busy={busy} confirmLabel="Confirm and Apply"
        icon={<TriangleAlert aria-hidden="true" className="h-6 w-6" />}
        onCancel={() => setConfirm(false)} onConfirm={apply}
        description={<div className="space-y-3">
          <p>Apply to <strong>{preview?.rows.length} active students</strong> in campus <strong>{preview?.campus}</strong> ({scope === 'school' ? 'entire school' : classes.find((c) => String(c.id) === classId)?.className})? Add {money(tuition)} to both Tuition Fee and Total Fee for each student, and save the calculated concessions.</p>
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-amber-900">
            <p className="font-semibold">Fee values will be permanently overwritten.</p>
            <p className="mt-1 text-xs leading-5">This replaces the selected students’ stored Total Fee, Tuition Fee and Concession with the reviewed amounts. Please check carefully before confirming.</p>
          </div>
        </div>} />
    </CampusShell>
  )
}
