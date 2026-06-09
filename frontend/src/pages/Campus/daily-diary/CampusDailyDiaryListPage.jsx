import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Eye, ImagePlus, List, Loader2, Trash2, X } from 'lucide-react'
import CampusShell from '../../../components/campus/CampusShell.jsx'
import {
  deleteClassDiary,
  diaryRowClassId,
  diaryRowDateKey,
  getClassDiaryListing,
  parseDiaryImgUrls,
} from '../../../services/classDiaryService'
import { resolveClassLabel, sortClassesByCustomOrder } from '../../../services/classSort.js'

const formatDateLabel = (iso) => {
  if (!iso) return '—'
  const value = `${iso}`.slice(0, 10)
  const [y, m, d] = value.split('-').map(Number)
  if (!y || !m || !d) return value
  const utcNoon = Date.UTC(y, m - 1, d, 12, 0, 0)
  return new Intl.DateTimeFormat('en-PK', {
    timeZone: 'Asia/Karachi',
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(utcNoon)
}

function DiaryPageHeader({ icon: Icon, title, subtitle, action }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#405189] text-white">
            <Icon size={18} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
            <p className="text-sm text-slate-500">{subtitle}</p>
          </div>
        </div>
        {action}
      </div>
    </div>
  )
}

function DeleteDiaryConfirmDialog({ open, className, dateLabel, deleting, onCancel, onConfirm }) {
  if (!open) return null

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-diary-confirm-title"
        aria-describedby="delete-diary-confirm-desc"
        className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl ring-1 ring-slate-200"
        onClick={(ev) => ev.stopPropagation()}
      >
        <h3 id="delete-diary-confirm-title" className="text-base font-semibold text-slate-900">
          Delete daily diary?
        </h3>
        <p id="delete-diary-confirm-desc" className="mt-2 text-sm text-slate-600">
          This will permanently remove the diary for{' '}
          <span className="font-medium text-slate-800">{className}</span> on{' '}
          <span className="font-medium text-slate-800">{dateLabel}</span>, including all uploaded images.
        </p>
        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={deleting}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="inline-flex items-center gap-2 rounded-lg border border-rose-600 bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {deleting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Deleting…
              </>
            ) : (
              'Delete permanently'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

function DiaryImageFrame({ url, alt, pageLabel }) {
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    setLoaded(false)
    setError(false)
  }, [url])

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
      <p className="border-b border-slate-100 px-3 py-2 text-xs font-medium text-slate-500">{pageLabel}</p>
      <div className="relative flex min-h-[220px] items-center justify-center bg-slate-100/60">
        {!loaded && !error ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-500">
            <Loader2 size={28} className="animate-spin text-[#405189]" />
            <span className="text-xs">Loading image…</span>
          </div>
        ) : null}
        {error ? (
          <p className="px-4 py-8 text-sm text-rose-600">Could not load this image.</p>
        ) : (
          <img
            src={url}
            alt={alt}
            className={`max-h-[70vh] w-full object-contain transition-opacity duration-300 ${
              loaded ? 'opacity-100' : 'opacity-0'
            }`}
            onLoad={() => setLoaded(true)}
            onError={() => setError(true)}
          />
        )}
      </div>
    </div>
  )
}

