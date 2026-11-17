# Coordinator proforma: campus database schema proposal

Status: entity classes, EF configuration and migration implemented on 2026-10-02. Migration `20261002174540_AddCoordinatorProforma` was applied through School.Migrator to the local campus database only (`DESKTOP-2FS5TD4\SQLEXPRESS`, `dbSBS_Main`). No live or academic database was migrated. API/UI integration and workflow enforcement remain future work.

Implementation includes 34 new proforma tables and 52 indexes, with no alterations or deletions of existing tables. Report uniqueness is coordinator/date; wing is not persisted. Detail tables enforce their section type, and composite foreign keys prevent linking actions/comments to entries/revisions from another report. Content codes are C# enums stored as constrained strings. No employee campus-access grants are added yet; that authorization design remains separate.

Validation: School.Migrator builds; EF reports no pending model changes; `backend/scripts/Test-CoordinatorProformaSchema.ps1` verifies the local database constraints inside a rolled-back transaction. Existing unrelated nullable-navigation warnings remain in SubjectMaster and ExamType. Submitted snapshot immutability, permissions, section declaration/entry consistency and workflow transitions must be enforced when the write APIs are implemented; table creation alone does not implement those policies.

## Scope and design

Store each campus's reports in that campus's existing SQL Server database. The standalone head dashboard reads an authorized campus at a time; it does not need a second copy of the reports.

Use a report header, ordered entries, typed section details, and separate workflow records. Use relational columns for operational data and foreign keys for campus people/classes/subjects. Reserve versioned JSON for immutable submission snapshots, not the primary editable report or an unrestricted form-field store.

Use the new `tblCoordinatorProforma...` table family. The four legacy tables below do not constrain this design and are outside this plan's migration/data-import scope:

- `tblCoordinatorDailyReport`
- `tblCoordinatorDailyAbsentTeacher`
- `tblCoordinatorModDuty`
- `tblCoordinatorWorkingReportLine`

Their removal remains a separate manual operation. Before production cutover, retire their existing EF mappings, services and routes and reconcile migration history; deleting the tables alone would leave existing application dependencies broken.

## 1. Report and section structure

Names in this document are proposed physical table names. `...` in mapping tables means the prefix `tblCoordinatorProforma`.

### tblCoordinatorProformaReport

One daily report for one coordinator on a given date.

| Column | Proposed type / meaning |
| --- | --- |
| Id | `int identity`, primary key, consistent with existing campus keys |
| CoordinatorEmployeeId | Required FK to existing employee |
| ReportDate | `date`, school-local date |
| Theme | Nullable `nvarchar(500)` |
| SosWeek | Nullable `smallint`, positive when supplied |
| WorkflowStatus | `Draft`, `Submitted`, or `Returned`; approval is separate |
| CurrentRevisionNumber | Integer incremented on submission; initially zero |
| TemplateVersion | Version of the field definitions and paper wording |
| CreatedAtUtc / UpdatedAtUtc | `datetime2(3)` |
| CreatedByActorId / UpdatedByActorId | FK to actor identity described below |
| RowVersion | SQL Server `rowversion` for optimistic concurrency |

Unique `(CoordinatorEmployeeId, ReportDate)`. Each coordinator has at most one report per day within the campus database; corrections create revisions of that report, not another daily report. Different coordinators may each report on the same date. The API obtains coordinator identity from the session, not a freely supplied employee ID.

Wing is informational only and is excluded from the proforma database model, including keys, stored snapshots, filtering scope and permissions. Later, prefetch it from the coordinator's employee data and show it in a disabled textbox. No wing column, wing lookup/assignment table or employee-schema change is proposed here. Changing an employee's wing must not create or select a different report.

Campus database selection determines tenancy; a client-supplied CampusId on this row is not an authorization mechanism. The API identifies records across campuses using `(CampusKey, ReportId)`.

### tblCoordinatorProformaSection

`Id`, `ReportId`, `SectionCode`, nullable `DeclarationCode`, optional `DeclarationNote`.

