using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace School.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class MigrateStudentLogLeftReActivated2026ToActivityLog : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Copy 2026 Left / Re-Activated rows from legacy tblStudentLog into dbo.tblActivityLog.
            // Acting user: prefer Username 'admin', else 'jazib'. Unqualified legacy tables match AppDbContext mapping.
            migrationBuilder.Sql("""
                DECLARE @UserId int = NULL;
                DECLARE @UserName nvarchar(200) = NULL;

                SELECT TOP (1)
                    @UserId = u.ID,
                    @UserName = u.Username
                FROM tblUser AS u
                WHERE u.Username = N'admin'
                ORDER BY u.ID;

                IF @UserId IS NULL
                BEGIN
                    SELECT TOP (1)
                        @UserId = u.ID,
                        @UserName = u.Username
                    FROM tblUser AS u
                    WHERE u.Username = N'jazib'
                    ORDER BY u.ID;
                END;

                INSERT INTO dbo.tblActivityLog
                (
                    ActivityType,
                    EntityType,
                    EntityId,
                    EntityLabel,
                    UserId,
                    UserName,
                    OccurredAtPkt,
                    DetailsJson
                )
                SELECT
                    CASE
                        WHEN LTRIM(RTRIM(sl.[Type])) = N'Left' THEN N'StudentDeactivate'
                        ELSE N'StudentActivate'
                    END,
                    N'Student',
                    sl.StudentID,
                    LEFT(NULLIF(LTRIM(RTRIM(s.FullName)), N''), 200),
                    @UserId,
                    @UserName,
                    sl.[Date],
                    (
                        SELECT
                            N'legacy-student-log' AS [source],
                            LTRIM(RTRIM(sl.[Type])) AS [legacyType],
                            sl.ID AS [legacyStudentLogId],
                            sl.[Description] AS [description]
                        FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
                    )
                FROM tblStudentLog AS sl
                LEFT JOIN tblStudent AS s ON s.Reg_Id = sl.StudentID
                WHERE LTRIM(RTRIM(sl.[Type])) IN (N'Re-Activated', N'Left')
                  AND YEAR(sl.[Date]) = 2026
                  AND NOT EXISTS (
                      SELECT 1
                      FROM dbo.tblActivityLog AS al
                      WHERE al.EntityType = N'Student'
                        AND al.EntityId = sl.StudentID
                        AND al.ActivityType IN (N'StudentActivate', N'StudentDeactivate')
                        AND al.DetailsJson LIKE N'%"legacyStudentLogId":' + CAST(sl.ID AS nvarchar(20)) + N'%'
                  );
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                DELETE FROM dbo.tblActivityLog
                WHERE ActivityType IN (N'StudentActivate', N'StudentDeactivate')
                  AND DetailsJson LIKE N'%"source":"legacy-student-log"%'
                  AND YEAR(OccurredAtPkt) = 2026;
                """);
        }
    }
}
