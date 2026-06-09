using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using School.Infrastructure.Entities;

namespace School.Infrastructure.Data.Configurations;

public class CoordinatorDailyReportConfiguration : IEntityTypeConfiguration<CoordinatorDailyReport>
{
    public void Configure(EntityTypeBuilder<CoordinatorDailyReport> entity)
    {
        entity.ToTable("tblCoordinatorDailyReport");
        entity.HasKey(e => e.Id);
        entity.Property(e => e.Id).HasColumnName("ID");

        entity.Property(e => e.CoordinatorEmployeeId).HasColumnName("CoordinatorEmployeeID");
        entity.Property(e => e.ReportDate).HasColumnType("date");
        entity.Property(e => e.ArrivalTime).HasColumnType("time(0)");
        entity.Property(e => e.ArrivalRecordedAtUtc).HasColumnType("datetime2(3)");
        entity.Property(e => e.AssemblyConductedPerPolicy);
        entity.Property(e => e.MoralLessonTopic).HasMaxLength(500);
        entity.Property(e => e.UniformCheckNotes).HasMaxLength(2000);
        entity.Property(e => e.CampusCleanlinessNotes).HasMaxLength(2000);
        entity.Property(e => e.TeachersInClassesNotes).HasMaxLength(2000);
        entity.Property(e => e.CreatedAtUtc).HasColumnType("datetime2(3)");
        entity.Property(e => e.UpdatedAtUtc).HasColumnType("datetime2(3)");
        entity.Property(e => e.RowVersion)
            .IsRowVersion()
            .HasColumnName("RowVersion");

        entity.HasIndex(e => e.ReportDate).HasDatabaseName("IX_CoordDailyReport_ReportDate");
        entity.HasIndex(e => e.CoordinatorEmployeeId).HasDatabaseName("IX_CoordDailyReport_Coordinator");
        entity.HasIndex(e => new { e.CoordinatorEmployeeId, e.ReportDate })
            .IsUnique()
            .HasDatabaseName("UQ_CoordDailyReport_Coordinator_Date");

        entity.HasOne(e => e.Coordinator)
            .WithMany()
            .HasForeignKey(e => e.CoordinatorEmployeeId)
            .OnDelete(DeleteBehavior.Restrict);

        entity.HasMany(e => e.ModDuties)
            .WithOne(e => e.DailyReport)
            .HasForeignKey(e => e.CoordinatorDailyReportId)
            .OnDelete(DeleteBehavior.Cascade);

        entity.HasMany(e => e.AbsentTeachers)
            .WithOne(e => e.DailyReport)
            .HasForeignKey(e => e.CoordinatorDailyReportId)
            .OnDelete(DeleteBehavior.Cascade);

        entity.HasMany(e => e.WorkingReportLines)
            .WithOne(e => e.DailyReport)
            .HasForeignKey(e => e.CoordinatorDailyReportId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

public class CoordinatorModDutyConfiguration : IEntityTypeConfiguration<CoordinatorModDuty>
{
    public void Configure(EntityTypeBuilder<CoordinatorModDuty> entity)
    {
        entity.ToTable("tblCoordinatorModDuty");
        entity.HasKey(e => e.Id);
        entity.Property(e => e.Id).HasColumnName("ID");
        entity.Property(e => e.CoordinatorDailyReportId).HasColumnName("CoordinatorDailyReportID");
        entity.Property(e => e.DutyScope).HasMaxLength(50);
        entity.Property(e => e.DutyScopeOtherLabel).HasMaxLength(100);
        entity.Property(e => e.OnDutyEmployeeId).HasColumnName("OnDutyEmployeeID");
        entity.Property(e => e.Notes).HasMaxLength(500);
        entity.Property(e => e.CreatedAtUtc).HasColumnType("datetime2(3)");

        entity.HasIndex(e => e.CoordinatorDailyReportId).HasDatabaseName("IX_CoordModDuty_DailyReport");
        entity.HasIndex(e => e.OnDutyEmployeeId).HasDatabaseName("IX_CoordModDuty_OnDutyEmployee");

        entity.HasOne(e => e.OnDutyEmployee)
            .WithMany()
            .HasForeignKey(e => e.OnDutyEmployeeId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}

public class CoordinatorDailyAbsentTeacherConfiguration : IEntityTypeConfiguration<CoordinatorDailyAbsentTeacher>
{
    public void Configure(EntityTypeBuilder<CoordinatorDailyAbsentTeacher> entity)
    {
        entity.ToTable("tblCoordinatorDailyAbsentTeacher");
        entity.HasKey(e => e.Id);
        entity.Property(e => e.Id).HasColumnName("ID");
        entity.Property(e => e.CoordinatorDailyReportId).HasColumnName("CoordinatorDailyReportID");
        entity.Property(e => e.EmployeeId).HasColumnName("EmployeeID");
        entity.Property(e => e.Notes).HasMaxLength(500);
        entity.Property(e => e.CreatedAtUtc).HasColumnType("datetime2(3)");

        entity.HasIndex(e => e.CoordinatorDailyReportId).HasDatabaseName("IX_CoordAbsentTeacher_DailyReport");
        entity.HasIndex(e => e.EmployeeId).HasDatabaseName("IX_CoordAbsentTeacher_Employee");
        entity.HasIndex(e => new { e.CoordinatorDailyReportId, e.EmployeeId })
            .IsUnique()
            .HasDatabaseName("UQ_CoordAbsentTeacher_Report_Employee");

        entity.HasOne(e => e.Employee)
            .WithMany()
            .HasForeignKey(e => e.EmployeeId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}

public class CoordinatorWorkingReportLineConfiguration : IEntityTypeConfiguration<CoordinatorWorkingReportLine>
{
    public void Configure(EntityTypeBuilder<CoordinatorWorkingReportLine> entity)
    {
        entity.ToTable("tblCoordinatorWorkingReportLine");
        entity.HasKey(e => e.Id);
        entity.Property(e => e.Id).HasColumnName("ID");
        entity.Property(e => e.CoordinatorDailyReportId).HasColumnName("CoordinatorDailyReportID");
        entity.Property(e => e.LineOrder);
        entity.Property(e => e.ActivityDescription);
        entity.Property(e => e.CreatedAtUtc).HasColumnType("datetime2(3)");

        entity.HasIndex(e => new { e.CoordinatorDailyReportId, e.LineOrder })
            .HasDatabaseName("IX_CoordWorkingLine_DailyReport_Order");
    }
}
