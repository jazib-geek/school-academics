using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace School.Infrastructure.Academics.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddAcademicUsersAndPermissions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsActive",
                schema: "dbo",
                table: "AcademicLogin",
                type: "bit",
                nullable: false,
                defaultValue: true);

            migrationBuilder.CreateTable(
                name: "tblPermission",
                schema: "dbo",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Code = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    ModuleHead = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false, defaultValue: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tblPermission", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "tblUserRights",
                schema: "dbo",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<int>(type: "int", nullable: false),
                    PermissionCode = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    HasAccess = table.Column<bool>(type: "bit", nullable: false, defaultValue: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tblUserRights", x => x.Id);
                    table.ForeignKey(
                        name: "FK_tblUserRights_AcademicLogin_UserId",
                        column: x => x.UserId,
                        principalSchema: "dbo",
                        principalTable: "AcademicLogin",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.InsertData(
                schema: "dbo",
                table: "tblPermission",
                columns: new[] { "Id", "Code", "IsActive", "ModuleHead", "Name", "SortOrder" },
                values: new object[,]
                {
                    { 1, "view_dashboard", true, "Dashboard", "View Dashboard", 10 },
                    { 2, "view_classes", true, "Classes", "View Classes", 20 },
                    { 3, "create_class", true, "Classes", "Create Class", 30 },
                    { 4, "edit_class", true, "Classes", "Edit Class", 40 },
                    { 5, "delete_class", true, "Classes", "Delete Class", 50 },
                    { 6, "view_subjects", true, "Subjects", "View Subjects", 60 },
                    { 7, "create_subject", true, "Subjects", "Create Subject", 70 },
                    { 8, "edit_subject", true, "Subjects", "Edit Subject", 80 },
                    { 9, "delete_subject", true, "Subjects", "Delete Subject", 90 },
                    { 10, "view_chapters", true, "Chapters", "View Chapters", 100 },
                    { 11, "create_chapter", true, "Chapters", "Create Chapter", 110 },
                    { 12, "edit_chapter", true, "Chapters", "Edit Chapter", 120 },
                    { 13, "delete_chapter", true, "Chapters", "Delete Chapter", 130 },
                    { 14, "view_question_catalog", true, "Question Catalog", "View Question Catalog", 140 },
                    { 15, "create_question", true, "Question Catalog", "Create Question", 150 },
                    { 16, "edit_question", true, "Question Catalog", "Edit Question", 160 },
                    { 17, "delete_question", true, "Question Catalog", "Delete Question", 170 },
                    { 18, "view_exam_titles", true, "Exam Titles", "View Exam Titles", 180 },
                    { 19, "create_exam_title", true, "Exam Titles", "Create Exam Title", 190 },
                    { 20, "edit_exam_title", true, "Exam Titles", "Edit Exam Title", 200 },
                    { 21, "delete_exam_title", true, "Exam Titles", "Delete Exam Title", 210 },
                    { 22, "view_exam_maker", true, "Exam Maker", "View Exam Maker", 220 },
                    { 23, "create_exam_paper", true, "Exam Maker", "Create Exam Paper", 230 },
                    { 24, "edit_exam_paper", true, "Exam Maker", "Edit Exam Paper", 240 },
                    { 25, "delete_exam_paper", true, "Exam Maker", "Delete Exam Paper", 250 },
                    { 26, "view_institute_settings", true, "Institute", "View Institute Settings", 260 },
                    { 27, "edit_institute_settings", true, "Institute", "Edit Institute Settings", 270 },
                    { 28, "view_users", true, "Users", "View Users", 280 },
                    { 29, "create_user", true, "Users", "Create User", 290 },
                    { 30, "edit_user", true, "Users", "Edit User", 300 },
                    { 31, "delete_user", true, "Users", "Deactivate User", 310 }
                });

            migrationBuilder.CreateIndex(
                name: "IX_tblPermission_Code",
                schema: "dbo",
                table: "tblPermission",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_tblUserRights_UserId_PermissionCode",
                schema: "dbo",
                table: "tblUserRights",
                columns: new[] { "UserId", "PermissionCode" },
                unique: true);

            // Seed default admin (admin / 12345) with every catalog permission granted.
            migrationBuilder.Sql("""
                IF NOT EXISTS (SELECT 1 FROM dbo.AcademicLogin WHERE UserName = N'admin')
                BEGIN
                    INSERT INTO dbo.AcademicLogin (UserName, Password, IsActive)
                    VALUES (N'admin', N'12345', 1);
                END
                ELSE
                BEGIN
                    UPDATE dbo.AcademicLogin
                    SET IsActive = 1
                    WHERE UserName = N'admin';
                END

                DECLARE @AdminId INT = (SELECT TOP 1 Id FROM dbo.AcademicLogin WHERE UserName = N'admin');

                IF @AdminId IS NOT NULL
                BEGIN
                    INSERT INTO dbo.tblUserRights (UserId, PermissionCode, HasAccess)
                    SELECT @AdminId, p.Code, 1
                    FROM dbo.tblPermission p
                    WHERE NOT EXISTS (
                        SELECT 1
                        FROM dbo.tblUserRights ur
                        WHERE ur.UserId = @AdminId AND ur.PermissionCode = p.Code
                    );

                    UPDATE ur
                    SET HasAccess = 1
                    FROM dbo.tblUserRights ur
                    INNER JOIN dbo.tblPermission p ON p.Code = ur.PermissionCode
                    WHERE ur.UserId = @AdminId;
                END
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "tblPermission",
                schema: "dbo");

            migrationBuilder.DropTable(
                name: "tblUserRights",
                schema: "dbo");

            migrationBuilder.DropColumn(
                name: "IsActive",
                schema: "dbo",
                table: "AcademicLogin");
        }
    }
}
