/*
  Copy dbo.tblStudent.IsCreditStudent from a source campus DB (e.g. dbDA) into dbSchoolDemo.

  Use after:
    - Migrator has added IsCreditStudent on the target (AddStudentIsCreditStudentAndCampusShowFlag).
    - Students already exist on demo with matching Reg_Id values from the source.

  Does NOT enable UI — turn on "Show credit student" in Institute settings separately
  (tblCampusProfile.ShowCreditStudent).

  SSMS: run the full script (USE batch + main batch). Edit @SourceDb for production source catalog.
*/

USE [dbSchoolDemo];
GO

SET NOCOUNT ON;
SET XACT_ABORT ON;

DECLARE @SourceDb sysname = N'dbDA';
DECLARE @TargetDb sysname = N'dbSchoolDemo';
DECLARE @CurrentDb sysname = DB_NAME();
DECLARE @sql nvarchar(max);
DECLARE @updated int;
DECLARE @sourceHasCol int;
DECLARE @sourceCredit int;
DECLARE @sourceRows int;
DECLARE @targetRows int;
DECLARE @targetCredit int;
DECLARE @targetOnly int;
DECLARE @sourceTable nvarchar(261);

IF @CurrentDb <> @TargetDb
BEGIN
    RAISERROR(N'Active database is [%s]; expected [%s]. Fix the USE line at the top.', 16, 1, @CurrentDb, @TargetDb);
    RETURN;
END;

IF DB_ID(@SourceDb) IS NULL
BEGIN
    RAISERROR(N'Source database [%s] not found on this instance.', 16, 1, @SourceDb);
    RETURN;
END;

IF COL_LENGTH(N'dbo.tblStudent', N'IsCreditStudent') IS NULL
BEGIN
    RAISERROR(N'dbo.tblStudent.IsCreditStudent is missing on target. Run campus migrator on %s first.', 16, 1, @TargetDb);
    RETURN;
END;

SET @sourceTable = @SourceDb + N'.dbo.tblStudent';
SET @sql = N'SELECT @out = COL_LENGTH(@tbl, N''IsCreditStudent'')';
EXEC sys.sp_executesql
    @sql,
    N'@tbl nvarchar(261), @out int OUTPUT',
    @tbl = @sourceTable,
    @out = @sourceHasCol OUTPUT;

IF @sourceHasCol IS NULL
BEGIN
    RAISERROR(N'Source [%s].dbo.tblStudent has no IsCreditStudent column.', 16, 1, @SourceDb);
    RETURN;
END;

BEGIN TRY
    BEGIN TRANSACTION;

    SET @sql = N'
UPDATE t
SET t.IsCreditStudent = CAST(ISNULL(s.IsCreditStudent, 0) AS bit)
FROM dbo.tblStudent AS t
INNER JOIN ' + QUOTENAME(@SourceDb) + N'.dbo.tblStudent AS s ON s.Reg_Id = t.Reg_Id
WHERE ISNULL(t.IsCreditStudent, 0) <> ISNULL(s.IsCreditStudent, 0);';

    EXEC sys.sp_executesql @sql;
    SET @updated = @@ROWCOUNT;

    COMMIT TRANSACTION;

    SET @sql = N'
SELECT
    @sc = (SELECT COUNT(*) FROM ' + QUOTENAME(@SourceDb) + N'.dbo.tblStudent WHERE IsCreditStudent = 1),
    @sr = (SELECT COUNT(*) FROM ' + QUOTENAME(@SourceDb) + N'.dbo.tblStudent);';
    EXEC sys.sp_executesql
        @sql,
        N'@sc int OUTPUT, @sr int OUTPUT',
        @sc = @sourceCredit OUTPUT,
        @sr = @sourceRows OUTPUT;

    SELECT
        @targetCredit = COUNT(*) FROM dbo.tblStudent WHERE IsCreditStudent = 1;
    SELECT @targetRows = COUNT(*) FROM dbo.tblStudent;

    SET @sql = N'
SELECT @n = COUNT(*)
FROM dbo.tblStudent AS t
WHERE NOT EXISTS (
    SELECT 1 FROM ' + QUOTENAME(@SourceDb) + N'.dbo.tblStudent AS s WHERE s.Reg_Id = t.Reg_Id);';
    EXEC sys.sp_executesql @sql, N'@n int OUTPUT', @n = @targetOnly OUTPUT;

    SELECT
        @updated AS RowsUpdated,
        @sourceCredit AS SourceCreditStudents,
        @sourceRows AS SourceStudentRows,
        @targetCredit AS TargetCreditStudents,
        @targetRows AS TargetStudentRows,
        @targetOnly AS TargetStudentsNotInSource;

END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0
        ROLLBACK TRANSACTION;

    DECLARE @msg nvarchar(4000) = ERROR_MESSAGE();
    RAISERROR(N'Sync failed: %s', 16, 1, @msg);
END CATCH;
