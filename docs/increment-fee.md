# Increment Fee

Campus menu: **Fee → Increment Fee** (`/campus/students/increment-fee`). Requires the existing `update_fee` permission or campus super admin access. Academics, family and employee tokens cannot use the new endpoints.

The screen accepts a fixed, nonnegative whole-number **New Total Fee** and a nonnegative whole-number **Tuition Fee increment**. The total is overwritten for every selected student, while tuition increases from each student's own existing amount. Existing decimal tuition values retain their precision.

- `Student.Fee = newTotalFee` (fixed replacement, not an increment).
- `Student.TutionFee = previous TutionFee + tuitionIncrement`.
- `Student.FeeConcession = new Fee - new TutionFee`.

Class mode follows the existing class/section composite selector. All active students start checked; unchecked students are excluded. Entire-school mode includes all students with `IsActive == true` in the authenticated campus database, including students without a class. It does not span campus databases.

## Review and commit

The optional registration-date filter applies when loading students in both class and entire-school modes:

- **All** ignores the date and includes students with missing registration dates.
- **Before** includes `RegDate` calendar dates strictly before the selected date.
- **After** includes `RegDate` calendar dates strictly after the selected date.

Before/After require a date and exclude missing registration dates. The unchecked-by-default **Include selected date** checkbox includes the entire selected calendar day when checked, including timestamps later that day. All ignores this checkbox. Changing filters reloads the grid, resets class checkboxes to checked and clears any preview. Entire-school mode lists all matching active students without individual checkboxes. Preview and commit enforce the same date filter server-side; fee calculations and confirmation remain unchanged.

1. Select scope, enter the fixed New Total Fee and a nonnegative whole-number tuition increment.
2. Click **Preview Changes**. The server returns every selected student's before/after amounts and validation errors. This does not save fees.
3. Review the list and totals, then click **Apply Increment**.
4. The Tailwind popup summarizes campus, scope, count, fixed replacement total and tuition increment, with the permanent-overwrite warning. Only **Confirm and Apply** submits the batch.

Changing input or selection clears the preview. Missing total/tuition, negative existing fees, integer overflow, or a resulting tuition above total blocks the batch. Existing missing concession is shown as missing and replaced with the calculated difference upon successful application.

The backend rechecks active status, class membership, student details and all fee values inside a serializable transaction. Any mismatch rejects the batch and requires another preview. Student updates and per-student activity logs commit together. Existing ledger entries, receipts and class fee settings are unchanged.

Preview tokens are random, scoped to campus/user, and cached in the API process for 15 minutes. Concurrent duplicate submissions share a lock; successful retries return the original count. A failed/uncertain attempt consumes the token and requires reloading fees before a new preview. An API restart or cache eviction invalidates previews safely. Deployments with multiple API instances require session affinity for the preview/apply flow; without it, another instance rejects the token rather than applying unreviewed changes.

No schema migration is required.

## Manual checks

- Check All, Before and After in both scopes. Test Include selected date checked and unchecked in Before and After modes, including records late on the selected day. Missing registration dates must appear only under All.
- Change the filter after preview: the preview must clear and only matching students should reload. Change a selected student's registration date to outside the filter before confirmation: the batch must be rejected.

Students with a logged fee update within the preceding seven days show an amber pill below their name in both selection and proofreading lists. The latest `StudentFeeUpdate` log is used: this screen's logs say **Fee incremented today / X days ago**; other fee-update logs say **Fee updated today / X days ago**. The tooltip shows the logged Pakistan timestamp. The seven-day window uses Pakistan time, and the day label uses calendar-day difference. The pill is advisory; students remain checked and can still be included intentionally. No schema changes are needed.

- Verify today's increment shows “Fee incremented today”; yesterday's shows “Fee incremented 1 day ago”; older-than-seven-day logs show no pill.
- Verify multiple recent updates show only the latest, ordinary fee updates use “updated”, and the pill remains visible in preview.

- Existing total 5,000 / tuition 4,000, fixed new total 6,000 and tuition increment 300 → total 6,000 / tuition 4,300 / concession 1,700.
- Another selected student with tuition 4,500 receives the same total 6,000, tuition 4,800 and concession 1,200. The replacement total can be lower than the old total, provided it is at least the new tuition.
- Missing, negative or fractional replacement totals and negative or fractional tuition increments must be rejected by UI and API. Reject any student's resulting tuition above the replacement total; never clamp a negative concession to zero.
- Class mode: uncheck one student; verify only checked active students change.
- Entire school: verify every active student in this campus is included, including beyond a normal student-list page; inactive/null-active students and other campuses stay unchanged.
- Cancel the popup or leave after preview; fees should stay unchanged.
- Change a student's fee, class or active status after preview; confirm should reject the stale batch.
- Double-click confirmation or retry the same successful token; fees should increment only once.
- Verify invalid amounts and missing legacy fee values block saving and remain visible in preview.
- Verify activity logs show all three old/new amounts and no new ledger charges exist.
- Verify users without `update_fee`, Academics, employee and family sessions cannot call the new endpoints.

Implementation verification is build/static-only. No application startup, database queries, migrations or runtime database tests were executed during development.

A tuition increment of **0** performs cleanup: Total Fee is replaced and Concession recalculated, while the database Tuition Fee field is not modified. For example, tuition 4,000 and new total 6,000 result in tuition 4,000 and concession 2,000. Cleanup logs use source fee-cleanup and display a Fee updated pill. Verify toggling date inclusion clears the preview and reloads matching students.
