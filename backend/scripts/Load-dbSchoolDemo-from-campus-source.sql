/*
  Seed dbSchoolDemo from a legacy/campus source database (shard copy).

  Copies (source -> target, same SQL Server instance):
    dbo.tblClass, dbo.tblSectionColors, dbo.tblSection  (full)
    dbo.tblStudentFamilyDetail                          (families referenced by students)
    dbo.tblStudent                                       (all rows; includes IsCreditStudent when present on both DBs)
    dbo.tblStudentFamily                                 (legacy student/family links)
    dbo.tblFeeAndFundCollection                          (calendar year 2026 only; AugustGen omitted)

  dbo.tblFundType is left as-is on the target (settings / seed data).

  After students load, Fee / TutionFee / FeeConcession are normalized for the new app:
    Fee = class fee (higher), TutionFee = payable tuition (lower), FeeConcession = Fee - TutionFee.
  (Legacy dbDA often has Fee and TutionFee reversed and a negative FeeConcession.)

  NOT an EF migration. Run manually per environment after migrator has created schema on demo.

  How to run (SSMS):
    1. Edit @SourceDb / @TargetDb below (local: dbDA -> dbSchoolDemo).
    2. Execute the full script (first batch runs USE [dbSchoolDemo]).
    3. Execute.

  Production: source and demo must be on the same instance (3-part names). Cross-instance
  requires a linked server or export/import — out of scope for this script.

  Target must already be truncated on these tables (script aborts if any row exists).
  Apply campus migrator on target first (IsCreditStudent + ShowCreditStudent columns).

  Change the USE database below when @TargetDb is not dbSchoolDemo.
*/

USE [dbSchoolDemo];
GO

SET NOCOUNT ON;
SET XACT_ABORT ON;

DECLARE @SourceDb sysname = N'dbDA';        -- production: campus shard to copy from
DECLARE @TargetDb sysname = N'dbSchoolDemo'; -- must match USE database above
DECLARE @CurrentDb sysname = DB_NAME();

IF @CurrentDb <> @TargetDb
BEGIN
    RAISERROR(N'Active database is [%s]; expected [%s]. Fix the USE line at the top of this script.', 16, 1, @CurrentDb, @TargetDb);
    RETURN;
END;

IF DB_ID(@SourceDb) IS NULL
BEGIN
    RAISERROR(N'Source database [%s] not found on this instance.', 16, 1, @SourceDb);
    RETURN;
END;

----------------------------------------------------------------------------
-- Target must be empty on tables we fill (schema-only demo)
----------------------------------------------------------------------------
IF EXISTS (SELECT 1 FROM dbo.tblStudent)
    OR EXISTS (SELECT 1 FROM dbo.tblStudentFamily)
    OR EXISTS (SELECT 1 FROM dbo.tblSection)
    OR EXISTS (SELECT 1 FROM dbo.tblClass)
    OR EXISTS (SELECT 1 FROM dbo.tblSectionColors)
    OR EXISTS (SELECT 1 FROM dbo.tblStudentFamilyDetail)
    OR EXISTS (SELECT 1 FROM dbo.tblFeeAndFundCollection)
BEGIN
    RAISERROR(N'Demo tables are not empty. Truncate dbo.tblFeeAndFundCollection, dbo.tblStudent, dbo.tblStudentFamily, dbo.tblStudentFamilyDetail, dbo.tblSection, dbo.tblSectionColors, dbo.tblClass before running.', 16, 1);
    RETURN;
END;

DECLARE @sql nvarchar(max);

BEGIN TRY
    BEGIN TRANSACTION;

    ------------------------------------------------------------------------
    -- 1) Classes
    ------------------------------------------------------------------------
    SET @sql = N'
