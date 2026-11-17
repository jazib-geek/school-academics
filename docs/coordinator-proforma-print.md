# Coordinator proforma printing (UI prototype)

On `/#/heads/monitoring-preview`, select a coordinator report, then **Print proforma**. A separate print preview opens with **Print / Save PDF**. Use A4 landscape, 100% scale, and disable browser headers/footers. The button is available on mobile and desktop; missing reports cannot be printed.

The first five sheets recreate the supplied blank proforma screenshots: table arrangement, serif headings, blue section bands, Fix/Optional colours, notebook/observation columns and closing fields. This is an HTML reconstruction, not the original PDF. Selected report values are escaped and filled into the corresponding cells, independently of the dashboard's concern filter.

Unrecorded fields stay blank. Attendance is read only from an optional report-level `attendanceSnapshot` (`active`, `absent`, `faculty`, `absentFaculty`); the current mock reports have no such snapshot. Campus-wide live/sample totals are not substituted for a dated wing report. Checklist marks come from explicitly recorded checklist state.

When notebook entries exist, a Copies Rechecking Report follows the five sheets. Teacher signature cells remain blank. Structured checks without equivalent paper columns are included in supporting details. Additional records and lengthy text are retained in continuation pages, with references where necessary to preserve the original five-page layout.

Implementation: `frontend/src/pages/Heads/ProformaPrint.jsx` and `proformaPrint.css`. No backend, database or upload changes. Browser smoke checks cover selected-report output, desktop/mobile button availability, empty reports, long entries, HTML escaping and PDF generation. An empty report produces five PDF pages; the full sample produces seven (five main sheets, notebook sheet, supporting details).
