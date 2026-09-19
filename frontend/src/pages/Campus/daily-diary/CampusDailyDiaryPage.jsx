import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import Select from 'react-select'
import { BookOpen, ImagePlus, List, Loader2 } from 'lucide-react'
import CampusShell from '../../../components/campus/CampusShell.jsx'
import ConfirmDialog from '../../../components/campus/ConfirmDialog.jsx'
import DiaryReplaceHistoryPanel from '../../../components/diary/DiaryReplaceHistoryPanel.jsx'
import { getClassLevels } from '../../../services/classService'
import {
  diaryRowClassId,
  diaryRowDateKey,
  diaryRowLastUpdatedAt,
  diaryRowLastUpdatedBy,
  getClassDiaryListing,
  uploadClassDiary,
} from '../../../services/classDiaryService'
import { compressDiaryImages, formatFileSize } from '../../../utils/imageCompress.js'

const getPakistanTodayIso = () => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Karachi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())

  const year = parts.find((p) => p.type === 'year')?.value
  const month = parts.find((p) => p.type === 'month')?.value
  const day = parts.find((p) => p.type === 'day')?.value
  return `${year}-${month}-${day}`
}

const shiftPakistanIso = (iso, dayDelta) => {
  const [y, m, d] = iso.split('-').map(Number)
  const utcNoon = Date.UTC(y, m - 1, d, 12, 0, 0)
  const shifted = utcNoon + dayDelta * 24 * 60 * 60 * 1000
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Karachi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(shifted))

  const year = parts.find((p) => p.type === 'year')?.value
  const month = parts.find((p) => p.type === 'month')?.value
  const day = parts.find((p) => p.type === 'day')?.value
  return `${year}-${month}-${day}`
}

