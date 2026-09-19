-- Run on each campus database (same schema, different DB per campus).
-- Stores DigitalPersona template as Base64 text from the kiosk app.

IF COL_LENGTH('dbo.tblEmployee', 'FingerprintTemplate') IS NULL
BEGIN
    ALTER TABLE dbo.tblEmployee
        ADD FingerprintTemplate NVARCHAR(MAX) NULL;
END;
GO

IF COL_LENGTH('dbo.tblEmployee', 'FingerprintEnrolledAt') IS NULL
BEGIN
    ALTER TABLE dbo.tblEmployee
        ADD FingerprintEnrolledAt DATETIME2(3) NULL;
END;
GO
