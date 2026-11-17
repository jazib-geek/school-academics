# Coordinator workspace — UI prototype

## Agreed scope

- Coordinators enter through the existing employee portal. Prototype route: `/employee/coordinator-workspace`, protected by the existing coordinator route guard.
- Existing daily reporting remains available separately.
- Use mock arrays and component state while refining the UI. No database schema, migrations, report API calls, or uploads are introduced.
- Wing is a fixed dropdown for now. The initial choices are provisional: Pre-primary, Primary, Middle, High, Primary + High.
- All sections and fields are optional at this stage.
- Strength means the active student count. Attendance also distinguishes present, absent and unmarked students.
- SOS means Scheme of studies. SVHW means Summer vacation homework. MKR-T remains an unexpanded label pending clarification.
- Academic heads acknowledge and approve reports; these are separate states.

## Prototype behaviour

Employee home exposes **Coordinator workspace · Preview** to coordinators. Today, Entries, Follow-ups and Report views cover the five-page proforma and the additional copies rechecking sheet.

The initial date / Primary + High report contains illustrative morning, notebook and observation entries, plus a linked follow-up. Other date/wing combinations start empty. Entries, context and submission status are isolated by date and wing. Follow-ups span report dates within a wing.

Entry forms support edit/delete, optional follow-up details and local image/PDF previews. Attachments are not uploaded. All changes, including attached files, are lost when the workspace unmounts or the page refreshes. The interface explicitly labels this limitation.

Report submission is simulated and permits unfilled sections. Submitted entries become read only; **Reopen preview draft** supports further UI exploration. Heads' acknowledgement and approval remain pending because the head workflow is not implemented here. Coordinators can move actions to **In progress** or **Ready for verification**; the head will verify completion in a future iteration.

The sample campus attendance card is illustrative, with an explicit note that its figures are not connected to the chosen date or wing.

## Academic-head dashboard — standalone mockup

Open `/#/heads/monitoring-preview`, or use **Head monitoring preview** at the bottom of the coordinator workspace. This mock-only route has no login UI or live-data access. Its fixtures are independent of the coordinator workspace's in-memory entries.

The desktop view places the report list beside the full report inspector. Mobile opens the same inspector with an **All reports** back button. Both support all 14 report sections, evidence previews, concerns filtering, head notes, separate acknowledgement and approval, returning reports for correction, and verifying/reopening follow-ups. Campus switching preserves each campus's mock decisions in memory. Refreshing or leaving resets them.

Three sample campuses contain reports for today and yesterday, including submitted, draft, missing and approved examples. Other dates show an empty state. Attendance is explicitly labelled as illustrative for today; follow-ups span report dates. Evidence is a generated sample document view rather than a real uploaded file.

- Standalone dashboard, outside the campus shell.
- On implementation, use the existing employee login and redirect employees with the Head designation here; do not add a separate login screen. Production access remains intended for heads and super admin.
- Heads supervise multiple campuses and switch the active campus through the top bar without leaving the dashboard screen.
- Provide acknowledgement and approval of reports, plus review of supporting entries and follow-ups.
- Designation changes, login redirection, server-side authorization and permitted-campus scope will be designed with the backend after the entry UI is settled. No authentication behaviour or designation is changed by this prototype.

## Still to settle

Final wing choices; mandatory checks and schedules; MKR-T meaning; correction/reopening policy; action verification rules; Backblaze attachment workflow; campus identity and access scope for heads; final database schema and integration with existing attendance, follow-up, diary, conduct and datesheet records.