SET IDENTITY_INSERT dbo.tblClass ON;
INSERT INTO dbo.tblClass (Class_ID, BranchID, Class_Name, IsActive, isHifz, sort_by)
SELECT Class_ID, BranchID, Class_Name, IsActive, isHifz, sort_by
FROM ' + QUOTENAME(@SourceDb) + N'.dbo.tblClass;
SET IDENTITY_INSERT dbo.tblClass OFF;
DBCC CHECKIDENT (N''dbo.tblClass'', RESEED);';
    EXEC sys.sp_executesql @sql;

    ------------------------------------------------------------------------
    -- 2) Section colors
    ------------------------------------------------------------------------
    SET @sql = N'
SET IDENTITY_INSERT dbo.tblSectionColors ON;
INSERT INTO dbo.tblSectionColors (ID, BranchID, Color, IsActive)
SELECT ID, BranchID, Color, IsActive
FROM ' + QUOTENAME(@SourceDb) + N'.dbo.tblSectionColors;
SET IDENTITY_INSERT dbo.tblSectionColors OFF;
DBCC CHECKIDENT (N''dbo.tblSectionColors'', RESEED);';
    EXEC sys.sp_executesql @sql;

    ------------------------------------------------------------------------
    -- 3) Sections (class + color rows students reference via ClassCompositeID)
    ------------------------------------------------------------------------
    SET @sql = N'
SET IDENTITY_INSERT dbo.tblSection ON;
INSERT INTO dbo.tblSection (
    ID, Branch, BranchID, ClassName, Class_ID, Fee, IsActive, IsHifz,
    SectionID, SectionName, Section_Gender)
SELECT
    ID, Branch, BranchID, ClassName, Class_ID, Fee, IsActive, IsHifz,
    SectionID, SectionName, Section_Gender
FROM ' + QUOTENAME(@SourceDb) + N'.dbo.tblSection;
SET IDENTITY_INSERT dbo.tblSection OFF;
DBCC CHECKIDENT (N''dbo.tblSection'', RESEED);';
    EXEC sys.sp_executesql @sql;

    ------------------------------------------------------------------------
    -- 4) Family detail (FamilyID matches tblStudent.Family_Code)
    ------------------------------------------------------------------------
    SET @sql = N'
SET IDENTITY_INSERT dbo.tblStudentFamilyDetail ON;
INSERT INTO dbo.tblStudentFamilyDetail (
    ID, FamilyID, FatherName, FatherCNIC, FatherQualificationID, FatherOccupationID,
    FatherMobileNo, FatherWorkPhone, FatherEmail, MotherName, MotherCNIC, MotherPhoneNo,
    MotherQualificationID, MotherOccupationID, Password, IsActive, HomePhone, HomeAddress)
SELECT
    f.ID, f.FamilyID, f.FatherName, f.FatherCNIC, f.FatherQualificationID, f.FatherOccupationID,
    f.FatherMobileNo, f.FatherWorkPhone, f.FatherEmail, f.MotherName, f.MotherCNIC, f.MotherPhoneNo,
    f.MotherQualificationID, f.MotherOccupationID, f.Password, f.IsActive, f.HomePhone, f.HomeAddress
FROM ' + QUOTENAME(@SourceDb) + N'.dbo.tblStudentFamilyDetail AS f
WHERE f.FamilyID IN (
    SELECT DISTINCT s.Family_Code
    FROM ' + QUOTENAME(@SourceDb) + N'.dbo.tblStudent AS s
    WHERE s.Family_Code IS NOT NULL
);
SET IDENTITY_INSERT dbo.tblStudentFamilyDetail OFF;
DBCC CHECKIDENT (N''dbo.tblStudentFamilyDetail'', RESEED);';
    EXEC sys.sp_executesql @sql;

    ------------------------------------------------------------------------
    -- 5) Students (columns common to source and target; skips source-only IsCreditStudent)
    ------------------------------------------------------------------------
    DECLARE @studentCols nvarchar(max);

    SET @sql = N'