function DiaryViewerModal({ row, onClose, onDeleted }) {
  const [urls, setUrls] = useState([])
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    setUrls(parseDiaryImgUrls(row))
    setDeleteError('')
    setShowDeleteConfirm(false)
  }, [row])

  if (!row) return null

  const className = row.className ?? row.ClassName ?? 'Class'
  const dateKey = diaryRowDateKey(row)
  const classId = diaryRowClassId(row)
  const dateLabel = formatDateLabel(dateKey)

  const onConfirmDelete = async () => {
    setDeleting(true)
    setDeleteError('')
    try {
      const response = await deleteClassDiary({ classId, date: dateKey })
      if (!response?.success) {
        setDeleteError(response?.message || 'Delete failed.')
        setShowDeleteConfirm(false)
        return
      }
      onDeleted?.()
      onClose()
    } catch (err) {
      setDeleteError(err?.response?.data?.message || 'Delete failed.')
      setShowDeleteConfirm(false)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-4 sm:items-center"
        role="dialog"
        aria-modal="true"
        aria-label="Diary images"
        onClick={onClose}
      >
        <div
          className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-xl"
          onClick={(ev) => ev.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div>
              <p className="font-semibold text-slate-800">{className}</p>
              <p className="text-sm text-slate-500">{dateLabel}</p>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={deleting}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-50"
              >
                {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                Delete
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          <div className="space-y-4 p-4">
            {urls.length === 0 ? (
              <p className="text-sm text-slate-500">No images found.</p>
            ) : (
              urls.map((url, index) => (
                <DiaryImageFrame
                  key={url}
                  url={url}
                  alt={`${className} diary page ${index + 1}`}
                  pageLabel={`Page ${index + 1}`}
                />
              ))
            )}
            {deleteError ? (
              <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
                {deleteError}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <DeleteDiaryConfirmDialog
        open={showDeleteConfirm}
        className={className}
        dateLabel={dateLabel}
        deleting={deleting}
        onCancel={() => setShowDeleteConfirm(false)}
        onConfirm={() => void onConfirmDelete()}
      />
    </>
  )
}

function CampusDailyDiaryListPage() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [viewerRow, setViewerRow] = useState(null)
  const [pendingDeleteRow, setPendingDeleteRow] = useState(null)
  const [deletingKey, setDeletingKey] = useState('')

  const loadListing = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await getClassDiaryListing()
      setRows(data)
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to load diaries.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadListing()
  }, [loadListing])

  const groupedByDate = useMemo(() => {
    const map = new Map()
    for (const row of rows) {
      const dateKey = diaryRowDateKey(row)
      if (!map.has(dateKey)) map.set(dateKey, [])
      map.get(dateKey).push(row)
    }

    return Array.from(map.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([dateKey, items]) => ({
        dateKey,
        dateLabel: formatDateLabel(dateKey),
        items: sortClassesByCustomOrder(items, 'className'),
      }))
  }, [rows])

  const onConfirmDeleteRow = async () => {
    if (!pendingDeleteRow) return

    const classId = diaryRowClassId(pendingDeleteRow)
    const dateKey = diaryRowDateKey(pendingDeleteRow)
    const rowKey = `${classId}-${dateKey}`

    setDeletingKey(rowKey)
    setError('')
    try {
      const response = await deleteClassDiary({ classId, date: dateKey })
      if (!response?.success) {
        setError(response?.message || 'Delete failed.')
        return
      }
      setPendingDeleteRow(null)
      await loadListing()
    } catch (err) {
      setError(err?.response?.data?.message || 'Delete failed.')
    } finally {
      setDeletingKey('')
    }
  }

  const pendingDeleteClassName = pendingDeleteRow
    ? resolveClassLabel(pendingDeleteRow, 'className')
    : ''
  const pendingDeleteDateLabel = pendingDeleteRow
    ? formatDateLabel(diaryRowDateKey(pendingDeleteRow))
    : ''

  return (
    <CampusShell headerContext="Daily Diary">
      <div className="space-y-4 p-4 pt-20 md:p-6 md:pt-24">
        <DiaryPageHeader
          icon={List}
          title="Daily diary listing"
          subtitle="Diaries grouped by date. Images load only when you open a class."
          action={
            <Link
              to="/campus/daily-diary"
              className="inline-flex items-center gap-2 rounded-lg bg-[#405189] px-4 py-2 text-sm font-medium text-white hover:bg-[#344476]"
            >
              <ImagePlus size={16} /> Upload diary
            </Link>
          }
        />

        {loading ? (
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 size={18} className="animate-spin" /> Loading diaries…
            </p>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 shadow-sm">
            {error}
          </div>
        ) : groupedByDate.length === 0 ? (
          <div className="rounded-2xl bg-white p-6 text-sm text-slate-500 shadow-sm">
            No diaries uploaded yet.
          </div>
        ) : (
          groupedByDate.map(({ dateKey, dateLabel, items }) => (
            <section key={dateKey} className="overflow-hidden rounded-2xl bg-white shadow-sm">
              <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
                <h2 className="text-base font-semibold text-slate-800">{dateLabel}</h2>
                <p className="text-xs text-slate-500">
                  {items.length} class{items.length === 1 ? '' : 'es'}
                </p>
              </div>
              <ul className="divide-y divide-slate-100">
                {items.map((row) => {
                  const classId = diaryRowClassId(row)
                  const rowKey = `${classId}-${dateKey}`
                  const className = resolveClassLabel(row, 'className')
                  const imageCount = row.imageCount ?? row.ImageCount ?? parseDiaryImgUrls(row).length
                  const isDeleting = deletingKey === rowKey

                  return (
                    <li
                      key={rowKey}
                      className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50/80"
                    >
                      <div>
                        <p className="font-medium text-slate-800">{className}</p>
                        <p className="text-xs text-slate-500">
                          {imageCount} page{imageCount === 1 ? '' : 's'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setViewerRow(row)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-indigo-700 hover:bg-indigo-50"
                        >
                          <Eye size={15} /> View
                        </button>
                        <button
                          type="button"
                          onClick={() => setPendingDeleteRow(row)}
                          disabled={isDeleting}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-sm font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                        >
                          {isDeleting ? (
                            <Loader2 size={15} className="animate-spin" />
                          ) : (
                            <Trash2 size={15} />
                          )}
                          Delete
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))
        )}
      </div>

      {viewerRow ? (
        <DiaryViewerModal
          row={viewerRow}
          onClose={() => setViewerRow(null)}
          onDeleted={loadListing}
        />
      ) : null}

      <DeleteDiaryConfirmDialog
        open={Boolean(pendingDeleteRow)}
        className={pendingDeleteClassName}
        dateLabel={pendingDeleteDateLabel}
        deleting={Boolean(deletingKey)}
        onCancel={() => setPendingDeleteRow(null)}
        onConfirm={() => void onConfirmDeleteRow()}
      />
    </CampusShell>
  )
}

export default CampusDailyDiaryListPage
