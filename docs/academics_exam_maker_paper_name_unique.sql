/*
  Academics Exam Maker — unique paper version per slot
  Run manually on SchoolAcademics after deploying app changes.

  Identity: ClassId + SubjectId + ExamTitleId + ExamType + PaperName
  (case-insensitive for PaperName under default SQL Server collation)

  Before creating the index, fix any duplicates reported by the SELECT below.
*/

USE [SchoolAcademics];
GO

-- Preview duplicates (same class/subject/title/type/name)
SELECT
    qp.ClassId,
    qp.SubjectId,
    qp.ExamTitleId,
    LOWER(LTRIM(RTRIM(ISNULL(qp.ExamType, '')))) AS ExamTypeNorm,
    LOWER(LTRIM(RTRIM(qp.PaperName))) AS PaperNameNorm,
    COUNT(*) AS Cnt
FROM dbo.QuestionPaper qp
GROUP BY
    qp.ClassId,
    qp.SubjectId,
    qp.ExamTitleId,
    LOWER(LTRIM(RTRIM(ISNULL(qp.ExamType, '')))),
    LOWER(LTRIM(RTRIM(qp.PaperName)))
HAVING COUNT(*) > 1;
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = N'UQ_QuestionPaper_SlotPaperName'
      AND object_id = OBJECT_ID(N'dbo.QuestionPaper')
)
BEGIN
    CREATE UNIQUE NONCLUSTERED INDEX [UQ_QuestionPaper_SlotPaperName]
    ON [dbo].[QuestionPaper] ([ClassId], [SubjectId], [ExamTitleId], [ExamType], [PaperName]);
END
GO
