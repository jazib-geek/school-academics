import { Fragment } from 'react'
import { dash, formatPrintDate, getExamPrintMeta } from './examPrintShared'

const DOSSIER_ROWS = ['UNIFORM', 'PUNCTUALITY', 'ACTIVITIES', 'HANDWRITING', 'ATTITUDE']

function padSubjects(subjects, minRows = 8) {
  const rows = [...(subjects || [])]
  while (rows.length < minRows) {
    rows.push({ subjectId: `empty-${rows.length}`, subjectName: '', cells: [], empty: true })
  }
  return rows
}

function footerValue(summary, field, suffix = '') {
  if (!summary?.hasResult) return '-'
  const value = summary[field]
  if (value == null || value === '' || value === '-') return '-'
  return suffix ? `${value}${suffix}` : String(value)
}

function AcademicProgressCard({ card, isLast }) {
  const { campusLabel, schoolName, logoSrc, sessionLabel } = getExamPrintMeta()
  const examTypes = card.examTypes || []
  const subjects = padSubjects(card.subjects)
  const summaryByType = Object.fromEntries((card.examSummaries || []).map((item) => [item.examTypeId, item]))
  const session = card.sessionLabel || sessionLabel

  return (
    <div className={`exam-ap-card${isLast ? '' : ' exam-print-break'}`}>
      <div className="exam-ap-header">
        <div className="exam-ap-logo">
          <img src={logoSrc} alt="" />
        </div>
        <div className="exam-ap-header-text">
          <h1>{schoolName}</h1>
          <div className="exam-ap-campus">{campusLabel}</div>
          <h3>ACADEMIC PROGRESS</h3>
          {session ? <div>Session {session}</div> : null}
        </div>
      </div>
      <div className="exam-ap-issued">
        <b>Issue Date : </b>
        {formatPrintDate(card.issueDate)}
      </div>

      <div className="exam-ap-student">
        <table>
          <tbody>
            <tr>
              <td style={{ width: '10%' }}>Serial</td>
              <td style={{ width: '20%' }}>Student Name</td>
              <td style={{ width: '20%' }} />
              <td>Father Name</td>
            </tr>
            <tr className="exam-ap-bold exam-ap-bottom">
              <td>{card.studentId}</td>
              <td>{dash(card.studentName)}</td>
              <td />
              <td>{dash(card.fatherName)}</td>
            </tr>
            <tr className="exam-ap-top">
              <td>Class</td>
              <td className="exam-ap-bold">{dash(card.className)}</td>
              <td />
              <td>
                <u className="exam-ap-block">Address</u>
                <span className="exam-ap-bold">{dash(card.address)}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="exam-ap-marks">
        <table>
          <tbody>
            <tr className="exam-ap-bold">
              <td colSpan={2} rowSpan={2}>
                Subject
              </td>
              {examTypes.map((examType) => (
                <td key={examType.examTypeId} colSpan={2} className="exam-ap-center">
                  {examType.examTypeName}
                </td>
              ))}
            </tr>
            <tr className="exam-ap-bold exam-ap-subhead">
              {examTypes.map((examType) => (
                <Fragment key={examType.examTypeId}>
                  <td>
                    TOT. <b>MAR.</b>
                  </td>
                  <td className="exam-ap-center">
                    OBT. <b>MAR.</b>
                  </td>
                </Fragment>
              ))}
            </tr>
            {subjects.map((subject, index) => (
              <tr key={subject.subjectId || index}>
                <td className="exam-ap-serial">{subject.empty ? '' : index + 1}</td>
                <td className="exam-ap-subject">{subject.subjectName}</td>
                {examTypes.map((examType) => {
                  const cell = (subject.cells || []).find((item) => item.examTypeId === examType.examTypeId)
                  return (
                    <Fragment key={`${subject.subjectId}-${examType.examTypeId}`}>
                      <td>{cell?.displayTotal || ''}</td>
                      <td>{cell?.displayObtained || ''}</td>
                    </Fragment>
                  )
                })}
              </tr>
            ))}
            <tr>
              <td colSpan={2} className="exam-ap-bold exam-ap-right">
                TOTAL
              </td>
              {examTypes.map((examType) => {
                const summary = summaryByType[examType.examTypeId]
                if (!summary?.hasResult) {
                  return (
                    <Fragment key={examType.examTypeId}>
                      <td />
                      <td />
                    </Fragment>
                  )
                }
                return (
                  <Fragment key={examType.examTypeId}>
                    <td>{summary.totalMarks}</td>
                    <td>{summary.totalObtained}</td>
                  </Fragment>
                )
              })}
            </tr>
            {[
              ['Percentage', 'percentage', ' %'],
              ['Grade', 'grade', ''],
              ['Position (In Class)', 'positionDisplay', ''],
              ['Attendance', 'attendanceRatio', ''],
              ['Remarks', 'remarks', ''],
            ].map(([label, field, suffix]) => (
              <tr key={field}>
                <td colSpan={2} className="exam-ap-bold exam-ap-right">
                  {label}
                </td>
                {examTypes.map((examType) => (
                  <td key={examType.examTypeId} colSpan={2} className="exam-ap-center">
                    {footerValue(summaryByType[examType.examTypeId], field, suffix)}
                  </td>
                ))}
              </tr>
            ))}
            <tr className="exam-ap-dossier-row">
              <td colSpan={2} className="exam-ap-dossier">
                <i className="exam-ap-bold exam-ap-block">Personal Dossier</i>
                <table>
                  <tbody>
                    <tr>
                      <td className="exam-ap-left" style={{ width: '20%' }} />
                      <td>Excellent</td>
                      <td>Good</td>
                      <td className="exam-ap-no-right">Satisfactory</td>
                    </tr>
                    {DOSSIER_ROWS.map((label) => (
                      <tr key={label}>
                        <td className="exam-ap-left">{label}</td>
                        <td />
                        <td />
                        <td className="exam-ap-no-right" />
                      </tr>
                    ))}
                  </tbody>
                </table>
              </td>
              {examTypes.map((examType) => (
                <td key={examType.examTypeId} colSpan={2} className="exam-ap-long-remarks">
                  {summaryByType[examType.examTypeId]?.hasResult
                    ? summaryByType[examType.examTypeId].longRemarks
                    : '-'}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      <div className="exam-ap-note">Note: Errors and omissions are accepted within seven days after result declaration.</div>
      <div className="exam-ap-signs">
        <div>Head Teacher's Signature</div>
        <div>Teacher's Signature</div>
        <div>Parent's Signature</div>
      </div>
    </div>
  )
}

export default function ExamPrintAcademicProgress({ payload }) {
  const cards = payload?.cards || []
  return (
    <div className="exam-ap-sheet">
      {cards.map((card, index) => (
        <AcademicProgressCard key={card.studentId || index} card={card} isLast={index === cards.length - 1} />
      ))}
    </div>
  )
}
