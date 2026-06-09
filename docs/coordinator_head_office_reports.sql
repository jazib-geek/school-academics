/*
  Coordinator → Head office daily updates (Employee Portal)
  ----------------------------------------------------------------
  Run this script on each campus operational database (same DB as AppDbContext / tblEmployee).

  - Adds new tables only; does not ALTER existing tables.
  - Teacher/coordinator references use tblEmployee(ID) only.
  - Class-wise present/total for the day is NOT persisted here; the API should derive it
    from existing attendance data (see School.Application.Services.AttendanceService:
    GetAttendanceReportAsync, GetClassAttendanceSheetAsync, GetEmployeeAttendanceStatsAsync).

  Coordinator role in application code: DesignationID = 3 (constant to live in backend;
  not enforced in this script).
*/

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

/* Optional: set the campus database name before running. */
-- USE [YourCampusDbName];
-- GO

/* ------------------------------------------------------------------ */
/* tblCoordinatorDailyReport — one row per coordinator per calendar   */
/*   day (campus DB already scopes tenant).                           */
/* ------------------------------------------------------------------ */
IF OBJECT_ID(N'dbo.tblCoordinatorDailyReport', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.tblCoordinatorDailyReport
    (
        ID                         INT            NOT NULL IDENTITY(1, 1),
        CoordinatorEmployeeID      INT            NOT NULL,
        ReportDate                 DATE           NOT NULL,

        /* 1) Self arrival (local wall-clock time at campus) */
        ArrivalTime                TIME(0)        NULL,
        ArrivalRecordedAtUtc       DATETIME2(3)   NULL,

        /* 3) Assembly / morning round (all optional until filled) */
        AssemblyConductedPerPolicy BIT            NULL,
        MoralLessonTopic           NVARCHAR(500)  NULL,
        UniformCheckNotes          NVARCHAR(2000) NULL,
        CampusCleanlinessNotes     NVARCHAR(2000) NULL,
        TeachersInClassesNotes     NVARCHAR(2000) NULL,

        CreatedAtUtc               DATETIME2(3)   NOT NULL CONSTRAINT DF_CoordDailyReport_CreatedAtUtc DEFAULT (SYSUTCDATETIME()),
        UpdatedAtUtc               DATETIME2(3)   NOT NULL CONSTRAINT DF_CoordDailyReport_UpdatedAtUtc DEFAULT (SYSUTCDATETIME()),
        RowVersion                 ROWVERSION     NOT NULL,

        CONSTRAINT PK_tblCoordinatorDailyReport PRIMARY KEY CLUSTERED (ID),
        CONSTRAINT FK_CoordDailyReport_CoordinatorEmployee
            FOREIGN KEY (CoordinatorEmployeeID) REFERENCES dbo.tblEmployee (ID),
        CONSTRAINT UQ_CoordDailyReport_Coordinator_Date
            UNIQUE (CoordinatorEmployeeID, ReportDate)
    );

    CREATE NONCLUSTERED INDEX IX_CoordDailyReport_ReportDate
        ON dbo.tblCoordinatorDailyReport (ReportDate DESC);

    CREATE NONCLUSTERED INDEX IX_CoordDailyReport_Coordinator
        ON dbo.tblCoordinatorDailyReport (CoordinatorEmployeeID);
END
GO

/* ------------------------------------------------------------------ */
/* 2) Member on duty (MOD) — one row per duty window / assignee.      */
/*    DutyScope: Assembly | Break | OffTime | Other (+ optional      */
/*    label when Other).                                              */
/* ------------------------------------------------------------------ */
IF OBJECT_ID(N'dbo.tblCoordinatorModDuty', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.tblCoordinatorModDuty
    (
        ID                         INT            NOT NULL IDENTITY(1, 1),
        CoordinatorDailyReportID  INT            NOT NULL,
        DutyScope                  NVARCHAR(50)   NOT NULL,
        DutyScopeOtherLabel        NVARCHAR(100)  NULL,
        OnDutyEmployeeID           INT            NOT NULL,
        Notes                      NVARCHAR(500)  NULL,
        CreatedAtUtc               DATETIME2(3)   NOT NULL CONSTRAINT DF_CoordModDuty_CreatedAtUtc DEFAULT (SYSUTCDATETIME()),

        CONSTRAINT PK_tblCoordinatorModDuty PRIMARY KEY CLUSTERED (ID),
        CONSTRAINT FK_CoordModDuty_DailyReport
            FOREIGN KEY (CoordinatorDailyReportID) REFERENCES dbo.tblCoordinatorDailyReport (ID)
            ON DELETE CASCADE,
        CONSTRAINT FK_CoordModDuty_OnDutyEmployee
            FOREIGN KEY (OnDutyEmployeeID) REFERENCES dbo.tblEmployee (ID),
        CONSTRAINT CK_CoordModDuty_DutyScope
            CHECK (DutyScope IN (N'Assembly', N'Break', N'OffTime', N'Other'))
    );

    CREATE NONCLUSTERED INDEX IX_CoordModDuty_DailyReport
        ON dbo.tblCoordinatorModDuty (CoordinatorDailyReportID);

    CREATE NONCLUSTERED INDEX IX_CoordModDuty_OnDutyEmployee
        ON dbo.tblCoordinatorModDuty (OnDutyEmployeeID);
END
GO

/* ------------------------------------------------------------------ */
/* Teachers absent that day (names resolved via tblEmployee).         */
/* ------------------------------------------------------------------ */
IF OBJECT_ID(N'dbo.tblCoordinatorDailyAbsentTeacher', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.tblCoordinatorDailyAbsentTeacher
    (
        ID                         INT            NOT NULL IDENTITY(1, 1),
        CoordinatorDailyReportID   INT            NOT NULL,
        EmployeeID                 INT            NOT NULL,
        Notes                      NVARCHAR(500)  NULL,
        CreatedAtUtc               DATETIME2(3)   NOT NULL CONSTRAINT DF_CoordAbsentTeacher_CreatedAtUtc DEFAULT (SYSUTCDATETIME()),

        CONSTRAINT PK_tblCoordinatorDailyAbsentTeacher PRIMARY KEY CLUSTERED (ID),
        CONSTRAINT FK_CoordAbsentTeacher_DailyReport
            FOREIGN KEY (CoordinatorDailyReportID) REFERENCES dbo.tblCoordinatorDailyReport (ID)
            ON DELETE CASCADE,
        CONSTRAINT FK_CoordAbsentTeacher_Employee
            FOREIGN KEY (EmployeeID) REFERENCES dbo.tblEmployee (ID),
        CONSTRAINT UQ_CoordAbsentTeacher_Report_Employee
            UNIQUE (CoordinatorDailyReportID, EmployeeID)
    );

    CREATE NONCLUSTERED INDEX IX_CoordAbsentTeacher_DailyReport
        ON dbo.tblCoordinatorDailyAbsentTeacher (CoordinatorDailyReportID);

    CREATE NONCLUSTERED INDEX IX_CoordAbsentTeacher_Employee
        ON dbo.tblCoordinatorDailyAbsentTeacher (EmployeeID);
END
GO

/* ------------------------------------------------------------------ */
/* 5) Daily working report — ordered bullet lines (second WA sample).   */
/* ------------------------------------------------------------------ */
IF OBJECT_ID(N'dbo.tblCoordinatorWorkingReportLine', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.tblCoordinatorWorkingReportLine
    (
        ID                         INT            NOT NULL IDENTITY(1, 1),
        CoordinatorDailyReportID   INT            NOT NULL,
        LineOrder                  INT            NOT NULL,
        ActivityDescription        NVARCHAR(MAX)  NOT NULL,
        CreatedAtUtc               DATETIME2(3)   NOT NULL CONSTRAINT DF_CoordWorkingLine_CreatedAtUtc DEFAULT (SYSUTCDATETIME()),

        CONSTRAINT PK_tblCoordinatorWorkingReportLine PRIMARY KEY CLUSTERED (ID),
        CONSTRAINT FK_CoordWorkingLine_DailyReport
            FOREIGN KEY (CoordinatorDailyReportID) REFERENCES dbo.tblCoordinatorDailyReport (ID)
            ON DELETE CASCADE,
        CONSTRAINT CK_CoordWorkingLine_LineOrder
            CHECK (LineOrder >= 0)
    );

    CREATE NONCLUSTERED INDEX IX_CoordWorkingLine_DailyReport_Order
        ON dbo.tblCoordinatorWorkingReportLine (CoordinatorDailyReportID, LineOrder);
END
GO