Unique `(ReportId, SectionCode)`. `DeclarationCode` is `NoneToReport` or `NotApplicable`; null means no explicit declaration. Recorded status/count is derived from child entries. Reject contradictory states containing both a declaration and active entries. Do not turn an empty section into “None.”

### tblCoordinatorProformaEntry

`Id`, `ReportId`, `SectionCode`, `SortOrder`, optional `ClassSectionId`, optional `SubjectId`, `CreatedAtUtc`, `UpdatedAtUtc`, actor IDs, `RowVersion`, nullable `DeletedAtUtc`. The implemented composite FK `(ReportId, SectionCode)` references the report's section and retains report ownership for additional cross-report integrity constraints.

Each repeated line or observation has a stable entry ID. A typed detail table uses `EntryId` as its PK and `(EntryId, SectionCode)` as its FK, with a fixed-section check constraint; checklist-only entries use criterion responses. The database therefore prevents attaching a notebook detail to an observation entry. The API must additionally enforce that an entry has its required detail record. Do not implement an unrestricted arbitrary field/value API.

Draft edits update entries in place. Never replace every child row on save: evidence and follow-up actions reference stable IDs. Submitted records are immutable until explicitly returned/reopened, and referenced entries are retained if subsequently removed from the working draft.

### Existing campus references

- Class/section: `tblSection.ID`, matching `Student.ClassCompositeID`. Do not confuse this with `tblClass.Class_ID` or the section-colour ID.
- Subject: existing `tblSubjectMaster.ID`; validate compatibility with the selected class where applicable.
- Student: existing student key `Student.Reg_Id`.
- Teacher, coordinator, faculty member and MOD: existing employee key.
- Masters remain the source of selection lists. Store historic display labels in submission snapshots so a student's later class change or teacher rename does not rewrite a printed report.

### tblCoordinatorProformaEntryStudent / EntryEmployee

Student links: `EntryId`, `StudentId`, `SortOrder`. Employee links: `EntryId`, `EmployeeId`, `RoleCode`, `SortOrder`.

Use real multiple selections for Kaizen students, retest students, teacher groups and Morning MODs. Roles distinguish subject teacher, class teacher, staff counselled, follow-up teacher and morning MOD. Enforce one student/teacher where the section expects one, while permitting groups where the paper does. Do not save comma-separated IDs or use names as keys.

## 2. Exact paper-to-data mapping

All content fields below are nullable. Keys, ownership and structural integrity still apply. UI mandatory-field policy remains unset.

| Paper / UI section | Proposed storage | Content |
| --- | --- | --- |
| Date, Monthly/Weekly Theme, SOS Week | Report | Date, theme, SOS week; weekday is derived from date |
| Wing | Display only; no proforma storage | Later populated from employee data in a disabled textbox |
| Students' Strength / Faculty | AttendanceSnapshot + AbsentFaculty | Active, present, absent, unmarked student counts; total faculty; absent faculty and names at submission |
| Morning Meeting | ...Meeting, one detail per entry | Meeting point/instructions text; multiple entries preserve order |
| Due Dispatch | ...Dispatch | DispatchTypeCode and details |
| Z-Lesson / Special Period / Competition / Event / PTM | ...Activity | ActivityTypeCode and activity/preparation details |
| Fix / Optional ticks | ...SummaryTick | ReportId, ItemCode, nullable IsTicked; unique report/item; six independent ticks |
| Priority Response / Parents' Concerns | ...PriorityResponse | Concern and response |
| Critical Diary Note | ...CriticalDiary | Issue, concern, response; class/subject and teacher links |
| Complaint / Call / Visit / Inquiry | ...ParentContact | ContactTypeCode, DirectionCode, complaint/inquiry, remedy/response; class/student links |
| Trust but verify | Entry + CheckResponse | Four named routine criteria, each with response and non-compliance remarks |
| Friday Matters | Entry + CheckResponse | Five named Friday criteria, each with response and remarks |
| Test Confirmation | ...TestConfirmation | TestTypeCode (SOS/Retest/MKR-T), test copies, absent count, test date, period text; class/subject and student links |
| Oxygen Period | ...OxygenPeriod + CheckResponse | Period text, instructional comments; class/subject; four material/board checks |
| 1. Students' Kaizen | ...StudentKaizen | CategoryCode and remedial grooming/counselling text; class and multiple students |
| 2. Students' Diary Checking | ...DiaryCheck | IssueCode and issue details; class and class-teacher link |
| Monday-Friday notebook schedule | ...NotebookSchedule | ReportId, weekday number, planned classes/subjects text; unique report/weekday |
| 3. Note Book Re-Checking + Copies Rechecking Report | ...NotebookCheck | Details listed below; class/subject, student and teacher links |
| 4. Class Observation | ...ClassObservation + CheckResponse | Details listed below; class/subject and teacher link |
| 5. Follow-up with Teachers | ...TeacherFollowup | AreaCode, points of concern, acknowledged measures; class/subject and teacher links |
| 6. Counselling or Warning with Faculty/Staff | ...FacultyCounselling | TypeCode (Counselling/Warning), concern, advice/agreed action; employee links |
| Closing | ...Closing | Details listed below; multiple Morning MOD employee links |
| Additional daily checks | ...DailyCheck + CheckResponse | Moral lesson topic, assembly response, arrival time, MOD duty code/other label, duty employee; uniform, cleanliness and teachers-in-classes responses |

