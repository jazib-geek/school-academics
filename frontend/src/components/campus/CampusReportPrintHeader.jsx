import { getCampusPrintMeta } from '../../utils/campusProfile'

/**
 * Print-only header matching Fee / Student report sheets.
 */
export default function CampusReportPrintHeader({ title, subtitle }) {
  const { schoolName, campusLabel, phonesDisplay, sessionLabel } = getCampusPrintMeta()

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 10,
        gap: 16,
      }}
    >
      <div>
        <div className="print-school-name" style={{ fontSize: 18, fontWeight: 700, letterSpacing: 0.3 }}>
          {schoolName}
        </div>
        <div style={{ fontSize: 11, marginTop: 2 }}>{campusLabel}</div>
        {sessionLabel ? <div style={{ fontSize: 11 }}>Session: {sessionLabel}</div> : null}
        <div style={{ fontSize: 11 }}>Tel. {phonesDisplay}</div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div className="print-report-title" style={{ fontSize: 15, fontWeight: 700 }}>
          {title}
        </div>
        {subtitle ? <div style={{ fontSize: 11, marginTop: 4 }}>{subtitle}</div> : null}
      </div>
    </div>
  )
}
