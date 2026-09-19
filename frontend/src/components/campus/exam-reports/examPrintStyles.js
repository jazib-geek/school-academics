export const EXAM_REPORT_PRINT_CSS = `
.exam-print-preview {
  background: #fff;
  color: #000;
  font-family: Arial, Helvetica, sans-serif;
}
.exam-print-break { page-break-after: always; }

.exam-ap-sheet { width: 760px; margin: 0 auto; }
.exam-ap-card { width: 760px; margin: 0 auto 24px; color: #000; }
.exam-ap-header { display: flex; align-items: flex-start; text-align: center; }
.exam-ap-logo { width: 20%; }
.exam-ap-logo img { width: 80%; max-width: 90px; }
.exam-ap-header-text { width: 80%; }
.exam-ap-header-text h1 { margin: 0; font-size: 26px; text-decoration: underline; letter-spacing: 0.3px; }
.exam-ap-header-text h3 { margin: 6px 0 0; }
.exam-ap-campus { font-size: 13px; }
.exam-ap-issued { text-align: right; font-size: 13px; padding-right: 10px; margin-bottom: 8px; }
.exam-ap-student { border: 2px solid #000; border-radius: 10px; padding: 10px; }
.exam-ap-student table { width: 100%; border-collapse: collapse; font-size: 13px; }
.exam-ap-bold { font-weight: 700; }
.exam-ap-block { display: block; }
.exam-ap-bottom td { padding-bottom: 10px; }
.exam-ap-top td { padding-top: 10px; }
.exam-ap-marks { border: 2px solid #000; border-radius: 10px; margin-top: 10px; overflow: hidden; }
.exam-ap-marks > table { width: 100%; border-collapse: collapse; }
.exam-ap-marks > table > tbody > tr > td { border: 2px solid #000; padding: 5px 4px; text-align: center; font-size: 12px; }
.exam-ap-marks > table > tbody > tr:first-child > td { border-top: 0; }
.exam-ap-marks > table > tbody > tr > td:last-child { border-right: 0; }
.exam-ap-marks > table > tbody > tr > td:first-child { border-left: 0; }
.exam-ap-marks > table > tbody > tr:last-child > td { border-bottom: 0; }
.exam-ap-subhead { font-size: 13px; }
.exam-ap-serial { width: 5%; }
.exam-ap-subject { width: 32%; text-align: left; }
.exam-ap-center { text-align: center !important; }
.exam-ap-right { text-align: right !important; }
.exam-ap-left { text-align: left !important; }
.exam-ap-dossier { padding: 0 !important; text-align: center !important; font-size: 16px; }
.exam-ap-dossier table { width: 100%; border-collapse: collapse; font-size: 10px; }
.exam-ap-dossier td { border: 1px solid #000; padding: 4px; }
.exam-ap-no-right { border-right: none !important; }
.exam-ap-long-remarks { text-align: center; padding-bottom: 6%; font-size: 11px; vertical-align: top; }
.exam-ap-note { margin-top: 12px; font-size: 12px; }
.exam-ap-signs { display: flex; justify-content: space-between; padding: 40px 0 0; }
.exam-ap-signs > div { border-top: 2px solid #000; padding-top: 5px; font-size: 12px; }

.exam-fancy-sheet { width: 100%; }
.exam-fancy-card { width: 100%; min-height: 240px; margin-bottom: 16px; }
.exam-fancy-header { text-align: center; margin-bottom: 16px; }
.exam-fancy-school { font-size: 22px; font-weight: 700; }
.exam-fancy-campus { font-size: 12px; margin-bottom: 8px; }
.exam-fancy-script { font-size: 28px; font-style: italic; }
.exam-fancy-body { display: flex; gap: 4%; }
.exam-fancy-left { width: 46%; }
.exam-fancy-right { width: 50%; }
.exam-fancy-id { width: 100%; margin-bottom: 12px; border-collapse: collapse; }
.exam-fancy-id td { padding: 4px 6px; font-size: 13px; }
.exam-fancy-id td:first-child { width: 38%; }
.exam-fancy-marks { width: 100%; border-collapse: collapse; }
.exam-fancy-marks th, .exam-fancy-marks td { border: 1px solid #000; padding: 6px 4px; font-size: 13px; }
.exam-fancy-marks th { font-size: 12px; }
.exam-fancy-center { text-align: center; }
.exam-fancy-align-right { text-align: right; }
.exam-fancy-total th { font-weight: 700; }
.exam-fancy-meta { width: 100%; border-collapse: collapse; }
.exam-fancy-meta td { padding: 6px 4px; font-size: 14px; vertical-align: top; }
.exam-fancy-remarks { font-style: italic; min-height: 90px; font-size: 13px; }
.exam-fancy-note { font-size: 11px; padding-top: 12px; }
.exam-fancy-sign { width: 33%; padding-top: 18px; font-size: 12px; }
.exam-fancy-sign b { display: block; font-size: 11px; padding-left: 15px; }

.exam-award2-sheet { display: flex; justify-content: space-between; align-items: flex-start; gap: 4%; }
.exam-award2-panel { width: 48%; }
.exam-award2-meta-table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
.exam-award2-meta-table td { border: none; padding: 3px 6px 3px 0; font-size: 12px; vertical-align: bottom; width: 50%; white-space: nowrap; }
.exam-award2-title { text-align: center; font-size: 20px; font-weight: 700; padding-bottom: 0; }
.exam-award2-sub { text-align: center; font-size: 8px; padding-top: 0; padding-bottom: 8px; }
.exam-award2-table { width: 100%; border-collapse: collapse; margin-top: 4px; }
.exam-award2-table th, .exam-award2-table td { border: 1px solid #000; padding: 3px 4px; font-size: 11px; background: #fff; color: #000; }
.exam-award2-table th { font-weight: 700; text-align: center; background: #fff; color: #000; }
.exam-award2-name { text-transform: uppercase; font-size: 10px; text-align: left; }
.exam-award2-foot { display: flex; justify-content: space-between; margin-top: 24px; font-size: 10px; align-items: flex-end; }

.exam-fill-line {
  display: inline-block;
  border-bottom: 1px solid #000;
  min-width: 6.5em;
  height: 1.05em;
  vertical-align: baseline;
  margin-left: 4px;
}
.exam-fill-line-wide { min-width: 9em; }
.exam-fill-value {
  display: inline-block;
  border-bottom: 1px solid #000;
  min-width: 9em;
  padding: 0 4px;
  margin-left: 4px;
  line-height: 1.2;
}

.exam-award3-sheet { width: 100%; }
.exam-award3-school { text-align: center; font-size: 24px; font-weight: 700; padding: 10px 0 6px; border: 1px solid #000; border-bottom: none; line-height: 1.2; }
.exam-award3-campus { font-size: 11px; font-weight: 400; margin-top: 2px; }
.exam-award3-report { display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; border: 1px solid #000; font-size: 16px; font-weight: 700; }
.exam-award3-info { width: 100%; border-collapse: collapse; margin-top: -1px; }
.exam-award3-info td { border: 1px solid #000; padding: 14px 10px; font-size: 14px; }
.exam-award3-line { display: inline-block; width: 140px; border-bottom: 1px solid #000; height: 14px; margin-left: 5px; vertical-align: baseline; }
.exam-award3-table { width: 100%; border-collapse: collapse; margin-top: -1px; }
.exam-award3-table th, .exam-award3-table td { border: 1px solid #000; padding: 8px 6px; font-size: 13px; height: 48px; vertical-align: middle; background: #fff; color: #000; }
.exam-award3-center { text-align: center; }
.exam-award3-name { text-transform: uppercase; padding-left: 8px; }
.exam-award3-remarks { margin-top: 16px; }
.exam-award3-remarks-title { padding: 8px 2px; font-size: 14px; }
.exam-award3-box { height: 45px; border: 1px solid #000; border-bottom: none; }
.exam-award3-box:last-child { border-bottom: 1px solid #000; }

.exam-award12-sheet { width: 100%; }
.exam-award12-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; }
.exam-award12-fields { font-size: 16px; font-weight: 700; }
.exam-award12-fields > div { margin: 6px 0; }
.exam-award12-title { text-align: right; }
.exam-award12-title h2 { margin: 0; }
.exam-award12-table { width: 100%; border-collapse: collapse; }
.exam-award12-table td { border: 1px solid #000; padding: 5px 4px; font-size: 12px; background: #fff; color: #000; }
.exam-award12-empty { border: none !important; }
.exam-award12-center { text-align: center; }
.exam-award12-subject { font-size: 10px; font-weight: 700; white-space: normal; word-break: break-word; }
.exam-award12-name { text-transform: uppercase; }

.exam-topn-sheet { width: 100%; }
.exam-topn-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; }
.exam-topn-school { font-size: 18px; font-weight: 700; }
.exam-topn-right { text-align: right; }
.exam-topn-right h2 { margin: 0 0 4px; }
.exam-topn-table { width: 100%; border-collapse: collapse; }
.exam-topn-table th, .exam-topn-table td { border: 1px solid #000; padding: 5px 6px; font-size: 12px; vertical-align: middle; background: #fff; color: #000; }
.exam-topn-table th { font-weight: 700; }
.exam-topn-center { text-align: center; }
.exam-topn-name { font-weight: 700; text-transform: uppercase; }
.exam-topn-father { text-transform: uppercase; font-size: 11px; }
.exam-topn-marks { text-align: center; }
.exam-topn-fraction { display: inline-flex; flex-direction: column; align-items: center; margin-right: 10px; line-height: 1.1; }
.exam-topn-fraction span:first-child { border-bottom: 1px solid #000; min-width: 28px; padding-bottom: 1px; }

@media print {
  .exam-print-preview { width: 100% !important; max-width: none !important; padding: 0 !important; }
  .exam-ap-sheet, .exam-ap-card { width: 100% !important; }
  .exam-print-break { page-break-after: always !important; }
  .exam-ap-card, .exam-fancy-card, .exam-award3-sheet, .exam-award2-sheet, .exam-award12-sheet, .exam-topn-sheet {
    page-break-inside: avoid;
  }
  .exam-print-preview table thead,
  .exam-print-preview table thead th,
  .exam-print-table thead,
  .exam-print-table thead th {
    background: #fff !important;
    color: #000 !important;
  }
}
`
