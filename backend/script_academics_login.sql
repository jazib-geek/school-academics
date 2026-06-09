USE [SchoolAcademics];
GO

IF OBJECT_ID(N'[dbo].[AcademicLogin]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[AcademicLogin]
    (
        [Id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [UserName] NVARCHAR(100) NOT NULL,
        [Password] NVARCHAR(200) NOT NULL
    );

    CREATE UNIQUE INDEX [UX_AcademicLogin_UserName]
        ON [dbo].[AcademicLogin]([UserName]);
END
GO

-- Optional seed user (change password after first login)
IF NOT EXISTS (SELECT 1 FROM [dbo].[AcademicLogin] WHERE [UserName] = N'academics_admin')
BEGIN
    INSERT INTO [dbo].[AcademicLogin] ([UserName], [Password])
    VALUES (N'academics_admin', N'admin123');
END
GO
