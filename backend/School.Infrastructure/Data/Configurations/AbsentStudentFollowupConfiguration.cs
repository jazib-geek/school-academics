using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using School.Infrastructure.Entities;

namespace School.Infrastructure.Data.Configurations;

public class AbsentFollowupReasonConfiguration : IEntityTypeConfiguration<AbsentFollowupReason>
{
    public void Configure(EntityTypeBuilder<AbsentFollowupReason> entity)
    {
        entity.ToTable("tblAbsentFollowupReason", "dbo");
        entity.HasKey(e => e.Id);
        entity.Property(e => e.Name).HasMaxLength(80).IsRequired();
        entity.Property(e => e.IsSystem).IsRequired();
        entity.Property(e => e.IsActive).IsRequired().HasDefaultValue(true);

        entity.HasIndex(e => e.Name)
            .IsUnique()
            .HasDatabaseName("UQ_AbsentFollowupReason_Name");

        entity.HasData(AbsentFollowupReasonCatalog.Reasons);
    }
}

public class AbsentStudentFollowupConfiguration : IEntityTypeConfiguration<AbsentStudentFollowup>
{
    public void Configure(EntityTypeBuilder<AbsentStudentFollowup> entity)
    {
        entity.ToTable("tblAbsentStudentFollowup", "dbo");
        entity.HasKey(e => e.Id);
        entity.Property(e => e.AttendanceDate).HasColumnType("date").IsRequired();
        entity.Property(e => e.Description).HasMaxLength(1000);
        entity.Property(e => e.UpdatedAtPkt).HasColumnType("datetime2(3)").IsRequired();
        entity.Property(e => e.UpdatedByName).HasMaxLength(150);

        entity.HasIndex(e => new { e.StudentId, e.AttendanceDate })
            .IsUnique()
            .HasDatabaseName("UQ_AbsentStudentFollowup_Student_Date");

        entity.HasIndex(e => e.AttendanceDate)
            .HasDatabaseName("IX_AbsentStudentFollowup_AttendanceDate");

        entity.HasIndex(e => e.ReasonId)
            .HasDatabaseName("IX_AbsentStudentFollowup_ReasonId");

        entity.HasOne(e => e.Student)
            .WithMany()
            .HasForeignKey(e => e.StudentId)
            .HasPrincipalKey(s => s.Reg_Id)
            .OnDelete(DeleteBehavior.Restrict);

        entity.HasOne(e => e.Reason)
            .WithMany(r => r.Followups)
            .HasForeignKey(e => e.ReasonId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
