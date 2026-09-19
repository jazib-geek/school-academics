/*
  Campus: dc (dbSBS_DC) — August 2026 attendance backfill
  Teacher: Miss Aqsa Khalid (EmpID = 18)

  Mirrors BE path:
    ApplyManualTimes → RecalculateAndApply → EmployeeAttendanceCalculator.Apply
    ChangeJson shaped like BuildManualChangeJson("ManualMarkPresent", ...)
    so UI treats rows as manually marked present (IsManuallyAdjusted).

  Safety:
    - Run ONLY against dbSBS_DC
    - Insert-only for new EmpID+date rows
    - Also backfills ChangeJson on prior SQL-Backfill rows that have NULL ChangeJson
    - No deletes
*/

SET NOCOUNT ON;
SET XACT_ABORT ON;

----------------------------------------------------------------------------
-- 0) Target campus guard
----------------------------------------------------------------------------
IF DB_NAME() <> N'dbSBS_DC'
BEGIN
    RAISERROR(N'Wrong database. Connect to dbSBS_DC (campus dc) before running this script.', 16, 1);
    RETURN;
END;

/* Real table columns must match EmployeeAttendance entity */
IF COL_LENGTH(N'dbo.tblEmployeeAttendance', N'ChangeJson') IS NULL
BEGIN
    RAISERROR(N'dbo.tblEmployeeAttendance.ChangeJson is missing. Apply campus migrations before backfill.', 16, 1);
    RETURN;
END;

IF COL_LENGTH(N'dbo.tblEmployeeAttendance', N'CheckOutTime') IS NULL
BEGIN
    RAISERROR(N'dbo.tblEmployeeAttendance.CheckOutTime is missing. Apply campus migrations before backfill.', 16, 1);
    RETURN;
END;

DECLARE @EmpId        INT          = 18;
DECLARE @ExpectedName NVARCHAR(50) = N'%Aqsa%Khalid%';
DECLARE @UpdatedBy    NVARCHAR(50) = N'SQL-Backfill-Aug2026';
DECLARE @MonthStart   DATE         = '2026-08-01';
DECLARE @MonthEnd     DATE         = '2026-09-01';
DECLARE @DaysInMonth  INT          = DAY(EOMONTH(@MonthStart)); -- 31 for Aug 2026
DECLARE @EditedAt     NVARCHAR(40) =
    CONVERT(nvarchar(33), SWITCHOFFSET(SYSDATETIMEOFFSET(), '+05:00'), 127);

----------------------------------------------------------------------------
-- 1) Employee + designation guard
----------------------------------------------------------------------------
IF OBJECT_ID('tempdb..#EmpDuty') IS NOT NULL DROP TABLE #EmpDuty;

SELECT
    e.ID AS EmpID,
    e.EmployeeName,
    e.Salary,
    e.DesignationID,
    d.Designation AS DesignationName,
    CAST(d.MustCheckinTime AS time(0)) AS ExpectedCheckIn,
    CAST(d.LeavingTime AS time(0)) AS ExpectedCheckOut,
    ISNULL(d.MustCheckinMinutesDifference, 0) AS GraceMinutes
INTO #EmpDuty
FROM dbo.tblEmployee AS e
LEFT JOIN dbo.tblDesignation AS d ON d.ID = e.DesignationID
WHERE e.ID = @EmpId;