Each `...Detail` table above has `EntryId` as its PK/FK plus its typed content columns. This is more tables than a single JSON document, but it keeps notebook, observation, test and concern reporting straightforward and validates real relationships. Table boundaries do not add any steps to the UI.

Closing is limited to one active entry per report. Other currently repeatable UI sections remain repeatable. Summary ticks are independent of the number of entries and do not enforce completion. “Fix” is retained as paper wording, not a new mandatory rule.

The school statement, section headings, supporting-schedule wording and other fixed paper instructions belong to the versioned template, not repeated editable database fields. Accordion state, open drawers and active tabs are UI state and are not proforma content.

Store the Monday-Friday schedule against the daily report for now, exactly as the current UI does. A future reusable weekly plan may be copied into it; editing another day's plan must not rewrite an old submission. Do not invent a weekly allocation workflow yet.

### NotebookCheck detail

- `TitlePresent`, `PageNumberingPresent`, `NeatnessSatisfactory`: nullable `bit`; null is unanswered, true is tick, false is cross.
- `WritingQualityCode`: nullable BelowAverage / Average / Good. One exclusive choice, not three independent booleans.
- `Mistakes`: Unicode text.
- `CorrectionTimeText`: preserves paper entries such as “2 days.” Optional `CorrectionDueDate` supports an explicitly chosen deadline; do not guess one from free text.
- `CorrectionStatusCode`: nullable NotNeeded / NotCorrected / PartiallyCorrected / Completed.
- `TeacherInformedCode`: nullable NotYet / InformedByCoordinator.

The same notebook entry produces both the short Page 4 line and the detailed copies-report row. Do not save two independent copies of that inspection. The report date supplies the row date, and the month is derived for printing.

Teacher informed is not a teacher signature or actual teacher acknowledgement. Leave the signature blank unless authentic signed evidence is separately supplied. If employee acknowledgement is implemented later, record the acting teacher and timestamp in a separate event; do not infer it from a coordinator's checkbox.

The paper's general “timely checked / well checked / remarks compliant / complete” instruction is currently represented by notebook mistakes/notes, not dedicated controls in the final form. If separate analytics on those criteria are desired, add explicit UI responses and named criterion codes before implementation; never infer answers from the prose or old `check3` fixture values.

### ClassObservation detail

- `PeriodText`, `ObservationTypeCode` (Formal / Informal).
- `ObservationRemarks`, `GuidanceText`.
- Named check responses: ReferenceMaterial, SosRelevance, StudentEngagement, Demonstration, Discipline, BoardAvUse, QuestionsAnswers, HomeworkAsScheduled.

Two paper observation boxes represent two records, not a hard database limit. Additional observations print on continuation pages.

### Closing detail

