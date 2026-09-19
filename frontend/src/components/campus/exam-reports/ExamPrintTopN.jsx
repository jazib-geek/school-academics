import { formatPrintDate, getExamPrintMeta } from './examPrintShared'

export default function ExamPrintTopN({ payload }) {
  const { campusLabel, schoolName, campusPhone } = getExamPrintMeta()
  const classes = payload?.classes || []

  return (
    <div className="exam-topn-sheet">
      <div className="exam-topn-header">
        <div>
          <div className="exam-topn-school">{schoolName}</div>
          <div>
            {campusLabel}, Tel: {campusPhone}
          </div>
        </div>
        <div className="exam-topn-right">
          <h2>TOP {payload?.n} POSITIONS</h2>
          <div>{payload?.examTypeName}</div>
          <div>
            <b>Date:</b> {formatPrintDate(payload?.generatedAt)}
          </div>
        </div>
      </div>

      <table className="exam-topn-table exam-print-table">
        <thead>
          <tr>
            <th>Branch</th>
            <th>Class Code</th>
            <th>Class Name</th>
            <th>Serial</th>
            <th>Student Name/Father Name</th>
            <th>Position</th>
            <th>Obtained Total Percentage</th>
          </tr>
        </thead>
        <tbody>
          {classes.map((group) =>
            (group.students || []).map((student, index) => (
              <tr key={`${group.sectionId}-${student.studentId}`}>
                {index === 0 ? (
                  <>
                    <td rowSpan={group.students.length}>{group.branch || campusLabel}</td>
                    <td rowSpan={group.students.length}>{group.classCode ?? ''}</td>
                    <td rowSpan={group.students.length}>{group.className}</td>
                  </>
                ) : null}
                <td className="exam-topn-center">{student.studentId}</td>
                <td>
                  <div className="exam-topn-name">{student.studentName}</div>
                  <div className="exam-topn-father">{student.fatherName}</div>
                </td>
                <td className="exam-topn-center">{student.positionDisplay}</td>
                <td className="exam-topn-marks">
                  <span className="exam-topn-fraction">
                    <span>{student.totalObtained}</span>
                    <span>{student.totalMarks}</span>
                  </span>
                  <span>{student.percentage}%</span>
                </td>
              </tr>
            )),
          )}
        </tbody>
      </table>
    </div>
  )
}
