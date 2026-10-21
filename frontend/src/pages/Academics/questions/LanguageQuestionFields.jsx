import { Plus, Trash2 } from 'lucide-react'
import { removeBodyItem, pushBodyItem, setBodyValue } from './languageQuestionStructures'

const fieldClass = 'w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm'

const englishOptionLabels = ['A', 'B', 'C', 'D']
const urduOptionLabels = ['الف', 'ب', 'ج', 'د']

function FieldList({ title, children, onAdd, addLabel }) {
  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-slate-700">{title}</span>
        <button type="button" onClick={onAdd} className="inline-flex items-center gap-1 text-xs font-medium text-[#405189]">
          <Plus size={14} />
          {addLabel}
        </button>
      </div>
      {children}
    </div>
  )
}

function RemoveButton({ onClick, label }) {
  return (
    <button type="button" onClick={onClick} className="shrink-0 rounded p-1 text-rose-600 hover:bg-rose-50" aria-label={label}>
      <Trash2 size={14} />
    </button>
  )
}

export default function LanguageQuestionFields({ kind, body, onChange, disabled, rtl, fieldProps }) {
  const value = body || {}
  const labels = rtl ? urduOptionLabels : englishOptionLabels
  const bind = (path) => ({
    ...(fieldProps ? fieldProps(path, '') : {}),
    disabled,
  })

  const setPath = (path, nextValue) => onChange(setBodyValue(value, path, nextValue))

  if (kind === 'choice-set') {
    const items = value.items || []
    return (
      <FieldList title="Choices" addLabel="Add choice" onAdd={() => onChange(pushBodyItem(value, 'items', kind))}>
        {items.map((item, index) => (
          <div key={index} className="grid gap-2 rounded-lg border border-slate-200 p-2">
            <div className="flex items-start gap-2">
              <textarea
                value={item.text || ''}
                onChange={(event) => setPath(`items.${index}.text`, event.target.value)}
                placeholder="Question"
                className={`${fieldClass} min-h-16`}
                {...bind(`items.${index}.text`)}
              />
              <RemoveButton label="Remove choice" onClick={() => onChange(removeBodyItem(value, 'items', index))} />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {(item.options || ['', '', '', '']).slice(0, 4).map((option, optionIndex) => (
                <label key={optionIndex} className="grid gap-1 text-xs text-slate-600">
                  <span>{labels[optionIndex]}</span>
                  <input
                    value={option}
                    onChange={(event) => setPath(`items.${index}.options.${optionIndex}`, event.target.value)}
                    className={fieldClass}
                    {...bind(`items.${index}.options.${optionIndex}`)}
                  />
                </label>
              ))}
            </div>
          </div>
        ))}
      </FieldList>
    )
  }

  if (kind === 'spelling-table') {
    const rows = value.rows || []
    return (
      <FieldList title="Spellings" addLabel="Add row" onAdd={() => onChange(pushBodyItem(value, 'rows', kind))}>
        {rows.map((row, index) => (
          <div key={index} className="flex items-start gap-2">
            <div className="grid flex-1 gap-2 sm:grid-cols-4">
              {(row.options || ['', '', '', '']).slice(0, 4).map((option, optionIndex) => (
                <input
                  key={optionIndex}
                  value={option}
                  placeholder={labels[optionIndex]}
                  onChange={(event) => setPath(`rows.${index}.options.${optionIndex}`, event.target.value)}
                  className={fieldClass}
                  {...bind(`rows.${index}.options.${optionIndex}`)}
                />
              ))}
            </div>
            <RemoveButton label="Remove row" onClick={() => onChange(removeBodyItem(value, 'rows', index))} />
          </div>
        ))}
      </FieldList>
    )
  }

  if (kind === 'word-list') {
    const words = value.words || []
    return (
      <FieldList title="Words" addLabel="Add word" onAdd={() => onChange(pushBodyItem(value, 'words', kind))}>
        {words.map((word, index) => (
          <div key={index} className="flex items-center gap-2">
            <input
              value={word}
              onChange={(event) => setPath(`words.${index}`, event.target.value)}
              placeholder="Word or phrase"
              className={fieldClass}
              {...bind(`words.${index}`)}
            />
            <RemoveButton label="Remove word" onClick={() => onChange(removeBodyItem(value, 'words', index))} />
          </div>
        ))}
      </FieldList>
    )
  }

  if (kind === 'fill-blanks') {
    const sentences = value.sentences || []
    return (
      <FieldList title="Sentences" addLabel="Add sentence" onAdd={() => onChange(pushBodyItem(value, 'sentences', kind))}>
        {sentences.map((sentence, index) => (
          <div key={index} className="flex items-start gap-2">
            <textarea
              value={sentence}
              onChange={(event) => setPath(`sentences.${index}`, event.target.value)}
              placeholder="Sentence with a blank, written as ____"
              className={`${fieldClass} min-h-16`}
              {...bind(`sentences.${index}`)}
            />
            <RemoveButton label="Remove sentence" onClick={() => onChange(removeBodyItem(value, 'sentences', index))} />
          </div>
        ))}
      </FieldList>
    )
  }

  if (kind === 'classify-line') {
    const lines = value.lines || []
    return (
      <FieldList title="Lines" addLabel="Add line" onAdd={() => onChange(pushBodyItem(value, 'lines', kind))}>
        {lines.map((line, index) => (
          <div key={index} className="grid gap-2 rounded-lg border border-slate-200 p-2">
            <div className="flex items-start gap-2">
              <textarea
                value={line.text || ''}
                onChange={(event) => setPath(`lines.${index}.text`, event.target.value)}
                placeholder="Sentence"
                className={`${fieldClass} min-h-16`}
                {...bind(`lines.${index}.text`)}
              />
              <RemoveButton label="Remove line" onClick={() => onChange(removeBodyItem(value, 'lines', index))} />
            </div>
            <input
              value={line.marked || ''}
              onChange={(event) => setPath(`lines.${index}.marked`, event.target.value)}
              placeholder="Word to mark"
              className={fieldClass}
              {...bind(`lines.${index}.marked`)}
            />
          </div>
        ))}
      </FieldList>
    )
  }

  if (kind === 'sentence-pair') {
    const pairs = value.pairs || []
    return (
      <FieldList title="Pairs" addLabel="Add pair" onAdd={() => onChange(pushBodyItem(value, 'pairs', kind))}>
        {pairs.map((pair, index) => (
          <div key={index} className="grid gap-2 rounded-lg border border-slate-200 p-2 sm:grid-cols-[1fr_1fr_auto]">
            <textarea
              value={pair.left || ''}
              onChange={(event) => setPath(`pairs.${index}.left`, event.target.value)}
              placeholder="First sentence"
              className={`${fieldClass} min-h-16`}
              {...bind(`pairs.${index}.left`)}
            />
            <textarea
              value={pair.right || ''}
              onChange={(event) => setPath(`pairs.${index}.right`, event.target.value)}
              placeholder="Second sentence"
              className={`${fieldClass} min-h-16`}
              {...bind(`pairs.${index}.right`)}
            />
            <RemoveButton label="Remove pair" onClick={() => onChange(removeBodyItem(value, 'pairs', index))} />
          </div>
        ))}
      </FieldList>
    )
  }

  if (kind === 'passage-set' || kind === 'verse-set') {
    const passages = value.passages || []
    const lines = value.lines || []
    const questions = value.questions || []
    return (
      <div className="grid gap-4">
        {kind === 'verse-set' ? (
          <>
            <label className="grid gap-1 text-sm text-slate-700">
              <span className="font-medium">Piece title</span>
              <input
                value={value.heading || ''}
                onChange={(event) => setPath('heading', event.target.value)}
                placeholder="Ghazal or poem"
                className={fieldClass}
                {...bind('heading')}
              />
            </label>
            <FieldList title="Lines" addLabel="Add line" onAdd={() => onChange(pushBodyItem(value, 'lines', kind))}>
              {lines.map((line, index) => (
                <div key={index} className="flex items-start gap-2">
                  <textarea
                    value={line}
                    onChange={(event) => setPath(`lines.${index}`, event.target.value)}
                    placeholder="Verse line"
                    className={`${fieldClass} min-h-16`}
                    {...bind(`lines.${index}`)}
                  />
                  <RemoveButton label="Remove line" onClick={() => onChange(removeBodyItem(value, 'lines', index))} />
                </div>
              ))}
            </FieldList>
          </>
        ) : (
          <FieldList title="Passages" addLabel="Add passage" onAdd={() => onChange(pushBodyItem(value, 'passages', kind))}>
            {passages.map((passage, index) => (
              <div key={index} className="grid gap-2 rounded-lg border border-slate-200 p-2">
                <div className="flex items-center gap-2">
                  <input
                    value={passage.label || ''}
                    onChange={(event) => setPath(`passages.${index}.label`, event.target.value)}
                    placeholder="Label"
                    className={`${fieldClass} max-w-24`}
                    {...bind(`passages.${index}.label`)}
                  />
                  <RemoveButton label="Remove passage" onClick={() => onChange(removeBodyItem(value, 'passages', index))} />
                </div>
                <textarea
                  value={passage.text || ''}
                  onChange={(event) => setPath(`passages.${index}.text`, event.target.value)}
                  placeholder="Passage"
                  className={`${fieldClass} min-h-24`}
                  {...bind(`passages.${index}.text`)}
                />
              </div>
            ))}
          </FieldList>
        )}
        <FieldList title="Questions" addLabel="Add question" onAdd={() => onChange(pushBodyItem(value, 'questions', kind))}>
          {questions.map((question, index) => (
            <div key={index} className="flex items-start gap-2">
              <textarea
                value={question.text || ''}
                onChange={(event) => setPath(`questions.${index}.text`, event.target.value)}
                placeholder="Question"
                className={`${fieldClass} min-h-16`}
                {...bind(`questions.${index}.text`)}
              />
              <RemoveButton label="Remove question" onClick={() => onChange(removeBodyItem(value, 'questions', index))} />
            </div>
          ))}
        </FieldList>
      </div>
    )
  }

  return (
    <label className="grid gap-1 text-sm text-slate-700">
      <span className="font-medium">Extra note</span>
      <textarea
        value={value.note || ''}
        onChange={(event) => setPath('note', event.target.value)}
        placeholder="Optional note for this writing task"
        className={`${fieldClass} min-h-20`}
        {...bind('note')}
      />
    </label>
  )
}
