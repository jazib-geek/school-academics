using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace School.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddStudentFeeTime : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "FeeTime",
                schema: "dbo",
                table: "tblStudent",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "FeeTimeUpdatedAtPkt",
                schema: "dbo",
                table: "tblStudent",
                type: "datetime2(3)",
                nullable: true);

            // Keep legacy history intact. Latest dated entry wins; ID breaks date ties.
            // Joining from students deliberately excludes orphaned legacy student IDs.
            const string backfillSql = """
                DECLARE @Backfill TABLE
                (
                    StudentID int NOT NULL PRIMARY KEY,
                    FeeTime nvarchar(max) NULL,
                    UpdatedAt datetime NULL
                );

                INSERT INTO @Backfill (StudentID, FeeTime, UpdatedAt)
                SELECT s.Reg_Id,
                    CASE WHEN NULLIF(LTRIM(RTRIM(l.[Description])), N'') IS NULL
                         THEN NULL ELSE l.[Description] END,
                    l.[Date]
                FROM dbo.tblStudent AS s
                CROSS APPLY
                (
                    SELECT TOP (1) sl.[Description], sl.[Date]
                    FROM dbo.tblStudentLog AS sl
                    WHERE sl.StudentID = s.Reg_Id AND sl.[Type] = N'fee_time'
                    ORDER BY sl.[Date] DESC, sl.ID DESC
                ) AS l;

                IF EXISTS (SELECT 1 FROM @Backfill WHERE DATALENGTH(FeeTime) > 1000)
                    THROW 51000, 'Legacy fee time exceeds 500 characters. Migration stopped without truncating data.', 1;

                UPDATE s
                SET s.FeeTime = b.FeeTime, s.FeeTimeUpdatedAtPkt = b.UpdatedAt
                FROM dbo.tblStudent AS s
                INNER JOIN @Backfill AS b ON b.StudentID = s.Reg_Id;
                """;
            // Defer compilation until after ALTER TABLE, including when EF generates one SQL batch.
            migrationBuilder.Sql($"EXEC sys.sp_executesql N'{backfillSql.Replace("'", "''")}';");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "FeeTime",
                schema: "dbo",
                table: "tblStudent");

            migrationBuilder.DropColumn(
                name: "FeeTimeUpdatedAtPkt",
                schema: "dbo",
                table: "tblStudent");
        }
    }
}