const formatDateLabel = (iso) => {
  if (!iso) return ''
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return iso
  const utcNoon = Date.UTC(y, m - 1, d, 12, 0, 0)
  return new Intl.DateTimeFormat('en-PK', {
    timeZone: 'Asia/Karachi',
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(utcNoon)
}

function CampusDailyDiaryPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const todayIso = useMemo(() => getPakistanTodayIso(), [])
  const yesterdayIso = useMemo(() => shiftPakistanIso(todayIso, -1), [todayIso])
  const tomorrowIso = useMemo(() => shiftPakistanIso(todayIso, 1), [todayIso])
  const allowedDates = useMemo(
    () => [yesterdayIso, todayIso, tomorrowIso],
    [yesterdayIso, todayIso, tomorrowIso],
  )

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
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [existingDiary, setExistingDiary] = useState(false)
  const [currentLastUpdatedBy, setCurrentLastUpdatedBy] = useState(null)
  const [currentLastUpdatedAt, setCurrentLastUpdatedAt] = useState(null)
  const [replaceConfirmOpen, setReplaceConfirmOpen] = useState(false)

  const willReplace = existingDiary || isReplaceMode
  const priorUploaderName = currentLastUpdatedBy?.trim() || 'another user'

  useEffect(() => {
    const loadLookups = async () => {
      setLoadingLookups(true)
      setError('')
      try {
        const classList = await getClassLevels()
        setClasses(classList)
      } catch (err) {
        setError(err?.response?.data?.message || 'Unable to load classes.')
      } finally {
        setLoadingLookups(false)
      }
    }

    loadLookups()
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
    () => classes.map((item) => ({ value: String(item.id ?? item.ID), label: item.className ?? item.ClassName })),
    [classes],
  )

  const onFileChange = async (ev) => {
    setError('')
    setSuccess('')
    const picked = Array.from(ev.target.files || []).slice(0, 2)
    ev.target.value = ''

    if (picked.length === 0) {
      setFiles([])
      return
    }

    try {
      const compressed = await compressDiaryImages(picked)
      setFiles(compressed)
    } catch (err) {
      setFiles([])
      setError(err.message || 'Could not optimize images.')
    }
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!classId) {
      setError('Select a class.')
      return
    }

    if (!allowedDates.includes(date)) {
      setError('Date must be yesterday, today, or tomorrow (Pakistan time).')
      return
    }

    if (files.length === 0) {
      setError('Choose 1 or 2 image files.')
      return
    }

    if (willReplace) {
      setReplaceConfirmOpen(true)
      return
    }

    await performUpload()
  }

  const performUpload = async () => {
    setIsUploading(true)
    try {
      const response = await uploadClassDiary({
        classId: Number(classId),
        date,
        files,
      })

      if (!response?.success) {
        setError(response?.message || 'Upload failed.')
        return
      }

      setSuccess(
        willReplace
          ? 'Diary images replaced. Previous images were removed.'
          : 'Daily diary saved. View all diaries from the listing page.',
      )
      setFiles([])
      setExistingDiary(true)
      if (isReplaceMode) {
        navigate('/campus/daily-diary/list', { replace: true })
      }
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Upload failed.')
    } finally {
      setIsUploading(false)
      setReplaceConfirmOpen(false)
    }
  }

  const dateOptions = [
    { value: yesterdayIso, label: `Yesterday — ${formatDateLabel(yesterdayIso)}` },
    { value: todayIso, label: `Today — ${formatDateLabel(todayIso)}` },
    { value: tomorrowIso, label: `Tomorrow — ${formatDateLabel(tomorrowIso)}` },
  ]

  return (
    <CampusShell headerContext="Daily Diary">
      <div className="space-y-4 p-4 pt-[4.25rem] md:p-6 md:pt-[4.5rem]">
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--campus-primary)] text-white">
                <BookOpen size={18} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-800">
                  {isReplaceMode || existingDiary ? 'Replace daily diary' : 'Upload daily diary'}
                </h1>
                <p className="text-sm text-slate-500">
                  One class per upload. Add 1 or 2 pages (max 1 MB combined after optimization).
                  {existingDiary || isReplaceMode
                    ? ' Saving replaces the current images for this class and date.'
                    : ''}
                </p>
              </div>
            </div>
            <Link
              to="/campus/daily-diary/list"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <List size={16} /> View all diaries
            </Link>
          </div>
        </div>

        {existingDiary || isReplaceMode ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-sm">
            A diary already exists for this class and date. Uploading new images will remove the old ones from
            storage and update the record.
          </div>
        ) : null}

        <form
          onSubmit={onSubmit}
          className="rounded-2xl bg-white p-4 shadow-sm md:p-6"
        >
          <label className="block text-sm font-medium text-slate-700">
            Class
            <Select
              className="mt-2"
              classNamePrefix="diary-select"
              isClearable={!isReplaceMode}
              isDisabled={isReplaceMode}
              isLoading={loadingLookups}
              options={classOptions}
              placeholder="Select class…"
              value={classOptions.find((o) => o.value === classId) || null}
              onChange={(option) => setClassId(option?.value || '')}
            />
          </label>

          <label className="mt-5 block text-sm font-medium text-slate-700">
            Date (Pakistan)
            <select
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 disabled:bg-slate-50"
              value={date}
              disabled={isReplaceMode}
              onChange={(ev) => setDate(ev.target.value)}
            >
              {dateOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          <label className="mt-5 block text-sm font-medium text-slate-700">
            Diary images (1 or 2)
            <input
              type="file"
              accept="image/*"
              multiple
              className="mt-2 block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-indigo-700 hover:file:bg-indigo-100"
              onChange={onFileChange}
            />
          </label>
          <p className="mt-1 text-xs text-slate-500">
            Images are resized before upload. Combined size must be 1 MB or less.
          </p>

          {files.length > 0 ? (
            <p className="mt-2 text-xs font-medium text-slate-600">
              {files.length} file{files.length > 1 ? 's' : ''} ready · {formatFileSize(optimizedSize)} total
            </p>
          ) : null}

          {previewUrls.length > 0 ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {previewUrls.map((url, index) => (
                <div
                  key={url}
                  className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50"
                >
                  <img src={url} alt={`Page ${index + 1}`} className="max-h-56 w-full object-contain" />
                  <p className="border-t border-slate-100 px-3 py-1.5 text-xs text-slate-500">Page {index + 1}</p>
                </div>
              ))}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={isUploading || loadingLookups}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--campus-primary)] px-4 py-3 text-sm font-medium text-white transition hover:bg-[#344476] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isUploading ? (
              <>
                <Loader2 size={18} className="animate-spin" /> Uploading…
              </>
            ) : (
              <>
                <ImagePlus size={18} />{' '}
                {existingDiary || isReplaceMode ? 'Replace diary images' : 'Save daily diary'}
              </>
            )}
          </button>
        </form>

        {existingDiary && classId && date ? (
          <DiaryReplaceHistoryPanel
            classId={classId}
            date={date}
            variant="campus"
            refreshKey={currentLastUpdatedAt ?? ''}
          />
        ) : null}

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 shadow-sm">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 shadow-sm">
            {success}
          </div>
        ) : null}
      </div>

      <ConfirmDialog
        open={replaceConfirmOpen}
        title="Replace diary?"
        description={
          <>
            This diary was already uploaded by{' '}
            <span className="font-medium text-slate-800">{priorUploaderName}</span> and will be
            overwritten.
          </>
        }
        confirmLabel="Replace diary"
        cancelLabel="Cancel"
        busy={isUploading}
        onCancel={() => setReplaceConfirmOpen(false)}
        onConfirm={performUpload}
      />
    </CampusShell>
  )
}

export default CampusDailyDiaryPage
