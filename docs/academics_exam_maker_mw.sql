/*
  Academics Exam Maker - Manual SQL (MW Script)
  Run this script on SchoolAcademics database.
  No EF migration required.

  For multiple exam versions per class/subject/title/type, also run:
  academics_exam_maker_paper_name_unique.sql
*/

USE [SchoolAcademics];
GO

IF COL_LENGTH('dbo.QuestionPaper', 'SchoolName') IS NULL
BEGIN
    ALTER TABLE dbo.QuestionPaper ADD SchoolName NVARCHAR(250) NULL;
END
GO

IF COL_LENGTH('dbo.QuestionPaper', 'SchoolLogoUrl') IS NULL
BEGIN
    ALTER TABLE dbo.QuestionPaper ADD SchoolLogoUrl NVARCHAR(500) NULL;
END
GO

IF COL_LENGTH('dbo.QuestionPaper', 'ExamTitle') IS NULL
BEGIN
    ALTER TABLE dbo.QuestionPaper ADD ExamTitle NVARCHAR(250) NULL;
END
GO

IF COL_LENGTH('dbo.QuestionPaper', 'SessionLabel') IS NULL
BEGIN
    ALTER TABLE dbo.QuestionPaper ADD SessionLabel NVARCHAR(100) NULL;
END
GO

IF COL_LENGTH('dbo.QuestionPaper', 'ExamType') IS NULL
BEGIN
    ALTER TABLE dbo.QuestionPaper ADD ExamType NVARCHAR(50) NULL;
END
GO

IF COL_LENGTH('dbo.QuestionPaper', 'HeaderNote') IS NULL
BEGIN
    ALTER TABLE dbo.QuestionPaper ADD HeaderNote NVARCHAR(1200) NULL;
END
GO

IF COL_LENGTH('dbo.QuestionPaper', 'Instructions') IS NULL
BEGIN
    ALTER TABLE dbo.QuestionPaper ADD Instructions NVARCHAR(2000) NULL;
END
GO

IF COL_LENGTH('dbo.QuestionPaper', 'FooterNote') IS NULL
BEGIN
    ALTER TABLE dbo.QuestionPaper ADD FooterNote NVARCHAR(1200) NULL;
END
GO

IF COL_LENGTH('dbo.QuestionPaper', 'SectionMetaJson') IS NULL
BEGIN
    ALTER TABLE dbo.QuestionPaper ADD SectionMetaJson NVARCHAR(MAX) NULL;
END
GO

IF COL_LENGTH('dbo.QuestionPaper', 'ShowSectionNames') IS NULL
BEGIN
    ALTER TABLE dbo.QuestionPaper ADD ShowSectionNames BIT NOT NULL CONSTRAINT DF_QuestionPaper_ShowSectionNames DEFAULT(0);
END
GO

IF COL_LENGTH('dbo.QuestionPaper', 'SubQuestionNumberingStyle') IS NULL
BEGIN
    ALTER TABLE dbo.QuestionPaper ADD SubQuestionNumberingStyle NVARCHAR(20) NULL;
END
GO

IF COL_LENGTH('dbo.QuestionPaper', 'WrapQuestionMarksInParentheses') IS NULL
BEGIN
    ALTER TABLE dbo.QuestionPaper ADD WrapQuestionMarksInParentheses BIT NOT NULL CONSTRAINT DF_QuestionPaper_WrapQuestionMarks DEFAULT(0);
END
GO

/*
  ExamTitle lookup table + QuestionPaper.ExamTitleId (replaces nvarchar ExamTitle)
  Run after the sections above if upgrading an existing SchoolAcademics database.
*/

IF OBJECT_ID(N'dbo.ExamTitle', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ExamTitle (
        Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_ExamTitle PRIMARY KEY,
        Title NVARCHAR(250) NOT NULL,
        ExamType NVARCHAR(50) NULL,
        CreatedOn DATETIME NOT NULL CONSTRAINT DF_ExamTitle_CreatedOn DEFAULT (GETDATE())
    );

    CREATE UNIQUE INDEX UX_ExamTitle_Title ON dbo.ExamTitle(Title);
END
GO

IF COL_LENGTH('dbo.QuestionPaper', 'ExamTitleId') IS NULL
BEGIN
    ALTER TABLE dbo.QuestionPaper ADD ExamTitleId INT NULL;
END
GO


IF COL_LENGTH('dbo.QuestionPaper', 'ExamTitleId') IS NOT NULL
   AND NOT EXISTS (
       SELECT 1 FROM sys.foreign_keys fk
       INNER JOIN sys.tables t ON fk.parent_object_id = t.object_id
       WHERE fk.name = N'FK_QuestionPaper_ExamTitle' AND SCHEMA_NAME(t.schema_id) = N'dbo')
BEGIN
    ALTER TABLE dbo.QuestionPaper ALTER COLUMN ExamTitleId INT NOT NULL;

    ALTER TABLE dbo.QuestionPaper ADD CONSTRAINT FK_QuestionPaper_ExamTitle
        FOREIGN KEY (ExamTitleId) REFERENCES dbo.ExamTitle(Id);
END
GO

/* Optional starter row when the lookup table is empty (adjust or remove as needed). */
IF NOT EXISTS (SELECT 1 FROM dbo.ExamTitle)
BEGIN
    INSERT INTO dbo.ExamTitle (Title, ExamType, CreatedOn)
    VALUES (N'1st Term Exam, 2026-27', NULL, GETDATE());
END
GO

IF COL_LENGTH('dbo.QuestionPaper', 'PrintAdjustmentsJson') IS NULL
BEGIN
    ALTER TABLE dbo.QuestionPaper ADD PrintAdjustmentsJson NVARCHAR(MAX) NULL;
END
GO

/*
  Optional questions (SAQ/LAQ "attempt any N") — no ALTER required.
  Stored inside QuestionPaper.SectionMetaJson as JSON on each section:
    optionalQuestionsEnabled (bool)
    optionalQuestionsAttemptCount (int)
  See backend/academics_exam_maker_optional_questions.sql for details.
*/
GO
