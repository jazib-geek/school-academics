-- Campus timetable (new tables). Do NOT use legacy dbo.tblTimeTable / dbo.tblTimeSlot.
-- FormatType: 1 = Class-wise (periods with times), 2 = Teacher-wise + Free column, 3 = Teacher-wise full (serial + periods).
-- DayOfWeek: 0 = daily / all days (V1); 1–7 reserved for Mon–Sun when weekly scaling is needed.

IF OBJECT_ID(N'dbo.tblCampusTimeTable', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.tblCampusTimeTable
    (
        ID              INT IDENTITY(1,1) NOT NULL,
        Name            NVARCHAR(150) NOT NULL,
        FormatType      TINYINT NOT NULL,
        DisplayTitle    NVARCHAR(200) NULL,
        Subtitle        NVARCHAR(200) NULL,
        IsDefault       BIT NOT NULL CONSTRAINT DF_CampusTimeTable_IsDefault DEFAULT (0),
        IsActive        BIT NOT NULL CONSTRAINT DF_CampusTimeTable_IsActive DEFAULT (1),
        CreatedAtUtc    DATETIME2(3) NOT NULL CONSTRAINT DF_CampusTimeTable_CreatedAtUtc DEFAULT (SYSUTCDATETIME()),
        UpdatedAtUtc    DATETIME2(3) NULL,
        CONSTRAINT PK_tblCampusTimeTable PRIMARY KEY CLUSTERED (ID),
        CONSTRAINT CK_CampusTimeTable_FormatType CHECK (FormatType IN (1, 2, 3))
    );
END;
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'UX_CampusTimeTable_Default'
      AND object_id = OBJECT_ID(N'dbo.tblCampusTimeTable')
)
BEGIN
    -- One default per FormatType (not globally).
    CREATE UNIQUE NONCLUSTERED INDEX UX_CampusTimeTable_Default
        ON dbo.tblCampusTimeTable (FormatType)
        WHERE IsDefault = 1 AND IsActive = 1;
END;
GO

IF OBJECT_ID(N'dbo.tblCampusTimeTablePeriod', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.tblCampusTimeTablePeriod
    (
        ID              INT IDENTITY(1,1) NOT NULL,
        TimeTableID     INT NOT NULL,
        PeriodNumber    INT NOT NULL,
        Label           NVARCHAR(50) NULL,
        StartTime       TIME(0) NULL,
        EndTime         TIME(0) NULL,
        SortOrder       INT NOT NULL CONSTRAINT DF_CampusTimeTablePeriod_SortOrder DEFAULT (0),
        IsBreak         BIT NOT NULL CONSTRAINT DF_CampusTimeTablePeriod_IsBreak DEFAULT (0),
        CONSTRAINT PK_tblCampusTimeTablePeriod PRIMARY KEY CLUSTERED (ID),
        CONSTRAINT FK_CampusTimeTablePeriod_Header
            FOREIGN KEY (TimeTableID) REFERENCES dbo.tblCampusTimeTable (ID) ON DELETE CASCADE,
        CONSTRAINT CK_CampusTimeTablePeriod_PeriodNumber CHECK (PeriodNumber >= 1)
    );
END;
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'UX_CampusTimeTablePeriod_Number'
      AND object_id = OBJECT_ID(N'dbo.tblCampusTimeTablePeriod')
)
BEGIN
    CREATE UNIQUE NONCLUSTERED INDEX UX_CampusTimeTablePeriod_Number
        ON dbo.tblCampusTimeTablePeriod (TimeTableID, PeriodNumber);
END;
GO

IF OBJECT_ID(N'dbo.tblCampusTimeTableMemberClass', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.tblCampusTimeTableMemberClass
    (
        ID              INT IDENTITY(1,1) NOT NULL,
        TimeTableID     INT NOT NULL,
        SectionID       INT NOT NULL,
        SortOrder       INT NOT NULL CONSTRAINT DF_CampusTimeTableMemberClass_SortOrder DEFAULT (0),
        CONSTRAINT PK_tblCampusTimeTableMemberClass PRIMARY KEY CLUSTERED (ID),
        CONSTRAINT FK_CampusTimeTableMemberClass_Header
            FOREIGN KEY (TimeTableID) REFERENCES dbo.tblCampusTimeTable (ID) ON DELETE CASCADE
    );
END;
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'UX_CampusTimeTableMemberClass'
      AND object_id = OBJECT_ID(N'dbo.tblCampusTimeTableMemberClass')
)
BEGIN
    CREATE UNIQUE NONCLUSTERED INDEX UX_CampusTimeTableMemberClass
        ON dbo.tblCampusTimeTableMemberClass (TimeTableID, SectionID);