- `PendingSubmissionState`, `PendingSubmissionText`.
- `SvhwResultsSentCode`: Yes / No / NotApplicable / null.
- `CriticalMatterState`, `CriticalMatterText`.
- `PeopleRemainingState`, `PeopleRemainingText`.
- `PlanReportCode`: Plan / Report / null.
- `DepartureTime`: nullable `time(0)`.
- `ClosingRemarks`; Morning MODs use employee links.

For the three narrative states use null / None / Details, with consistent text validation. This preserves blank versus explicit “None” or “No one” without guessing from text content.

## 3. Check responses

`tblCoordinatorProformaCheckResponse`: `EntryId`, `SectionCode`, `CriterionCode`, nullable `ResponseCode`, nullable `Remarks`; primary key `(EntryId, CriterionCode)`. A composite FK and criterion/response scope checks enforce section-appropriate answers.

Use stable names such as `Routine.MoralLessonDelivered` and `Observation.StudentEngagement`, never positional `check0`/`routine0` database keys. Version the allowed criteria and response sets with the template in application code; this is not a dynamic form-builder feature.

| Group | Allowed responses, plus unanswered null |
| --- | --- |
| Routine checks | Done / NotDone / NotVerified / NotApplicable |
| Friday checks | Checked / NeedsAttention / NotChecked / NotApplicable |
| Observation, Oxygen, additional quality checks | Satisfactory / NeedsAttention / NotChecked / NotApplicable |

Assembly uses its own Yes / No / NotObserved values. Notebook tick/cross fields use nullable booleans as described above. Preserve remarks even when a response is unanswered. Do not default an unanswered check to failure.

## 4. Attendance context

`tblCoordinatorProformaAttendanceSnapshot`: one row per report, nullable student/faculty counts, `ScopeCode`, `CapturedAtUtc`, `SourceCode` and optional source/override notes.

`tblCoordinatorProformaAbsentFaculty`: `ReportId`, `EmployeeId`, optional note; unique report/employee. Referenced display names are frozen in revisions.

The prototype shows campus-wide sample figures. Initial recommendation: real campus-wide figures clearly labelled as such, captured at submission. The informational wing display does not determine attendance coverage; no wing/class mapping is part of this schema.

Counts remain null when unavailable. Strength means active students. An unmarked attendance record is not confirmed absence; a missing teacher biometric check-in is not automatically a confirmed absent-faculty entry. Test absence is independently recorded and must not be copied from whole-school attendance.

Snapshot calculations should use the attendance service's agreed present/late rules and the same student population. Historic active strength cannot necessarily be reconstructed from today's active flag: historical backfills without a reliable source must remain unavailable or be explicitly entered with provenance.

## 5. Submission, review and historical printing

### tblCoordinatorProformaRevision

`Id`, `ReportId`, `RevisionNumber`, `SubmittedAtUtc`, `SubmittedByActorId`, `TemplateVersion`, `SnapshotSchemaVersion`, `PrintTemplateVersion`, `SnapshotJson`.

Unique `(ReportId, RevisionNumber)`, with valid-JSON constraint. Immutable snapshot includes the persisted ordered proforma content, attendance context, all explicit declarations, master display names, campus/coordinator labels, selected people, attachment references and action state at submission. Wing is excluded because it is employee-derived display information, not report data. Store structured data rather than generated HTML. Unicode content must round-trip, including Urdu.

Submission validates optional supplied values and structure, captures the snapshot and advances report status in one transaction. No requirement to fill all sections. Review requests target an explicit revision and reject stale revisions.

### tblCoordinatorProformaReviewEvent

`Id`, `RevisionId`, `EventCode`, `ActorId`, `Note`, `CreatedAtUtc`.

Append-only events: Acknowledged, Approved, Returned. Acknowledgement and approval are separate decisions; approving does not acknowledge automatically or close actions. A return carries a reason and invalidates current approval while preserving its history.

Proposed rule: returning permits draft corrections; resubmission creates a new revision that needs fresh review. Previous decisions remain attached to the previous revision. Any future reopening of an approved report must be explicit and audited, not an ordinary edit.

### tblCoordinatorProformaComment

