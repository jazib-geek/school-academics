import { getExamPrintMeta } from './examPrintShared'

function padSubjects(subjects, minRows = 10) {
  const rows = (subjects || []).filter((item) => item.totalMarks > 0)
  while (rows.length < minRows) {
    rows.push({ subjectId: `empty-${rows.length}`, empty: true })
  }
  return rows
}

function subjectTotal(subject) {
  if (subject.usesGradeDisplay) return 'Grade'
  return subject.totalMarks
}

function subjectObtained(subject) {
  if (subject.obtainedMarks === -1) return 'A'
  if (subject.usesGradeDisplay) return subject.subjectGrade || '-'
  return subject.obtainedMarks ?? 0
}

function FancyCard({ card, isLast }) {
  const { campusLabel, schoolName, sessionLabel } = getExamPrintMeta()
  const subjects = padSubjects(card.subjects)
  const session = card.sessionLabel || sessionLabel

  return (
    <div className={`exam-fancy-card${isLast ? '' : ' exam-print-break'}`}>
      <div className="exam-fancy-header">
        <div className="exam-fancy-school">{schoolName}</div>
        <div className="exam-fancy-campus">{campusLabel}</div>
        {session ? <div className="exam-fancy-session">Session {session}</div> : null}
        <div className="exam-fancy-script">of {card.examTypeName}</div>
      </div>

      <div className="exam-fancy-body">
        <div className="exam-fancy-left">
          <table className="exam-fancy-id">
            <tbody>
              <tr>
                <td>Serial No :</td>
                <td>{card.studentId}</td>
              </tr>
              <tr>
                <td>Student's Name :</td>
                <td>{card.studentName}</td>
              </tr>
              <tr>
                <td>Father's Name :</td>
                <td>{card.fatherName}</td>
              </tr>
              <tr>
                <td>Class :</td>
                <td>{card.className}</td>
              </tr>
            </tbody>
          </table>

          <table className="exam-fancy-marks exam-print-table">
            <thead>
              <tr>
                <th>SUBJECT</th>
                <th>TOTAL MARKS</th>
                <th>OBTAINED MARKS</th>
              </tr>
            </thead>
            <tbody>
              {subjects.map((subject, index) => (
                <tr key={subject.subjectId || index}>
                  <td>{subject.empty ? '' : subject.subjectName}</td>
                  <td className="exam-fancy-center">{subject.empty ? '' : subjectTotal(subject)}</td>
                  <td className="exam-fancy-center">{subject.empty ? '' : subjectObtained(subject)}</td>
                </tr>
              ))}
              <tr className="exam-fancy-total">
                <th className="exam-fancy-align-right">GRAND TOTAL</th>
                <th className="exam-fancy-center">{card.totalMarks}</th>
                <th className="exam-fancy-center">{card.totalObtained}</th>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="exam-fancy-right">
          <table className="exam-fancy-meta">
            <tbody>
              <tr>
                <td>Percentage :</td>
                <td>{card.percentage}%</td>
                <td />
              </tr>
              <tr>
                <td>Grade :</td>
                <td>{card.grade}</td>
                <td />
              </tr>
              <tr>
                <td>Position :</td>
                <td>{card.positionDisplay}</td>
                <td />
              </tr>
              <tr>
                <td colSpan={3}>Remarks :</td>
              </tr>
              <tr>
                <td colSpan={3} className="exam-fancy-remarks">
                  {card.longRemarks}
                </td>
              </tr>
              <tr>
                <td colSpan={3} className="exam-fancy-note">
                  Note: Errors and omissions are accepted within seven days after result declaration
                </td>
              </tr>
              <tr>
                <td className="exam-fancy-sign">
                  _______________
                  <b>Head Teacher</b>
                </td>
                <td />
                <td className="exam-fancy-sign">
                  _________________
                  <b>Class Teacher</b>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default function ExamPrintFancyCard({ payload }) {
  const cards = payload?.cards || []
  return (
    <div className="exam-fancy-sheet">
      {cards.map((card, index) => (
        <FancyCard key={card.studentId || index} card={card} isLast={index === cards.length - 1} />
      ))}
    </div>
  )
}
