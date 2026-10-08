using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace School.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddStudentSecurityDeposit : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsSystem",
                schema: "dbo",
                table: "tblAccounts",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateTable(
                name: "tblStudentSecurityDepositEvent",
                schema: "dbo",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    StudentId = table.Column<int>(type: "int", nullable: false),
                    EventType = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    Amount = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    EventDatePkt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    SessionYear = table.Column<int>(type: "int", nullable: false),
                    FeeLedgerRowId = table.Column<int>(type: "int", nullable: true),
                    ReceiptId = table.Column<int>(type: "int", nullable: true),
                    VoucherNo = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    EntryUser = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    Notes = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    CreatedAtPkt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tblStudentSecurityDepositEvent", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_StudentSecurityDepositEvent_FeeLedgerRowId",
                schema: "dbo",
                table: "tblStudentSecurityDepositEvent",
                column: "FeeLedgerRowId",
                filter: "[FeeLedgerRowId] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_StudentSecurityDepositEvent_StudentId",
                schema: "dbo",
                table: "tblStudentSecurityDepositEvent",
                column: "StudentId");

            migrationBuilder.Sql(
                """
                UPDATE dbo.tblAccounts
                SET IsSystem = 1
                WHERE UPPER(LTRIM(RTRIM(AccountTitle))) IN (N'CASH IN HAND', N'OWNER DRAWINGS');

                IF NOT EXISTS (SELECT 1 FROM dbo.tblFundType WHERE ID = 7)
                BEGIN
                    SET IDENTITY_INSERT dbo.tblFundType ON;
                    INSERT INTO dbo.tblFundType (ID, FundType) VALUES (7, N'Security Deposit');
                    SET IDENTITY_INSERT dbo.tblFundType OFF;
                END
                """);

            migrationBuilder.InsertData(
                schema: "dbo",
                table: "tblPermission",
                columns: new[] { "Id", "Code", "IsActive", "ModuleHead", "Name", "SortOrder" },
                values: new object[] { 145, "refund_security_deposit", true, "Fee", "Refund Security Deposit", 1450 });

            migrationBuilder.Sql(
                """
                IF OBJECT_ID('tempdb..#NewPerms') IS NOT NULL DROP TABLE #NewPerms;

                SELECT p.Code, p.Name, p.ModuleHead
                INTO #NewPerms
                FROM dbo.tblPermission p
                WHERE p.Code IN (N'refund_security_deposit');

                UPDATE r
                SET r.HasAccess = 1,
                    r.ModuleName = g.Name,
                    r.ModuleHead = g.ModuleHead
                FROM dbo.tblUserRights r
                INNER JOIN dbo.tblUser u ON u.Username = r.UserName
                INNER JOIN #NewPerms g ON g.Code = r.ModuleCode
                WHERE u.IsActive = 1
                  AND (
                        LOWER(LTRIM(RTRIM(u.Username))) IN (N'admin', N'jazib')
                     OR u.IsSuperAdmin = 1
                  );

                INSERT INTO dbo.tblUserRights (UserName, ModuleCode, ModuleName, HasAccess, BranchCode, ModuleHead)
                SELECT u.Username, g.Code, g.Name, 1, NULL, g.ModuleHead
                FROM dbo.tblUser u
                CROSS JOIN #NewPerms g
                WHERE u.IsActive = 1
                  AND NULLIF(LTRIM(RTRIM(u.Username)), N'') IS NOT NULL
                  AND (
                        LOWER(LTRIM(RTRIM(u.Username))) IN (N'admin', N'jazib')
                     OR u.IsSuperAdmin = 1
                  )
                  AND NOT EXISTS (
                        SELECT 1 FROM dbo.tblUserRights r
                        WHERE r.UserName = u.Username AND r.ModuleCode = g.Code);
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                DELETE FROM dbo.tblUserRights WHERE ModuleCode = N'refund_security_deposit';
                DELETE FROM dbo.tblPermission WHERE Code = N'refund_security_deposit';
                DELETE FROM dbo.tblFundType WHERE ID = 7 AND FundType = N'Security Deposit';
                UPDATE dbo.tblAccounts SET IsSystem = 0
                WHERE UPPER(LTRIM(RTRIM(AccountTitle))) IN (N'CASH IN HAND', N'OWNER DRAWINGS');
                """);

            migrationBuilder.DropTable(
                name: "tblStudentSecurityDepositEvent",
                schema: "dbo");

            migrationBuilder.DropColumn(
                name: "IsSystem",
                schema: "dbo",
                table: "tblAccounts");
        }
    }
}