`Id`, `ReportId`, optional `RevisionId`, `ActorId`, `Text`, `CreatedAtUtc`. Head notes remain distinct from paper concern/response text. Submitted content is not overwritten by comments.

### tblCoordinatorProformaAuditEvent

`Id`, `ReportId`, optional `EntryId`, `ActorId`, `EventCode`, `CreatedAtUtc`, versioned change details. Records material edits/deletions and workflow transitions. Existing general activity logs may also receive a summary, but they do not replace revision/review history.

Printing submitted report content uses its selected revision snapshot. Later master renames, attendance edits and action updates do not silently alter that stored content. The informational wing textbox/print label will be supplied separately from employee data once that integration is implemented; it is not frozen in a report revision. A current action-progress appendix may be printed separately with its own as-of time. Retain the template renderer for each supported print version; exact future pixel reproduction would additionally require archiving the generated PDF, which is not proposed for the first implementation.

## 6. Follow-up actions and files

### tblCoordinatorProformaAction

`Id`, `ReportId`, `SourceEntryId`, optional `SourceRevisionId`, `Title`, nullable `OwnerEmployeeId`, nullable `DueDate`, `StatusCode`, creation/update actors and UTC timestamps, `RowVersion`.

Statuses: Open / InProgress / ReadyForVerification / Closed. Overdue is computed from date and status, not another stored status. A source entry and revision must belong to the same report. Use composite foreign keys where needed to prevent cross-report links.

### tblCoordinatorProformaActionEvent

`Id`, `ActionId`, `ActorId`, `EventCode`, `FromStatus`, `ToStatus`, `Note`, `CreatedAtUtc`.

Records updates, assignments, due-date changes, submission for verification, head verification/closure and reopening. Actions can continue after report approval without editing the proforma revision. Notebook inspection correction status is the coordinator's recorded finding; a head's action verification is a separate event, not an interchangeable field.

### tblCoordinatorProformaAttachment

`Id`, `EntryId`, `StorageProvider`, `ObjectKey`, `OriginalFileName`, `ContentType`, `SizeBytes`, `UploadedByActorId`, `UploadedAtUtc`, `UploadStatus`, optional `DeletedAtUtc`.

Use the existing object-storage integration; store the object key and metadata, not base64 files or expiring public URLs. Authorize file access using campus/report permissions. Revisions retain attachment IDs and metadata; referenced objects cannot be overwritten or deleted when a later draft removes its attachment.

Upload finalization should distinguish pending, completed and failed uploads. Submission includes completed attachments only. Storage/API operations need compensation for abandoned uploads because object storage and SQL are not one transaction. Action-update evidence can use a dedicated `ActionEventAttachment` link if included in the implementation scope; the current prototype only requires entry evidence.

## 7. Head identity and campus permissions

### tblCoordinatorProformaActor

A local audit identity record: `Id`, `HomeCampusKey`, `PrincipalType` (Employee / CampusUser), `PrincipalId`, `DisplayNameSnapshot`. Unique `(HomeCampusKey, PrincipalType, PrincipalId)`.

The server resolves actors from authenticated identities; clients cannot choose the audit actor. For historical attribution, events also store `ActorDisplayNameSnapshot` captured at the time. A remote head's employee ID is not a FK to an employee in the target campus: numeric IDs can overlap across databases. Super-admin campus-user IDs and employee IDs are also separate namespaces.

Actor records are attribution, not permission grants. Keep permissions in a separate authoritative source. Proposed first implementation, if no central access registry exists: an employee-to-permitted-campus grant table in the employee's home campus database, checked by a trusted server service before selecting the target campus. Its logical columns are EmployeeId, TargetCampusKey, IsActive and grant audit fields, with a unique employee/campus key. The super-admin scope must be an explicit server policy, not assumed from a target-campus ID match.

The existing CampusMiddleware prioritizes the token's Campus claim over the X-Campus header. The head route therefore needs a deliberate authorized target-campus resolution path while retaining the login/home campus identity. Do not simply allow every employee to override tenancy with a header. Revalidate head designation and campus grants; route visibility alone is insufficient.