END;
GO

IF OBJECT_ID(N'dbo.tblCampusTimeTableMemberTeacher', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.tblCampusTimeTableMemberTeacher
    (
        ID              INT IDENTITY(1,1) NOT NULL,
        TimeTableID     INT NOT NULL,
        EmployeeID      INT NOT NULL,
        SortOrder       INT NOT NULL CONSTRAINT DF_CampusTimeTableMemberTeacher_SortOrder DEFAULT (0),
        CONSTRAINT PK_tblCampusTimeTableMemberTeacher PRIMARY KEY CLUSTERED (ID),
        CONSTRAINT FK_CampusTimeTableMemberTeacher_Header
            FOREIGN KEY (TimeTableID) REFERENCES dbo.tblCampusTimeTable (ID) ON DELETE CASCADE
    );
END;
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'UX_CampusTimeTableMemberTeacher'
      AND object_id = OBJECT_ID(N'dbo.tblCampusTimeTableMemberTeacher')
)
BEGIN
    CREATE UNIQUE NONCLUSTERED INDEX UX_CampusTimeTableMemberTeacher
        ON dbo.tblCampusTimeTableMemberTeacher (TimeTableID, EmployeeID);
END;
GO

IF OBJECT_ID(N'dbo.tblCampusTimeTableSlot', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.tblCampusTimeTableSlot
    (
        ID              INT IDENTITY(1,1) NOT NULL,
        TimeTableID     INT NOT NULL,
        SectionID       INT NOT NULL,
        SubjectID       INT NOT NULL,
        EmployeeID      INT NOT NULL,
        PeriodNumber    INT NOT NULL,
        -- 0 = daily (V1). 1–7 = Mon–Sun for future weekly schedules.
        DayOfWeek       TINYINT NOT NULL CONSTRAINT DF_CampusTimeTableSlot_DayOfWeek DEFAULT (0),
        CreatedAtUtc    DATETIME2(3) NOT NULL CONSTRAINT DF_CampusTimeTableSlot_CreatedAtUtc DEFAULT (SYSUTCDATETIME()),
        UpdatedAtUtc    DATETIME2(3) NULL,
        CONSTRAINT PK_tblCampusTimeTableSlot PRIMARY KEY CLUSTERED (ID),
        CONSTRAINT FK_CampusTimeTableSlot_Header
            FOREIGN KEY (TimeTableID) REFERENCES dbo.tblCampusTimeTable (ID) ON DELETE CASCADE,
        CONSTRAINT CK_CampusTimeTableSlot_DayOfWeek CHECK (DayOfWeek BETWEEN 0 AND 7),
        CONSTRAINT CK_CampusTimeTableSlot_PeriodNumber CHECK (PeriodNumber >= 1)
    );
END;
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'UX_CampusTimeTableSlot_ClassPeriodDay'
      AND object_id = OBJECT_ID(N'dbo.tblCampusTimeTableSlot')
)
BEGIN
    CREATE UNIQUE NONCLUSTERED INDEX UX_CampusTimeTableSlot_ClassPeriodDay
        ON dbo.tblCampusTimeTableSlot (TimeTableID, SectionID, PeriodNumber, DayOfWeek);
END;
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'UX_CampusTimeTableSlot_TeacherPeriodDay'
      AND object_id = OBJECT_ID(N'dbo.tblCampusTimeTableSlot')
)
BEGIN
    CREATE UNIQUE NONCLUSTERED INDEX UX_CampusTimeTableSlot_TeacherPeriodDay
        ON dbo.tblCampusTimeTableSlot (TimeTableID, EmployeeID, PeriodNumber, DayOfWeek);
END;
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'IX_CampusTimeTableSlot_Header'
      AND object_id = OBJECT_ID(N'dbo.tblCampusTimeTableSlot')
)
BEGIN
    CREATE NONCLUSTERED INDEX IX_CampusTimeTableSlot_Header
        ON dbo.tblCampusTimeTableSlot (TimeTableID, DayOfWeek, PeriodNumber);
END;
GO
