IF OBJECT_ID(N'dbo.tblExamSubjectComponentMark', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.tblExamSubjectComponentMark
    (
        ID              INT IDENTITY(1,1) NOT NULL,
        ExamID          INT NOT NULL,
        HeaderID        INT NOT NULL,
        Marks           DECIMAL(8,2) NOT NULL CONSTRAINT DF_ExamSubjectComponentMark_Marks DEFAULT (0),
        CreatedAtUtc    DATETIME2(3) NOT NULL CONSTRAINT DF_ExamSubjectComponentMark_CreatedAtUtc DEFAULT (SYSUTCDATETIME()),
        UpdatedAtUtc    DATETIME2(3) NULL,
        CONSTRAINT PK_tblExamSubjectComponentMark PRIMARY KEY CLUSTERED (ID)
    );
END;
GO

IF OBJECT_ID(N'dbo.tblExamSubjectComponentHeader', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.tblExamSubjectComponentHeader
    (
        ID              INT IDENTITY(1,1) NOT NULL,
        ClassID         INT NOT NULL,
        ExamTypeID      INT NOT NULL,
        SubjectID       INT NOT NULL,
        HeaderName      NVARCHAR(150) NOT NULL,
        MaxMarks        DECIMAL(8,2) NULL,
        SortOrder       INT NOT NULL CONSTRAINT DF_ExamSubjectComponentHeader_SortOrder DEFAULT (0),
        IsActive        BIT NOT NULL CONSTRAINT DF_ExamSubjectComponentHeader_IsActive DEFAULT (1),
        CreatedAtUtc    DATETIME2(3) NOT NULL CONSTRAINT DF_ExamSubjectComponentHeader_CreatedAtUtc DEFAULT (SYSUTCDATETIME()),
        UpdatedAtUtc    DATETIME2(3) NULL,
        CONSTRAINT PK_tblExamSubjectComponentHeader PRIMARY KEY CLUSTERED (ID)
    );
END;
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'UX_ExamSubjectComponentHeader_ActiveName'
      AND object_id = OBJECT_ID(N'dbo.tblExamSubjectComponentHeader')
)
BEGIN
    CREATE UNIQUE NONCLUSTERED INDEX UX_ExamSubjectComponentHeader_ActiveName
        ON dbo.tblExamSubjectComponentHeader (ClassID, ExamTypeID, SubjectID, HeaderName)
        WHERE IsActive = 1;
END;
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'IX_ExamSubjectComponentHeader_Scope'
      AND object_id = OBJECT_ID(N'dbo.tblExamSubjectComponentHeader')
)
BEGIN
    CREATE NONCLUSTERED INDEX IX_ExamSubjectComponentHeader_Scope
        ON dbo.tblExamSubjectComponentHeader (ClassID, ExamTypeID, SubjectID, IsActive, SortOrder);
END;
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'UX_ExamSubjectComponentMark_Exam_Header'
      AND object_id = OBJECT_ID(N'dbo.tblExamSubjectComponentMark')
)
BEGIN
    CREATE UNIQUE NONCLUSTERED INDEX UX_ExamSubjectComponentMark_Exam_Header
        ON dbo.tblExamSubjectComponentMark (ExamID, HeaderID);
END;
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.foreign_keys
    WHERE name = N'FK_ExamSubjectComponentMark_Exam'
)
BEGIN
    ALTER TABLE dbo.tblExamSubjectComponentMark
    ADD CONSTRAINT FK_ExamSubjectComponentMark_Exam
        FOREIGN KEY (ExamID) REFERENCES dbo.tblExam (ID);
END;
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.foreign_keys
    WHERE name = N'FK_ExamSubjectComponentMark_Header'
)
BEGIN
    ALTER TABLE dbo.tblExamSubjectComponentMark
    ADD CONSTRAINT FK_ExamSubjectComponentMark_Header
        FOREIGN KEY (HeaderID) REFERENCES dbo.tblExamSubjectComponentHeader (ID);
END;
GO
