import ExamPrintAcademicProgress from './ExamPrintAcademicProgress'
import ExamPrintAwardList12Col from './ExamPrintAwardList12Col'
import ExamPrintAwardList2Col from './ExamPrintAwardList2Col'
import ExamPrintAwardListRemarks from './ExamPrintAwardListRemarks'
import ExamPrintAwardListSubjects from './ExamPrintAwardListSubjects'
import ExamPrintFancyCard from './ExamPrintFancyCard'
import ExamPrintTopN from './ExamPrintTopN'

export default function ExamReportPrintView({ layout, payload }) {
  if (!payload) return null

  switch (layout) {
    case 'academic-progress':
      return <ExamPrintAcademicProgress payload={payload} />
    case 'fancy-card':
      return <ExamPrintFancyCard payload={payload} />
    case 'award-2col':
      return <ExamPrintAwardList2Col payload={payload} />
    case 'award-remarks':
      return <ExamPrintAwardListRemarks payload={payload} />
    case 'award-12col':
      return <ExamPrintAwardList12Col payload={payload} />
    case 'award-subjects':
      return <ExamPrintAwardListSubjects payload={payload} />
    case 'top-n':
      return <ExamPrintTopN payload={payload} />
    default:
      return <p className="text-sm text-slate-500">This report has no print layout.</p>
  }
}