SELECT @colsOut = STRING_AGG(QUOTENAME(d.COLUMN_NAME), N'', '') WITHIN GROUP (ORDER BY d.ORDINAL_POSITION)
FROM ' + QUOTENAME(@TargetDb) + N'.INFORMATION_SCHEMA.COLUMNS AS d
INNER JOIN ' + QUOTENAME(@SourceDb) + N'.INFORMATION_SCHEMA.COLUMNS AS s
    ON s.TABLE_SCHEMA = d.TABLE_SCHEMA AND s.TABLE_NAME = d.TABLE_NAME AND s.COLUMN_NAME = d.COLUMN_NAME
WHERE d.TABLE_SCHEMA = N''dbo'' AND d.TABLE_NAME = N''tblStudent'';';
    EXEC sys.sp_executesql @sql, N'@colsOut nvarchar(max) OUTPUT', @colsOut = @studentCols OUTPUT;

    IF @studentCols IS NULL OR LEN(@studentCols) = 0
    BEGIN
        RAISERROR(N'Could not resolve dbo.tblStudent column list. Check source/target catalogs.', 16, 1);
        ROLLBACK TRANSACTION;
        RETURN;
    END;

    -- Reg_Id is not IDENTITY on legacy campus DBs (manual admission numbers); copy as-is.
    SET @sql = N'
INSERT INTO dbo.tblStudent (' + @studentCols + N')
SELECT ' + @studentCols + N'
FROM ' + QUOTENAME(@SourceDb) + N'.dbo.tblStudent AS src;';
    EXEC sys.sp_executesql @sql;

    -- Swap inverted Fee/TutionFee, then align concession (app: FeeConcession = class Fee - TutionFee).
    UPDATE s
    SET
        Fee = CASE
            WHEN ISNULL(s.TutionFee, 0) > ISNULL(CAST(s.Fee AS decimal(18, 2)), 0)
            THEN CAST(s.TutionFee AS int)
            ELSE s.Fee
        END,
        TutionFee = CASE
            WHEN ISNULL(s.TutionFee, 0) > ISNULL(CAST(s.Fee AS decimal(18, 2)), 0)
            THEN CAST(s.Fee AS decimal(18, 2))
            ELSE s.TutionFee
        END
    FROM dbo.tblStudent AS s;

    UPDATE s
    SET FeeConcession = CAST(
            ABS(ISNULL(CAST(s.Fee AS decimal(18, 2)), 0) - ISNULL(s.TutionFee, 0))
        AS decimal(18, 2))
    FROM dbo.tblStudent AS s
    WHERE s.Fee IS NOT NULL OR s.TutionFee IS NOT NULL;

    IF COL_LENGTH(N'dbo.tblStudent', N'IsCreditStudent') IS NOT NULL
    BEGIN
        SET @sql = N'
IF COL_LENGTH(N''dbo.tblStudent'', N''IsCreditStudent'') IS NOT NULL
BEGIN
    UPDATE t
    SET t.IsCreditStudent = CAST(ISNULL(s.IsCreditStudent, 0) AS bit)
    FROM dbo.tblStudent AS t
    INNER JOIN ' + QUOTENAME(@SourceDb) + N'.dbo.tblStudent AS s ON s.Reg_Id = t.Reg_Id;
END';
        EXEC sys.sp_executesql @sql;
    END;

    ------------------------------------------------------------------------
    -- 6) Legacy tblStudentFamily links
    ------------------------------------------------------------------------
    SET @sql = N'
