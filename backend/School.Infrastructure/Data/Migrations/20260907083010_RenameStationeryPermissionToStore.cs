using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace School.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class RenameStationeryPermissionToStore : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.UpdateData(
                schema: "dbo",
                table: "tblPermission",
                keyColumn: "Id",
                keyValue: 137,
                columns: new[] { "ModuleHead", "Name" },
                values: new object[] { "Store", "Manage Store / Supplies" });

            migrationBuilder.Sql(
                """
                UPDATE dbo.tblUserRights
                SET ModuleName = N'Manage Store / Supplies',
                    ModuleHead = N'Store'
                WHERE ModuleCode = N'manage_stationery';
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                UPDATE dbo.tblUserRights
                SET ModuleName = N'Manage Stationery / Store',
                    ModuleHead = N'Stationery'
                WHERE ModuleCode = N'manage_stationery';
                """);

            migrationBuilder.UpdateData(
                schema: "dbo",
                table: "tblPermission",
                keyColumn: "Id",
                keyValue: 137,
                columns: new[] { "ModuleHead", "Name" },
                values: new object[] { "Stationery", "Manage Stationery / Store" });
        }
    }
}
