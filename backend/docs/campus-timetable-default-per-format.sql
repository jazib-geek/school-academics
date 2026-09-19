-- One default timetable per FormatType (class-wise / teacher-wise free / teacher-wise full).
-- Replaces global unique default index UX_CampusTimeTable_Default on (IsDefault).

IF EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'UX_CampusTimeTable_Default'
      AND object_id = OBJECT_ID(N'dbo.tblCampusTimeTable')
)
BEGIN
    DROP INDEX UX_CampusTimeTable_Default ON dbo.tblCampusTimeTable;
END;
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'UX_CampusTimeTable_Default'
      AND object_id = OBJECT_ID(N'dbo.tblCampusTimeTable')
)
BEGIN
    CREATE UNIQUE NONCLUSTERED INDEX UX_CampusTimeTable_Default
        ON dbo.tblCampusTimeTable (FormatType)
        WHERE IsDefault = 1 AND IsActive = 1;
END;
GO
