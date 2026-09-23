using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace School.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddCampusTimeTableSlotLineIndex : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                IF EXISTS (
                    SELECT 1 FROM sys.indexes
                    WHERE name = N'IX_tblCampusTimeTableSlot_TimeTableID_SectionID_PeriodNumber_DayOfWeek'
                      AND object_id = OBJECT_ID(N'dbo.tblCampusTimeTableSlot')
                )
                    DROP INDEX [IX_tblCampusTimeTableSlot_TimeTableID_SectionID_PeriodNumber_DayOfWeek] ON [dbo].[tblCampusTimeTableSlot];

                IF EXISTS (
                    SELECT 1 FROM sys.indexes
                    WHERE name = N'UX_CampusTimeTableSlot_ClassPeriodDay'
                      AND object_id = OBJECT_ID(N'dbo.tblCampusTimeTableSlot')
                )
                    DROP INDEX [UX_CampusTimeTableSlot_ClassPeriodDay] ON [dbo].[tblCampusTimeTableSlot];

                IF COL_LENGTH(N'dbo.tblCampusTimeTableSlot', N'LineIndex') IS NULL
                BEGIN
                    ALTER TABLE [dbo].[tblCampusTimeTableSlot]
                        ADD [LineIndex] TINYINT NOT NULL
                            CONSTRAINT [DF_CampusTimeTableSlot_LineIndex] DEFAULT (0);
                END

                IF NOT EXISTS (
                    SELECT 1 FROM sys.indexes
                    WHERE name = N'IX_tblCampusTimeTableSlot_TimeTableID_SectionID_PeriodNumber_DayOfWeek_LineIndex'
                      AND object_id = OBJECT_ID(N'dbo.tblCampusTimeTableSlot')
                )
                    CREATE UNIQUE NONCLUSTERED INDEX [IX_tblCampusTimeTableSlot_TimeTableID_SectionID_PeriodNumber_DayOfWeek_LineIndex]
                        ON [dbo].[tblCampusTimeTableSlot] ([TimeTableID], [SectionID], [PeriodNumber], [DayOfWeek], [LineIndex]);
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                IF EXISTS (
                    SELECT 1 FROM sys.indexes
                    WHERE name = N'IX_tblCampusTimeTableSlot_TimeTableID_SectionID_PeriodNumber_DayOfWeek_LineIndex'
                      AND object_id = OBJECT_ID(N'dbo.tblCampusTimeTableSlot')
                )
                    DROP INDEX [IX_tblCampusTimeTableSlot_TimeTableID_SectionID_PeriodNumber_DayOfWeek_LineIndex] ON [dbo].[tblCampusTimeTableSlot];

                IF COL_LENGTH(N'dbo.tblCampusTimeTableSlot', N'LineIndex') IS NOT NULL
                BEGIN
                    IF EXISTS (
                        SELECT 1 FROM sys.default_constraints
                        WHERE name = N'DF_CampusTimeTableSlot_LineIndex'
                          AND parent_object_id = OBJECT_ID(N'dbo.tblCampusTimeTableSlot')
                    )
                        ALTER TABLE [dbo].[tblCampusTimeTableSlot] DROP CONSTRAINT [DF_CampusTimeTableSlot_LineIndex];

                    ALTER TABLE [dbo].[tblCampusTimeTableSlot] DROP COLUMN [LineIndex];
                END

                IF NOT EXISTS (
                    SELECT 1 FROM sys.indexes
                    WHERE name = N'IX_tblCampusTimeTableSlot_TimeTableID_SectionID_PeriodNumber_DayOfWeek'
                      AND object_id = OBJECT_ID(N'dbo.tblCampusTimeTableSlot')
                )
                    CREATE UNIQUE NONCLUSTERED INDEX [IX_tblCampusTimeTableSlot_TimeTableID_SectionID_PeriodNumber_DayOfWeek]
                        ON [dbo].[tblCampusTimeTableSlot] ([TimeTableID], [SectionID], [PeriodNumber], [DayOfWeek]);
                """);
        }
    }
}