No new login UI is required. Existing employee login can redirect authorized Heads; super-admin access uses its existing identity. Grant storage and super-admin scope remain an implementation decision rather than an assumption that a central identity database already exists.

## 8. Constraints and indexes

- SQL keys follow existing `int` campus identities; business dates use `date`, clock times `time(0)`, event times UTC `datetime2(3)`, user-entered text `nvarchar`.
- Nullable content fields; nonnegative counts, valid codes and date/time formats whenever values are supplied. All-optional content does not waive FK/security constraints.
- Report index `(ReportDate, WorkflowStatus)` for head lists; the unique `(CoordinatorEmployeeId, ReportDate)` index also supports coordinator history.
- Section unique `(ReportId, SectionCode)`; entry index `(ReportId, SectionCode, SortOrder)`; class/subject entry index for academic filtering. A filtered unique entry index permits only one active Closing entry per report.
- Student/employee reverse indexes support pupil and teacher inspection history.
- Action index `(StatusCode, DueDate)` and `(OwnerEmployeeId, StatusCode)` for cross-date outstanding work.
- Revision unique report/version; review index `(RevisionId, CreatedAtUtc)`; attachment index on entry.
- Restrict deletion of master records referenced by reports. Soft-delete removed entries; do not cascade-delete submitted revisions, action history or evidence. Avoid SQL Server multiple-cascade paths by using explicit deletion behavior.
- Rowversion-protected aggregate writes, submit/return/review transactions and retry/idempotency protection prevent mobile double taps or stale saves from duplicating submissions/actions. Mutable child writes must advance the report version in the same transaction.
- API responses distinguish omitted fields from explicit null so autosave does not accidentally clear fields edited elsewhere.

## 9. Integrations and decisions still open

Keep existing student diary, complaints, conduct notes, attendance follow-ups and date sheets as separate operational records. This proforma records the coordinator's inspection/review of work. Do not automatically publish internal faculty/student counselling to parents or write into those modules. Optional typed source links can be added when a deliberate integration is specified.

Recommendations to use for the first implementation unless changed:

1. Confirmed: one report per coordinator/date. Wing is display-only, later fetched from employee data into a disabled textbox; it is not stored in the proforma database model.
2. Campus-wide attendance clearly labelled. Wing does not scope attendance or report ownership.
3. Revision-specific acknowledgement and approval, with fresh review after resubmission.
4. Notebook weekly schedule copied/stored on each report, rather than a shared mutable weekly record.
5. No mandatory daily/weekly completion requirements. Do not display “missing report” compliance counts yet: those require expected-report assignments, workday rules and effective dates. No row alone is not evidence of non-compliance.
6. Keep MKR-T as its own code without inventing its expansion or special validation.
7. Keep teacher-informed status separate from authentic teacher acknowledgement/signature.

Before migration implementation, settle permitted-campus grant storage, revision policy, attendance scope, and whether the extra notebook quality criteria need explicit UI controls. Report uniqueness is confirmed as coordinator/date; wing requires no schema decision here. B2 upload conventions should be fitted to the existing application integration rather than assumed from the mock attachments.

## 10. Suggested implementation sequence after agreement

1. Finalize this logical model and exact enums, lengths, FK names and deletion rules; prepare reviewed DDL/EF migrations for each campus without destructive legacy cleanup.
2. Implement coordinator draft/read/save/submit APIs, stable entry IDs, attendance snapshot capture and attachment finalization.
3. Implement authorized cross-campus head reads, revision review, comments and action verification.
4. Connect the existing UI to DTOs and print from revision snapshots; retain full paper field coverage on mobile and desktop.
5. Validate two coordinators on the same day, grouped students/teachers, null versus No/None/N/A, return/resubmit, concurrent saves, cross-campus ID collisions, restricted file access and historical printing after master data changes.

Source review: coordinatorWorkspaceData.js, ProformaPageOne.jsx, NotebookSchedule.jsx, HeadMonitoringPage.jsx, current CoordinatorDailyReport entity/configuration, Section/Student/SubjectMaster entities, and CampusMiddleware. UI sample values are examples, not confirmed production rules.
