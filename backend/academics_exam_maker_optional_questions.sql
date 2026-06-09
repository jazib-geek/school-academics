/*
  Academics Exam Maker — optional questions (SAQ/LAQ sections)
  Database: SchoolAcademics (AcademicContext)

  NO SCHEMA CHANGE REQUIRED.

  Per-section optional-question settings are persisted in the existing
  QuestionPaper.SectionMetaJson column (JSON array of section configs).

  Example fragment after save:
  [
    {
      "sectionKey": "Q2",
      "headingText": "Q2: Attempt the following questions.",
      "instructionText": "Attempt any 5 questions.",
      "marksDisplayText": "6x5=30",
      "optionalQuestionsEnabled": true,
      "optionalQuestionsAttemptCount": 5
    }
  ]

  Ensure SectionMetaJson exists (see docs/academics_exam_maker_mw.sql).
*/

USE [SchoolAcademics];
GO

-- Verification only (optional):
-- SELECT Id, PaperName, SectionMetaJson FROM dbo.QuestionPaper WHERE SectionMetaJson LIKE '%optionalQuestionsEnabled%';
GO
