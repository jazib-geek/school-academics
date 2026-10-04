import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { ProformaPrint } from '../../pages/Heads/ProformaPrint'
import { prepareReportForPrint } from '../../pages/Employee/coordinatorWorkspaceData'
import './proformaPrintEmbed.css'
import './proformaPaperPreview.css'

export default function ProformaPaperPreview({ report, campus, coordinatorName, reportDate }) {
  const viewportRef = useRef(null)
  const contentRef = useRef(null)
  const [layout, setLayout] = useState({ scale: 1, height: 0 })

  const printReport = useMemo(
    () => prepareReportForPrint({
      ...report,
      date: reportDate || report.date,
      coordinator: coordinatorName || report.coordinator || '',
    }),
    [report, coordinatorName, reportDate],
  )

  useLayoutEffect(() => {
    const viewport = viewportRef.current
    const content = contentRef.current
    if (!viewport || !content) return undefined

    const measure = () => {
      const naturalWidth = content.offsetWidth
      const naturalHeight = content.offsetHeight
      if (!naturalWidth) return
      const scale = Math.min(1, (viewport.clientWidth - 2) / naturalWidth)
      setLayout({ scale, height: Math.ceil(naturalHeight * scale) })
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(viewport)
    observer.observe(content)
    return () => observer.disconnect()
  }, [printReport])

  useLayoutEffect(() => {
    const root = contentRef.current
    if (!root) return
    root.querySelectorAll('.coord-entry').forEach((el) => el.classList.remove('coord-entry'))
    root.querySelectorAll('.filled:not([data-print-system])').forEach((el) => {
      const text = el.textContent?.replace(/\u00a0/g, ' ').trim()
      if (text) el.classList.add('coord-entry')
    })
    root.querySelectorAll('.support .continuation dd, .support .continuation p').forEach((el) => {
      const text = el.textContent?.replace(/\u00a0/g, ' ').trim()
      if (text) el.classList.add('coord-entry')
    })
  }, [printReport])

  return (
    <div className="cw-paper-preview" ref={viewportRef} aria-label="Official five-page report layout">
      <div
        className="cw-paper-preview-scaled"
        style={{
          height: layout.height ? `${layout.height}px` : undefined,
        }}
      >
        <div
          ref={contentRef}
          className="cw-paper-preview-inner"
          style={{
            transform: `scale(${layout.scale})`,
            transformOrigin: 'top left',
          }}
        >
          <ProformaPrint report={printReport} campus={campus} embedded />
        </div>
      </div>
    </div>
  )
}