SET IDENTITY_INSERT dbo.tblStudentFamily ON;
INSERT INTO dbo.tblStudentFamily (ID, StudentID, FamilyID)
SELECT d.ID, d.StudentID, d.FamilyID
FROM (
    SELECT
        sf.ID,
        sf.StudentID,
        sf.FamilyID,
        ROW_NUMBER() OVER (PARTITION BY sf.ID ORDER BY sf.StudentID) AS rn
    FROM ' + QUOTENAME(@SourceDb) + N'.dbo.tblStudentFamily AS sf
    WHERE EXISTS (
        SELECT 1
        FROM ' + QUOTENAME(@SourceDb) + N'.dbo.tblStudent AS s
        WHERE s.Reg_Id = sf.StudentID
    )
) AS d
WHERE d.rn = 1;
SET IDENTITY_INSERT dbo.tblStudentFamily OFF;
DBCC CHECKIDENT (N''dbo.tblStudentFamily'', RESEED);';
    EXEC sys.sp_executesql @sql;

    ------------------------------------------------------------------------
    -- 7) Fee ledger — year 2026 only (FundTypeID must exist on target tblFundType)
    ------------------------------------------------------------------------
    SET @sql = N'
SET IDENTITY_INSERT dbo.tblFeeAndFundCollection ON;
INSERT INTO dbo.tblFeeAndFundCollection (
    ID, TransactionID, StudentID, FundTypeID, ClassID, Date, Month, Year,
    Payment, Recieved, BranchID, SessionYear, ReceivedBy, Time, RcptID,
    VoidAmount, VoidDate, VoidBy, Discount, ManualRcptNo, Type)
SELECT
    f.ID, f.TransactionID, f.StudentID, f.FundTypeID, f.ClassID, f.Date, f.Month, f.Year,
    f.Payment, f.Recieved, f.BranchID, f.SessionYear, f.ReceivedBy, f.Time, f.RcptID,
    f.VoidAmount, f.VoidDate, f.VoidBy, f.Discount, f.ManualRcptNo, f.Type
FROM ' + QUOTENAME(@SourceDb) + N'.dbo.tblFeeAndFundCollection AS f
WHERE f.Year = 2026
   OR (f.Date >= ''20260101'' AND f.Date < ''20270101'');
SET IDENTITY_INSERT dbo.tblFeeAndFundCollection OFF;
DBCC CHECKIDENT (N''dbo.tblFeeAndFundCollection'', RESEED);';
    EXEC sys.sp_executesql @sql;

    ------------------------------------------------------------------------
    -- Optional: align fee receipt sequence if present (new app)
    ------------------------------------------------------------------------
    IF OBJECT_ID(N'dbo.tblFeeReceiptSequence', N'U') IS NOT NULL
    BEGIN
        DECLARE @maxRcpt int = (SELECT MAX(RcptID) FROM dbo.tblFeeAndFundCollection WHERE RcptID IS NOT NULL);
        IF @maxRcpt IS NOT NULL
        BEGIN
            UPDATE dbo.tblFeeReceiptSequence
            SET LastIssuedRcptId = @maxRcpt
            WHERE ID = (SELECT MIN(ID) FROM dbo.tblFeeReceiptSequence);
        END
    END

    COMMIT TRANSACTION;

    ------------------------------------------------------------------------
    -- Summary
    ------------------------------------------------------------------------
    SELECT
        (SELECT COUNT(*) FROM dbo.tblClass)              AS ClassRows,
        (SELECT COUNT(*) FROM dbo.tblSectionColors)      AS SectionColorRows,
        (SELECT COUNT(*) FROM dbo.tblSection)            AS SectionRows,
        (SELECT COUNT(*) FROM dbo.tblStudentFamilyDetail) AS FamilyDetailRows,
        (SELECT COUNT(*) FROM dbo.tblStudent)            AS StudentRows,
        (SELECT COUNT(*) FROM dbo.tblStudentFamily)      AS StudentFamilyRows,
        (SELECT COUNT(*) FROM dbo.tblFeeAndFundCollection) AS FeeRows2026;

END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0
        ROLLBACK TRANSACTION;

    DECLARE @msg nvarchar(4000) = ERROR_MESSAGE();
    RAISERROR(N'Load failed: %s', 16, 1, @msg);
END CATCH;