IF NOT EXISTS (SELECT 1 FROM #EmpDuty)
BEGIN
    RAISERROR(N'Employee ID %d was not found.', 16, 1, @EmpId);
    RETURN;
END;

IF NOT EXISTS (
    SELECT 1
    FROM #EmpDuty
    WHERE EmployeeName LIKE @ExpectedName
)
BEGIN
    DECLARE @ActualName NVARCHAR(150) = (SELECT TOP (1) EmployeeName FROM #EmpDuty);
    RAISERROR(
        N'EmpID %d name is "%s" — expected pattern %s. Aborting.',
        16, 1, @EmpId, @ActualName, @ExpectedName);
    RETURN;
END;

IF EXISTS (
    SELECT 1
    FROM #EmpDuty
    WHERE ExpectedCheckIn IS NULL OR ExpectedCheckOut IS NULL
)
BEGIN
    RAISERROR(N'Designation MustCheckinTime / LeavingTime is missing for EmpID %d. Aborting.', 16, 1, @EmpId);
    RETURN;
END;

SELECT
    N'GUARD: employee + designation' AS Step,
    EmpID,
    EmployeeName,
    DesignationID,
    DesignationName,
    ExpectedCheckIn,
    ExpectedCheckOut,
    GraceMinutes,
    Salary,
    @DaysInMonth AS DaysInMonth
FROM #EmpDuty;

----------------------------------------------------------------------------
-- 2) Punch list (only days with CI/CO from the sheet)
--    Checkout times sit in the column beside Check in (header "check k out" is offset).
--    "1:00"/"1:30" → 13:xx; "12:30" stays 12:30.
----------------------------------------------------------------------------
IF OBJECT_ID('tempdb..#Punches') IS NOT NULL DROP TABLE #Punches;

CREATE TABLE #Punches
(
    AttendanceDate date NOT NULL PRIMARY KEY,
    CheckInTime    time(0) NOT NULL,
    CheckOutTime   time(0) NOT NULL
);

INSERT INTO #Punches (AttendanceDate, CheckInTime, CheckOutTime)
VALUES
    ('2026-08-13', '08:00', '13:00'),
    ('2026-08-20', '08:00', '13:00'),
    ('2026-08-21', '08:00', '12:30'),
    ('2026-08-22', '07:30', '13:30');

----------------------------------------------------------------------------
-- 3) Computed preview (same LC / salary math as EmployeeAttendanceCalculator)
--    Explicit CREATE TABLE avoids SSMS temp-table schema cache (Msg 207).
----------------------------------------------------------------------------
IF OBJECT_ID('tempdb..#AttendanceBackfillRows') IS NOT NULL DROP TABLE #AttendanceBackfillRows;

CREATE TABLE #AttendanceBackfillRows
(
    EmpID                int            NOT NULL,
    EmployeeName         nvarchar(150)  NULL,
    AttendanceDate       date           NOT NULL,
    TimeHhMm             char(5)        NOT NULL,
    CheckOutDateTime     datetime       NOT NULL,
    CheckOutHhMm         char(5)        NOT NULL,
    ExpectedCheckIn      time(0)        NULL,
    ExpectedCheckOut     time(0)        NULL,
    GraceMinutes         int            NOT NULL,
    LateMinutes          int            NOT NULL,
    EarlyMinutes         int            NOT NULL,
    TotalPenaltyMinutes  int            NOT NULL,
    LateComings          int            NOT NULL,
    CurrentSalary        decimal(18, 0) NULL,
    LateDeduction        decimal(18, 0) NULL,
    TodaySalary          decimal(18, 0) NULL,
    /* Mirrors dbo.tblEmployeeAttendance.ChangeJson (nvarchar(max)) */
    ChangeJsonText       nvarchar(max)  NOT NULL,
    Action               nvarchar(40)   NOT NULL
);

