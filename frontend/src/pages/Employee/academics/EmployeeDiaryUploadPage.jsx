import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { EmployeeSelect as Select } from '../../../components/employee/EmployeeSelect'
import { toast } from 'sonner'
import EmployeeBackButton from '../../../components/employee/EmployeeBackButton'
import DiaryReplaceHistoryPanel from '../../../components/diary/DiaryReplaceHistoryPanel'
import EmployeeBlockingLoader from '../../../components/employee/EmployeeBlockingLoader'
import EmployeeLayout from '../../../components/employee/EmployeeLayout'
import { getClassLevels } from '../../../services/classService'
import {
  diaryRowClassId,
  diaryRowDateKey,
  diaryRowLastUpdatedAt,
  diaryRowLastUpdatedBy,
  getClassDiaryListing,
  uploadClassDiary,
} from '../../../services/classDiaryService'
import { compressDiaryImages, formatFileSize } from '../../../utils/imageCompress'
import {
  diaryDateChipLabel,
  formatDateLabel,
  getAllowedDiaryDateIsos,
  getPakistanTodayIso,
} from './employeeAcademicsUtils'

const selectStyles = {
  control: (base, state) => ({
    ...base,
    minHeight: 48,
    borderRadius: 6,
    borderColor: state.isFocused ? '#1a73e8' : '#e8eaed',
    boxShadow: state.isFocused ? '0 0 0 4px rgba(26,115,232,0.12)' : 'none',
  }),
  menu: (base) => ({ ...base, zIndex: 40 }),
}

function EmployeeDiaryUploadPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const todayIso = useMemo(() => getPakistanTodayIso(), [])
  const allowedDates = useMemo(() => getAllowedDiaryDateIsos(), [])

  const queryClassId = searchParams.get('classId') || ''
  const queryDate = searchParams.get('date') || ''
  const initialDate = allowedDates.includes(queryDate) ? queryDate : todayIso
  const isReplaceMode = Boolean(queryClassId && allowedDates.includes(queryDate))

  const [classes, setClasses] = useState([])
  const [classId, setClassId] = useState(queryClassId)
  const [date, setDate] = useState(initialDate)
  const [files, setFiles] = useState([])
  const [previewUrls, setPreviewUrls] = useState([])
  const [optimizedSize, setOptimizedSize] = useState(0)
  const [loadingLookups, setLoadingLookups] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [existingDiary, setExistingDiary] = useState(false)
  const [currentLastUpdatedBy, setCurrentLastUpdatedBy] = useState(null)
  const [currentLastUpdatedAt, setCurrentLastUpdatedAt] = useState(null)
  const [replaceConfirmOpen, setReplaceConfirmOpen] = useState(false)

  useEffect(() => {
    const load = async () => {
      setLoadingLookups(true)
      try {
        setClasses(await getClassLevels())
      } catch (err) {
        toast.error(err?.response?.data?.message || 'Unable to load classes.')
      } finally {
        setLoadingLookups(false)
      }
    }
    load()
  }, [])

  useEffect(() => {
    if (!classId || !date) {
      setExistingDiary(false)
      setCurrentLastUpdatedBy(null)
      setCurrentLastUpdatedAt(null)
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const rows = await getClassDiaryListing()
        if (cancelled) return
        const match = (rows || []).find(
          (row) =>
            Number(diaryRowClassId(row)) === Number(classId) && diaryRowDateKey(row) === date,
        )
        setExistingDiary(Boolean(match))
        setCurrentLastUpdatedBy(match ? diaryRowLastUpdatedBy(match) : null)
        setCurrentLastUpdatedAt(match ? diaryRowLastUpdatedAt(match) : null)
      } catch {
        if (!cancelled) {
          setExistingDiary(false)
          setCurrentLastUpdatedBy(null)
          setCurrentLastUpdatedAt(null)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [classId, date])

  useEffect(() => {
    if (files.length === 0) {
      setPreviewUrls([])
      setOptimizedSize(0)
      return undefined
    }
    const urls = files.map((file) => URL.createObjectURL(file))
    setPreviewUrls(urls)
    setOptimizedSize(files.reduce((sum, file) => sum + file.size, 0))
    return () => urls.forEach((url) => URL.revokeObjectURL(url))
  }, [files])

  const classOptions = useMemo(
    () =>
      classes.map((item) => ({
        value: String(item.id ?? item.ID),
        label: item.className ?? item.ClassName,
      })),
    [classes],
  )

  const selectedClass = classOptions.find((o) => o.value === classId) || null
  const willReplace = existingDiary || isReplaceMode
  const priorUploaderName =
    currentLastUpdatedBy?.trim() || 'another user'

  const performUpload = async () => {
    setReplaceConfirmOpen(false)
    setIsUploading(true)
    try {
      const response = await uploadClassDiary({
        classId: Number(classId),
        date,
        files,
      })
      if (!response?.success) {
        toast.error(response?.message || 'Upload failed.')
        return
      }
      setFiles([])
      setExistingDiary(true)
      toast.success(willReplace ? 'Diary images replaced.' : 'Daily diary saved.')
      navigate('/employee/academics/diary', { replace: true })
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || 'Upload failed.')
    } finally {
      setIsUploading(false)
    }
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    if (!classId) {
      toast.error('Select a class.')
      return
    }
    if (!allowedDates.includes(date)) {
      toast.error('Date must be yesterday, today, or tomorrow.')
      return
    }
    if (files.length === 0) {
      toast.error('Choose 1 or 2 images.')
      return
    }

    if (willReplace) {
      setReplaceConfirmOpen(true)
      return
    }

    await performUpload()
  }

  const onFileChange = async (ev) => {
    const picked = Array.from(ev.target.files || []).slice(0, 2)
    ev.target.value = ''
    if (picked.length === 0) {
      setFiles([])
      return
    }
    try {
      setFiles(await compressDiaryImages(picked))
    } catch (err) {
      setFiles([])
      toast.error(err.message || 'Could not prepare images.')
    }
  }

  return (
    <EmployeeLayout
      title={willReplace ? 'Replace diary' : 'Upload diary'}
      subtitle="One class, up to two pages"
      showProfileCard={false}
      showQuickTiles={false}
      compactContentTop
    >
      <form onSubmit={onSubmit} className="space-y-3 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))]">
        <EmployeeBackButton label="Diaries" to="/employee/academics/diary" />

        {willReplace ? (
          <div className="rounded-[var(--emp-radius-lg)] border border-[var(--emp-warning)]/30 bg-[var(--emp-warning-soft)] px-4 py-3 text-sm leading-snug text-[var(--emp-text)]">
            New images replace the current diary for this class and date.
          </div>
        ) : null}

        <div className="emp-surface space-y-4 rounded-[var(--emp-radius-lg)] p-4">
          <label className="block text-sm font-medium text-[var(--emp-text)]">
            Class
            <div className="mt-1.5">
              <Select
                isLoading={loadingLookups}
                isDisabled={isReplaceMode}
                options={classOptions}
                value={selectedClass}
                onChange={(opt) => setClassId(opt?.value || '')}
                placeholder="Select class…"
                styles={selectStyles}
              />
            </div>
          </label>

          <fieldset>
            <legend className="mb-2 text-sm font-medium text-[var(--emp-text)]">Date</legend>
            <div className="grid grid-cols-3 gap-2">
              {allowedDates.map((iso) => {
                const active = date === iso
                return (
                  <button
                    key={iso}
                    type="button"
                    disabled={isReplaceMode}
                    onClick={() => setDate(iso)}
                    className={`emp-choice-btn ${active ? 'emp-choice-btn-active' : ''}`}
                  >
                    <span className="block text-[11px] font-medium uppercase tracking-wide text-[var(--emp-text-muted)]">
                      {diaryDateChipLabel(iso)}
                    </span>
                    <span className="text-xs leading-snug">{formatDateLabel(iso)}</span>
                  </button>
                )
              })}
            </div>
          </fieldset>

          <div>
            <p className="text-sm font-medium text-[var(--emp-text)]">Images (1 or 2)</p>
            <label className="emp-file-picker mt-2">
              <span className="text-sm font-semibold text-[var(--emp-primary)]">Choose photos</span>
              <span className="text-center text-xs text-[var(--emp-text-muted)]">
                {files.length > 0
                  ? `${files.length} selected · ${formatFileSize(optimizedSize)}`
                  : 'Up to two pages from your gallery'}
              </span>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={onFileChange}
                className="sr-only"
              />
            </label>
          </div>

          {files.length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {previewUrls.map((url, index) => (
                <div key={url} className="overflow-hidden rounded-xl border border-[var(--emp-border)] bg-[#0f0f0f]">
                  <p className="px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-white/60">
                    Page {index + 1}
                  </p>
                  <img src={url} alt={`Page ${index + 1}`} className="h-36 w-full object-contain" />
                </div>
              ))}
            </div>
          ) : null}
        </div>

        {existingDiary && classId && date ? (
          <DiaryReplaceHistoryPanel
            classId={classId}
            date={date}
            variant="employee"
            refreshKey={currentLastUpdatedAt ?? ''}
            collapsible
            compact
          />
        ) : null}

        <div
          className="fixed inset-x-0 bottom-[calc(var(--emp-nav-height)+env(safe-area-inset-bottom,0px))] z-40 mx-auto max-w-screen-md border-t border-[var(--emp-border)] bg-[var(--emp-surface)] px-3 py-3"
        >
          <button
            type="submit"
            disabled={isUploading || loadingLookups}
            className="emp-cta-btn emp-cta-btn-success emp-cta-btn-block"
          >
            {willReplace ? 'Replace diary images' : 'Save diary'}
          </button>
        </div>
      </form>

      {replaceConfirmOpen ? (
        <div
          className="emp-modal-backdrop fixed inset-0 z-[80] flex items-end justify-center bg-slate-900/40 p-0 sm:items-center sm:p-4"
          onClick={() => !isUploading && setReplaceConfirmOpen(false)}
        >
          <div
            className="emp-modal-card w-full max-w-sm rounded-t-3xl bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl ring-1 ring-slate-200 sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
            role="alertdialog"
            aria-modal="true"
          >
            <h3 className="text-base font-semibold text-[var(--emp-text)]">Replace diary?</h3>
            <p className="mt-2 text-sm leading-relaxed text-[var(--emp-text-muted)]">
              This diary was already uploaded by{' '}
              <span className="font-medium text-[var(--emp-text)]">{priorUploaderName}</span> and will be
              replaced.
            </p>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                disabled={isUploading}
                onClick={() => setReplaceConfirmOpen(false)}
                className="emp-cta-btn emp-cta-btn-outline flex-1"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isUploading}
                onClick={() => performUpload()}
                className="emp-cta-btn emp-cta-btn-success flex-1"
              >
                Replace
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <EmployeeBlockingLoader
        open={isUploading}
        message={willReplace ? 'Replacing diary images…' : 'Uploading diary…'}
      />
    </EmployeeLayout>
  )
}

export default EmployeeDiaryUploadPage
