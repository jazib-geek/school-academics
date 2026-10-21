import LanguageQuestionPreview from '../questions/LanguageQuestionPreview.jsx'
import { parseBody, resolveLanguageBlockMarks } from '../questions/languageQuestionStructures.js'
import { formatLanguagePartLabel, urduPaperTextStyle } from './examLanguagePaperUtils.js'

export default function LanguageExamPaperBlock({
  kind,
  bodyJson,
  descriptionText,
  marks,
  partIndex = 0,
  startNumber = 1,
  rtl = false,
  wrapMarksInParentheses = true,
}) {
  const body = parseBody(bodyJson)
  const textStyle = urduPaperTextStyle(descriptionText, bodyJson)
  const displayMarks = resolveLanguageBlockMarks(kind, bodyJson, marks)

  return (
    <div className="exam-paper-language-block">
      <div className="exam-paper-language-block-heading" style={textStyle}>
        <span className="exam-paper-language-part">({formatLanguagePartLabel(partIndex)})</span>
        <span className="exam-paper-language-block-title">{descriptionText}</span>
        <span className="exam-paper-language-block-marks tabular-nums">
          {wrapMarksInParentheses ? `(${displayMarks})` : displayMarks}
        </span>
      </div>
      <div className="exam-paper-language-block-body" style={textStyle}>
        <LanguageQuestionPreview
          kind={kind}
          body={body}
          rtl={rtl}
          textStyle={textStyle}
          variant="exam"
          startNumber={startNumber}
        />
      </div>
    </div>
  )
}
