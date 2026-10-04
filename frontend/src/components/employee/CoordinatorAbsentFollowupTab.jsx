import AbsentFollowupReadOnlyList from './AbsentFollowupReadOnlyList'

/** Loads absent follow-up for the workspace date; UI shown only when `active`. */
export default function CoordinatorAbsentFollowupTab({ date, formatDateLabel, active, onCountChange }) {
  return (
    <AbsentFollowupReadOnlyList
      date={date}
      formatDateLabel={formatDateLabel}
      visible={active}
      onCountChange={onCountChange}
      showIntro
    />
  )
}