;WITH Base AS
(
    SELECT
        p.AttendanceDate,
        p.CheckInTime,
        p.CheckOutTime,
        d.EmpID,
        d.EmployeeName,
        d.ExpectedCheckIn,
        d.ExpectedCheckOut,
        d.GraceMinutes,
        CAST(ROUND(ISNULL(d.Salary, 0), 2) AS decimal(18, 2)) AS CurrentSalary
    FROM #Punches AS p
    CROSS JOIN #EmpDuty AS d
),
LateEarly AS
(
    SELECT
        b.*,
        CASE
            WHEN CAST(b.CheckInTime AS datetime)
                 <= DATEADD(MINUTE, b.GraceMinutes, CAST(b.ExpectedCheckIn AS datetime))
                THEN 0
            ELSE DATEDIFF(MINUTE, b.ExpectedCheckIn, b.CheckInTime)
        END AS LateMinutes,
        CASE
            WHEN b.CheckOutTime < b.ExpectedCheckOut
                THEN DATEDIFF(MINUTE, b.CheckOutTime, b.ExpectedCheckOut)
            ELSE 0
        END AS EarlyMinutes
    FROM Base AS b
),
Slabs AS
(
    SELECT
        le.*,
        (le.LateMinutes + le.EarlyMinutes) AS TotalPenaltyMinutes,
        CASE
            WHEN (le.LateMinutes + le.EarlyMinutes) <= 0 THEN 0
            ELSE CASE
                WHEN ((le.LateMinutes + le.EarlyMinutes - 1) / 30) + 1 > 7 THEN 7
                ELSE ((le.LateMinutes + le.EarlyMinutes - 1) / 30) + 1
            END
        END AS LateComings
    FROM LateEarly AS le
),
Money AS
(
    SELECT
        s.*,
        CAST(ROUND(s.CurrentSalary, 0) AS decimal(18, 0)) AS CurrentSalaryOut,
        CAST(ROUND(
            CASE
                WHEN s.CurrentSalary <= 0 OR s.LateComings <= 0 THEN 0
                ELSE s.LateComings * ((s.CurrentSalary / @DaysInMonth) / 12.0)
            END
        , 2) AS decimal(18, 0)) AS LateDeductionOut,
        CAST(ROUND(
            CASE
                WHEN s.CurrentSalary <= 0 THEN 0
                ELSE (s.CurrentSalary / @DaysInMonth)
                    - CASE
                        WHEN s.LateComings <= 0 THEN 0
                        ELSE s.LateComings * ((s.CurrentSalary / @DaysInMonth) / 12.0)
                      END
            END
        , 2) AS decimal(18, 0)) AS TodaySalaryOut
    FROM Slabs AS s
)
INSERT INTO #AttendanceBackfillRows
(
    EmpID, EmployeeName, AttendanceDate, TimeHhMm, CheckOutDateTime, CheckOutHhMm,
    ExpectedCheckIn, ExpectedCheckOut, GraceMinutes,
    LateMinutes, EarlyMinutes, TotalPenaltyMinutes, LateComings,
    CurrentSalary, LateDeduction, TodaySalary, ChangeJsonText, Action
)
SELECT
    m.EmpID,
    m.EmployeeName,
    m.AttendanceDate,
    CONVERT(char(5), m.CheckInTime, 108),
    DATEADD(DAY, DATEDIFF(DAY, 0, m.AttendanceDate), CAST(m.CheckOutTime AS datetime)),
    CONVERT(char(5), m.CheckOutTime, 108),
    m.ExpectedCheckIn,
    m.ExpectedCheckOut,
    m.GraceMinutes,
    m.LateMinutes,
    m.EarlyMinutes,
    m.TotalPenaltyMinutes,
    m.LateComings,
    m.CurrentSalaryOut,
    m.LateDeductionOut,
    m.TodaySalaryOut,
    CONCAT(
        N'{"Source":"ManualMarkPresent","EditedBy":"', @UpdatedBy, N'","EditedAt":"', @EditedAt, N'",',
        N'"Before":{"Time":null,"CheckOutTime":null,"LateComings":null,"LateDeduction":null,"TodaySalary":null,"CurrentSalary":null,"Status":null,"UpdatedBy":null},',
        N'"After":{"Time":"', CONVERT(char(5), m.CheckInTime, 108),
            N'","CheckOutTime":"', CONVERT(char(5), m.CheckOutTime, 108),
            N'","LateComings":', CAST(m.LateComings AS nvarchar(10)),
            N',"LateDeduction":', CAST(m.LateDeductionOut AS nvarchar(30)),
            N',"TodaySalary":', CAST(m.TodaySalaryOut AS nvarchar(30)),
            N',"CurrentSalary":', CAST(m.CurrentSalaryOut AS nvarchar(30)),
            N',"Status":"P","UpdatedBy":"', @UpdatedBy, N'"},',
        N'"Calculation":{"LateMinutes":', CAST(m.LateMinutes AS nvarchar(10)),
            N',"EarlyMinutes":', CAST(m.EarlyMinutes AS nvarchar(10)),
            N',"totalMinutes":', CAST(m.TotalPenaltyMinutes AS nvarchar(10)),
            N',"lateComings":', CAST(m.LateComings AS nvarchar(10)), N'},',
        N'"Salary":{"currentSalary":', CAST(m.CurrentSalaryOut AS nvarchar(30)),
            N',"lateDeduction":', CAST(m.LateDeductionOut AS nvarchar(30)),
            N',"todaySalary":', CAST(m.TodaySalaryOut AS nvarchar(30)), N'}}'
    ),
    CASE
        WHEN EXISTS (
            SELECT 1
            FROM dbo.tblEmployeeAttendance AS a
            WHERE a.EmpID = m.EmpID
              AND a.[Date] IS NOT NULL
              AND CAST(a.[Date] AS date) = m.AttendanceDate
        ) THEN N'SKIP (already exists)'
        ELSE N'INSERT'
    END
