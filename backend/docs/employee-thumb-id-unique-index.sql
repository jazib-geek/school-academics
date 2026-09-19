IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'UX_tblEmployee_Thumb_ID'
      AND object_id = OBJECT_ID('dbo.tblEmployee')
)
BEGIN
    CREATE UNIQUE INDEX UX_tblEmployee_Thumb_ID
        ON dbo.tblEmployee (Thumb_ID)
        WHERE Thumb_ID IS NOT NULL AND Thumb_ID <> '';
END;
