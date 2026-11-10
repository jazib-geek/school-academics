using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using School.Infrastructure.Entities;

namespace School.Infrastructure.Data.Configurations;

public class DisciplineRoundConfiguration : IEntityTypeConfiguration<DisciplineRound>
{
    public void Configure(EntityTypeBuilder<DisciplineRound> entity)
    {
        entity.ToTable("tblDisciplineRound", "dbo");
        entity.HasKey(e => e.Id);
        entity.Property(e => e.Code).HasMaxLength(40).IsRequired();
        entity.Property(e => e.Name).HasMaxLength(120).IsRequired();
        entity.Property(e => e.IsActive).IsRequired().HasDefaultValue(true);
        entity.HasIndex(e => e.Code).IsUnique().HasDatabaseName("UQ_DisciplineRound_Code");
        entity.HasData(DisciplineCatalog.Rounds);
    }
}

public class DisciplineDayRoundConfiguration : IEntityTypeConfiguration<DisciplineDayRound>
{
    public void Configure(EntityTypeBuilder<DisciplineDayRound> entity)
    {
        entity.ToTable("tblDisciplineDayRound", "dbo", t => t.HasCheckConstraint(
            "CK_DisciplineDayRound_Status",
            "[Status] IN ('Clear', 'Issue', 'Skipped')"));
        entity.HasKey(e => e.Id);
        entity.Property(e => e.RoundDate).HasColumnType("date").IsRequired();
        entity.Property(e => e.Status).HasMaxLength(20).IsRequired();
        entity.Property(e => e.Note).HasMaxLength(300);
        entity.Property(e => e.UpdatedAtPkt).HasColumnType("datetime2(3)").IsRequired();

        entity.HasIndex(e => new { e.EmployeeId, e.RoundDate, e.RoundId })
            .IsUnique()
            .HasDatabaseName("UQ_DisciplineDayRound_Employee_Date_Round");

        entity.HasOne(e => e.Employee)
            .WithMany()
            .HasForeignKey(e => e.EmployeeId)
            .OnDelete(DeleteBehavior.Restrict);

        entity.HasOne(e => e.Round)
            .WithMany()
            .HasForeignKey(e => e.RoundId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}

public class DisciplineFindingConfiguration : IEntityTypeConfiguration<DisciplineFinding>
{
    public void Configure(EntityTypeBuilder<DisciplineFinding> entity)
    {
        entity.ToTable("tblDisciplineFinding", "dbo", t => t.HasCheckConstraint(
            "CK_DisciplineFinding_Kind",
            "[Kind] IN ('Concern', 'Praise', 'Note')"));
        entity.HasKey(e => e.Id);
        entity.Property(e => e.FindingDate).HasColumnType("date").IsRequired();
        entity.Property(e => e.Kind).HasMaxLength(20).IsRequired();
        entity.Property(e => e.Place).HasMaxLength(80).IsRequired();
        entity.Property(e => e.WhatHappened).HasMaxLength(500).IsRequired();
        entity.Property(e => e.WhatWasDone).HasMaxLength(500);
        entity.Property(e => e.CreatedAtPkt).HasColumnType("datetime2(3)").IsRequired();
        entity.Property(e => e.UpdatedAtPkt).HasColumnType("datetime2(3)");

        entity.HasIndex(e => new { e.EmployeeId, e.FindingDate })
            .HasDatabaseName("IX_DisciplineFinding_Employee_Date");

        entity.HasOne(e => e.Employee)
            .WithMany()
            .HasForeignKey(e => e.EmployeeId)
            .OnDelete(DeleteBehavior.Restrict);

        entity.HasOne(e => e.Round)
            .WithMany()
            .HasForeignKey(e => e.RoundId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}

public class DisciplineFindingStudentConfiguration : IEntityTypeConfiguration<DisciplineFindingStudent>
{
    public void Configure(EntityTypeBuilder<DisciplineFindingStudent> entity)
    {
        entity.ToTable("tblDisciplineFindingStudent", "dbo");
        entity.HasKey(e => new { e.FindingId, e.StudentId });

        entity.HasOne(e => e.Finding)
            .WithMany(e => e.Students)
            .HasForeignKey(e => e.FindingId)
            .OnDelete(DeleteBehavior.Cascade);

        entity.HasOne(e => e.Student)
            .WithMany()
            .HasForeignKey(e => e.StudentId)
            .HasPrincipalKey(s => s.Reg_Id)
            .OnDelete(DeleteBehavior.Restrict);

        entity.HasOne(e => e.ConductNote)
            .WithMany()
            .HasForeignKey(e => e.ConductNoteId)
            .OnDelete(DeleteBehavior.SetNull);

        entity.HasIndex(e => e.StudentId).HasDatabaseName("IX_DisciplineFindingStudent_Student");
        entity.HasIndex(e => e.ConductNoteId).HasDatabaseName("IX_DisciplineFindingStudent_Note");
    }
}

public class DisciplineDayReportConfiguration : IEntityTypeConfiguration<DisciplineDayReport>
{
    public void Configure(EntityTypeBuilder<DisciplineDayReport> entity)
    {
        entity.ToTable("tblDisciplineDayReport", "dbo");
        entity.HasKey(e => e.Id);
        entity.Property(e => e.ReportDate).HasColumnType("date").IsRequired();
        entity.Property(e => e.WhatWasDone).HasMaxLength(1000).IsRequired();
        entity.Property(e => e.AnythingElse).HasMaxLength(1000);
        entity.Property(e => e.SubmittedAtPkt).HasColumnType("datetime2(3)").IsRequired();

        entity.HasIndex(e => new { e.EmployeeId, e.ReportDate })
            .IsUnique()
            .HasDatabaseName("UQ_DisciplineDayReport_Employee_Date");

        entity.HasOne(e => e.Employee)
            .WithMany()
            .HasForeignKey(e => e.EmployeeId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