FROM Money AS m;

SELECT
    N'PREVIEW: computed rows (review LC + ChangeJson before insert)' AS Step,
    EmpID,
    AttendanceDate,
    TimeHhMm,
    CheckOutHhMm,
    LateMinutes,
    EarlyMinutes,
    LateComings,
    CurrentSalary,
    LateDeduction,
    TodaySalary,
    Action,
    ChangeJsonText AS ChangeJson
FROM #AttendanceBackfillRows
ORDER BY AttendanceDate;

----------------------------------------------------------------------------
-- 4) Insert-only where no EmpID + date row exists
----------------------------------------------------------------------------
BEGIN TRAN;

/*
  dbo.tblEmployeeAttendance columns (EmployeeAttendance entity):
    ID, EmpID, Date, Time, Type, Status, LateComings,
    CurrentSalary, LateDeduction, TodaySalary, UpdatedBy, ChangeJson, CheckOutTime
*/
INSERT INTO dbo.tblEmployeeAttendance
(
    EmpID,
    [Date],
    [Time],
    [Type],
    [Status],
    LateComings,
    CurrentSalary,
    LateDeduction,
    TodaySalary,
    UpdatedBy,
    ChangeJson,
    CheckOutTime
)
SELECT
    c.EmpID,
    c.AttendanceDate,
    c.TimeHhMm,
    NULL,
    N'P',
    c.LateComings,
    c.CurrentSalary,
    c.LateDeduction,
    c.TodaySalary,
    @UpdatedBy,
    c.ChangeJsonText,
    c.CheckOutDateTime
FROM #AttendanceBackfillRows AS c
WHERE c.Action = N'INSERT';

DECLARE @Inserted INT = @@ROWCOUNT;

UPDATE a
SET
    a.ChangeJson = c.ChangeJsonText,
    a.UpdatedBy = @UpdatedBy
FROM dbo.tblEmployeeAttendance AS a
INNER JOIN #AttendanceBackfillRows AS c
    ON a.EmpID = c.EmpID
   AND a.[Date] IS NOT NULL
   AND CAST(a.[Date] AS date) = c.AttendanceDate
WHERE a.ChangeJson IS NULL
   OR LTRIM(RTRIM(a.ChangeJson)) = N'';

DECLARE @Patched INT = @@ROWCOUNT;

COMMIT TRAN;

SELECT
    N'INSERT / PATCH complete' AS Step,
    @Inserted AS RowsInserted,
    @Patched AS RowsChangeJsonPatched,
    (SELECT COUNT(*) FROM #AttendanceBackfillRows WHERE Action = N'SKIP (already exists)') AS RowsSkippedExisting;

----------------------------------------------------------------------------
-- 5) Post-check
----------------------------------------------------------------------------
SELECT
    N'VERIFY: August 2026 attendance for EmpID ' + CAST(@EmpId AS nvarchar(20)) AS Step,
    a.ID,
    a.EmpID,
    a.[Date],
    a.[Time],
    a.CheckOutTime,
    a.[Status],
    a.LateComings,
    a.CurrentSalary,
    a.LateDeduction,
    a.TodaySalary,
    a.UpdatedBy,
    a.ChangeJson
FROM dbo.tblEmployeeAttendance AS a
WHERE a.EmpID = @EmpId
  AND a.[Date] IS NOT NULL
  AND CAST(a.[Date] AS date) >= @MonthStart
  AND CAST(a.[Date] AS date) < @MonthEnd
ORDER BY a.[Date];
