import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import JSZip from 'jszip'
import { ArrowLeft, CheckCircle2, FileArchive, Loader2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import CampusShell from '../../../components/campus/CampusShell.jsx'
import { compressProfileImage } from '../../../utils/imageCompress.js'
import {
  previewStudentProfileImages,
  uploadStudentProfileImage,
} from '../../../services/studentService'

const IMAGE_TYPES = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.bmp': 'image/bmp',
}

function imageType(fileName) {
  const extension = fileName.slice(fileName.lastIndexOf('.')).toLowerCase()
  return IMAGE_TYPES[extension] || 'image/jpeg'
}

export default function CampusStudentProfilePhotoImportPage() {
  const navigate = useNavigate()
  const inputRef = useRef(null)
  const [zipFile, setZipFile] = useState(null)
  const [phase, setPhase] = useState('idle')
  const [errors, setErrors] = useState([])
  const [rows, setRows] = useState([])
  const [overwriteCount, setOverwriteCount] = useState(0)
  const [completed, setCompleted] = useState(0)
  const [failed, setFailed] = useState(0)

  const busy = phase === 'validating' || phase === 'uploading'
  const ready = phase === 'ready' || phase === 'uploading' || phase === 'done'
  const progress = rows.length === 0 ? 0 : Math.round((completed / rows.length) * 100)

  const resetReview = () => {
    setPhase('idle')
    setErrors([])
    setRows([])
    setOverwriteCount(0)
    setCompleted(0)
    setFailed(0)
  }

  const onChoose = (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.zip')) {
      toast.error('Choose a .zip file.')
      return
    }
    setZipFile(file)
    resetReview()
  }

  const validate = async () => {
    if (!zipFile) {
      toast.error('Choose a zip file first.')
      return
    }
    setPhase('validating')
    setErrors([])
    setRows([])
    setOverwriteCount(0)
    setCompleted(0)
    setFailed(0)
    try {
      const preview = await previewStudentProfileImages(zipFile)
      const nextErrors = preview?.errors || preview?.Errors || []
      const nextFiles = preview?.files || preview?.Files || []
      const valid = preview?.isValid ?? preview?.IsValid
      if (!valid) {
        setErrors(nextErrors.length ? nextErrors : ['The zip could not be used.'])
        setPhase('idle')
        return
      }
      setRows(nextFiles.map((file) => ({
        fileName: file.fileName,
        regId: file.regId,
        studentName: file.studentName,
        className: file.className,
        willOverwrite: Boolean(file.willOverwrite),
        status: 'pending',
        error: '',
      })))
      setOverwriteCount(preview.overwriteCount ?? preview.OverwriteCount ?? nextFiles.filter((file) => file.willOverwrite).length)
      setPhase('ready')
    } catch (error) {
      setPhase('idle')
      toast.error(error?.response?.data?.message || error?.message || 'Could not validate the zip file.')
    }
  }

  const uploadAll = async () => {
    if (!zipFile || rows.length === 0 || phase === 'uploading') return
    setPhase('uploading')
    setCompleted(0)
    setFailed(0)
    let done = 0
    let failedCount = 0
    try {
      const zip = await JSZip.loadAsync(await zipFile.arrayBuffer())
      for (const row of rows) {
        setRows((current) => current.map((item) => (
          item.regId === row.regId ? { ...item, status: 'uploading', error: '' } : item
        )))
        try {
          const entry = zip.file(row.fileName)
          if (!entry) {
            throw new Error('That file is no longer in the zip.')
          }
          const blob = await entry.async('blob')
          const source = new File([blob], row.fileName, { type: imageType(row.fileName) })
          const compressed = await compressProfileImage(source)
          await uploadStudentProfileImage(row.regId, compressed)
          done += 1
          setCompleted(done)
          setRows((current) => current.map((item) => (
            item.regId === row.regId ? { ...item, status: 'done', error: '' } : item
          )))
        } catch (error) {
          failedCount += 1
          done += 1
          setFailed(failedCount)
          setCompleted(done)
          setRows((current) => current.map((item) => (
            item.regId === row.regId
              ? { ...item, status: 'failed', error: error?.response?.data?.message || error?.message || 'Upload failed.' }
              : item
          )))
        }
      }
      setPhase('done')
      if (failedCount === 0) {
        toast.success(`Uploaded ${rows.length} profile photo${rows.length === 1 ? '' : 's'}.`)
      } else {
        toast.error(`${failedCount} photo${failedCount === 1 ? '' : 's'} failed. The others were uploaded.`)
      }
    } catch (error) {
      setPhase('ready')
      toast.error(error?.message || 'Could not read the zip file.')
    }
  }

  return (
    <CampusShell headerContext="Import Photos">
      <div className="min-h-screen bg-slate-100 p-4 pt-[4.25rem] md:p-6 md:pt-[4.5rem]">
        <div className="mx-auto max-w-5xl space-y-4">
          <section className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <button
                type="button"
                onClick={() => navigate('/campus/students')}
                className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
                aria-label="Back to students"
              >
                <ArrowLeft size={18} />
              </button>
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--campus-primary)] text-white">
                <FileArchive size={18} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-800">Import profile photos</h1>
                <p className="text-sm text-slate-500">
                  Zip up to 50 images. Name each file with the student registration number, such as 1204.jpg.
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-4 rounded-2xl bg-white p-4 shadow-sm md:p-5">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              <p>Put the image files at the root of the zip, not inside a folder. JPG, PNG, WEBP, GIF, and BMP are accepted. Each file can be up to 8 MB, and the zip itself up to 80 MB. Photos are resized before they are stored.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <input
                ref={inputRef}
                type="file"
                accept=".zip,application/zip"
                className="hidden"
                onChange={onChoose}
                disabled={busy}
              />
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={busy}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                <Upload size={16} />
                Choose zip
              </button>
              <span className="min-w-0 truncate text-sm text-slate-600">
                {zipFile ? zipFile.name : 'No file selected'}
              </span>
              <button
                type="button"
                onClick={validate}
                disabled={!zipFile || busy}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-[var(--campus-primary)] px-4 text-sm font-semibold text-white disabled:opacity-60"
              >
                {phase === 'validating' ? <Loader2 size={16} className="animate-spin" /> : null}
                Validate
              </button>
            </div>

            {errors.length > 0 ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
                <p className="text-sm font-semibold text-rose-700">This zip cannot be imported until every file is valid.</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-rose-700">
                  {errors.map((error, index) => <li key={`${index}-${error}`}>{error}</li>)}
                </ul>
              </div>
            ) : null}

            {ready ? (
              <div className="space-y-3">
                {overwriteCount > 0 ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    {overwriteCount === 1
                      ? '1 student already has a profile photo. It will be replaced.'
                      : `${overwriteCount} students already have a profile photo. Those photos will be replaced.`}
                  </div>
                ) : (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                    None of these students have a profile photo yet.
                  </div>
                )}

                {(phase === 'uploading' || phase === 'done') ? (
                  <div>
                    <div className="mb-1 flex items-center justify-between text-xs font-semibold text-slate-500">
                      <span>{phase === 'done' ? 'Finished' : 'Uploading'}</span>
                      <span>{completed} / {rows.length}{failed > 0 ? ` · ${failed} failed` : ''}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="h-full rounded-full bg-[var(--campus-primary)] transition-[width]"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                ) : null}

                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-3 py-2">File</th>
                        <th className="px-3 py-2">Reg no.</th>
                        <th className="px-3 py-2">Student</th>
                        <th className="px-3 py-2">Class</th>
                        <th className="px-3 py-2">Photo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => (
                        <tr key={row.regId} className="border-t border-slate-100">
                          <td className="px-3 py-2 font-medium text-slate-800">{row.fileName}</td>
                          <td className="px-3 py-2">{row.regId}</td>
                          <td className="px-3 py-2">{row.studentName}</td>
                          <td className="px-3 py-2">{row.className || '—'}</td>
                          <td className="px-3 py-2">
                            {row.status === 'done' ? (
                              <span className="inline-flex items-center gap-1 text-emerald-700"><CheckCircle2 size={14} /> Uploaded</span>
                            ) : null}
                            {row.status === 'uploading' ? (
                              <span className="inline-flex items-center gap-1 text-slate-600"><Loader2 size={14} className="animate-spin" /> Uploading</span>
                            ) : null}
                            {row.status === 'failed' ? (
                              <span className="text-rose-700" title={row.error}>Failed</span>
                            ) : null}
                            {row.status === 'pending' ? (
                              row.willOverwrite
                                ? <span className="font-semibold text-amber-700">Will replace existing photo</span>
                                : <span className="text-slate-600">New photo</span>
                            ) : null}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {phase === 'ready' ? (
                  <button
                    type="button"
                    onClick={uploadAll}
                    className="inline-flex h-10 items-center gap-2 rounded-lg bg-[var(--campus-primary)] px-4 text-sm font-semibold text-white"
                  >
                    Confirm and upload
                  </button>
                ) : null}
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </CampusShell>
  )
}
