import { isChoiceBodyKind, isLineBodyKind } from './languageQuestionStructures'

const englishOptionLabels = ['A', 'B', 'C', 'D']
const urduOptionLabels = ['الف', 'ب', 'ج', 'د']

/** Short MCQ options (exam layout) fit on one line like the board paper. */
function examOptionsPreferSingleRow(options) {
  const values = (options || []).slice(0, 4).map((option) => `${option ?? ''}`.trim())
  if (values.some((text) => !text)) return false
  const lengths = values.map((text) => text.length)
  const maxLen = Math.max(...lengths)
  const totalLen = lengths.reduce((sum, len) => sum + len, 0)
  return maxLen <= 16 && totalLen <= 48
}

function examOptionPrefix(optionIndex, rtl) {
  if (rtl) return `${urduOptionLabels[optionIndex] || optionIndex + 1})`
  return `${String.fromCharCode(97 + optionIndex)})`
}

function Lines({ items, rtl, textStyle, variant, startNumber = 1, listStyle = 'decimal' }) {
  const rows = (items || []).filter((item) => `${item ?? ''}`.trim())
  if (!rows.length) return variant === 'exam' ? null : <p className="text-sm text-slate-500">Nothing saved.</p>
  const examClass = variant === 'exam' ? 'exam-paper-language-lines' : 'grid gap-1 text-sm text-slate-800'
  const Tag = variant === 'exam' ? 'ol' : 'ol'
  return (
    <Tag
      className={`${examClass} ${rtl ? 'pr-5 text-right' : 'pl-5'}`}
      style={{ ...textStyle, listStyleType: variant === 'exam' ? listStyle : undefined }}
      start={variant === 'exam' ? startNumber : undefined}
    >
      {rows.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </Tag>
  )
}

export default function LanguageQuestionPreview({
  kind,
  body,
  rtl,
  textStyle,
  variant = 'catalog',
  startNumber = 1,
}) {
  const value = body || {}
  const labels = rtl ? urduOptionLabels : englishOptionLabels
  const align = rtl ? 'text-right' : 'text-left'
  const isExam = variant === 'exam'

  if (isChoiceBodyKind(kind)) {
    const items = (value.items || []).filter((item) => `${item?.text ?? ''}`.trim())
    let number = startNumber
    return (
      <div className={isExam ? 'exam-paper-language-choice-list' : 'grid gap-3'}>
        {items.map((item, index) => {
          const questionNo = number
          number += 1
          const optionRowClass = isExam
            ? `exam-paper-language-choice-options${
                examOptionsPreferSingleRow(item.options) ? ' exam-paper-language-choice-options--single-row' : ''
              }`
            : 'mt-2 grid gap-1 sm:grid-cols-2'
          return (
          <div key={index} className={isExam ? 'exam-paper-language-choice-item' : 'rounded-lg border border-slate-200 p-3'}>
            <p className={`${isExam ? 'exam-paper-language-choice-stem' : 'text-sm font-medium text-slate-800'} ${align}`} style={textStyle}>
              {questionNo}. {item.text}
            </p>
            <div className={optionRowClass}>
              {(item.options || []).map((option, optionIndex) => (
                <p key={optionIndex} className={`${isExam ? 'exam-paper-language-choice-option' : 'text-sm text-slate-700'} ${align}`} style={textStyle}>
                  {isExam ? (
                    <>
                      {examOptionPrefix(optionIndex, rtl)} {option}
                    </>
                  ) : (
                    <>
                      <span className="font-semibold">{labels[optionIndex] || String.fromCharCode(97 + optionIndex)}</span>. {option}
                    </>
                  )}
                </p>
              ))}
            </div>
          </div>
          )
        })}
      </div>
    )
  }

  if (isLineBodyKind(kind)) {
    return <Lines items={value.lines} rtl={rtl} textStyle={textStyle} variant={variant} startNumber={startNumber} />
  }

  if (kind === 'spelling-table') {
    const rows = value.rows || []
    return (
      <table className={`w-full border-collapse ${isExam ? 'exam-paper-language-spelling-table text-sm' : 'text-sm'}`}>
        <thead>
          <tr className={isExam ? 'exam-paper-language-spelling-head' : 'bg-slate-50 text-left text-xs uppercase text-slate-500'}>
            {isExam ? <th className="exam-paper-language-spelling-th">#</th> : null}
            {labels.map((label) => (
              <th key={label} className={isExam ? 'exam-paper-language-spelling-th' : 'border border-black px-2 py-1.5'}>
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              {isExam ? (
                <td className="exam-paper-language-spelling-td exam-paper-language-spelling-index tabular-nums">
                  {startNumber + index}
                </td>
              ) : null}
              {(row.options || ['', '', '', '']).slice(0, 4).map((option, optionIndex) => (
                <td key={optionIndex} className={isExam ? 'exam-paper-language-spelling-td' : 'border border-black px-2 py-1.5 text-slate-800'}>
                  {option}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    )
  }

  if (kind === 'word-list') {
    return <Lines items={value.words} rtl={rtl} textStyle={textStyle} variant={variant} startNumber={startNumber} listStyle={rtl ? 'urdu' : 'lower-roman'} />
  }
  if (kind === 'fill-blanks') {
    return <Lines items={value.sentences} rtl={rtl} textStyle={textStyle} variant={variant} startNumber={startNumber} />
  }

  if (kind === 'classify-line') {
    return (
      <div className="grid gap-2">
        {(value.lines || []).map((line, index) => (
          <p key={index} className={`${isExam ? 'exam-paper-language-line' : 'text-sm text-slate-800'} ${align}`} style={textStyle}>
            {line.text}
            {!isExam && line.marked ? <span className="mt-0.5 block text-xs text-slate-500">Marked: {line.marked}</span> : null}
          </p>
        ))}
      </div>
    )
  }

  if (kind === 'sentence-pair') {
    return (
      <div className="grid gap-2">
        {(value.pairs || []).map((pair, index) => (
          <div key={index} className="grid gap-1 rounded-lg border border-slate-200 p-3 sm:grid-cols-2">
            <p className="text-sm text-slate-800">{pair.left}</p>
            <p className="text-sm text-slate-800">{pair.right}</p>
          </div>
        ))}
      </div>
    )
  }

  if (kind === 'passage-set' || kind === 'verse-set') {
    return (
      <div className="grid gap-4">
        {kind === 'verse-set' && value.heading ? (
          <p className={`text-sm font-semibold text-slate-800 ${align}`} style={textStyle}>{value.heading}</p>
        ) : null}
        {kind === 'verse-set' ? (
          <Lines items={value.lines} rtl={rtl} textStyle={textStyle} variant={variant} startNumber={startNumber} />
        ) : null}
        {kind === 'passage-set'
          ? (value.passages || []).map((passage, index) => (
            <div key={index}>
              {passage.label ? <p className="text-xs font-semibold uppercase text-slate-500">{passage.label}</p> : null}
              <p className={`mt-1 whitespace-pre-wrap text-sm text-slate-800 ${align}`} style={textStyle}>{passage.text}</p>
            </div>
          ))
          : null}
        {(value.questions || []).some((question) => `${question?.text || ''}`.trim()) ? (
          <div>
            <p className="mb-1 text-xs font-semibold uppercase text-slate-500">Questions</p>
            <Lines
              items={(value.questions || []).map((question) => question?.text)}
              rtl={rtl}
              textStyle={textStyle}
              variant={variant}
              startNumber={startNumber}
              listStyle={rtl ? 'urdu' : 'lower-roman'}
            />
          </div>
        ) : null}
      </div>
    )
  }

  return value.note ? (
    <p className={`whitespace-pre-wrap text-sm text-slate-800 ${align}`} style={textStyle}>{value.note}</p>
  ) : (
    <p className="text-sm text-slate-500">No extra note.</p>
  )
}
