using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using School.Infrastructure.Entities;

namespace School.Infrastructure.Data.Configurations;

public class EmployeeAttendanceChangeRequestConfiguration : IEntityTypeConfiguration<EmployeeAttendanceChangeRequest>
{
    public void Configure(EntityTypeBuilder<EmployeeAttendanceChangeRequest> entity)
    {
        entity.ToTable("tblEmployeeAttendanceChangeRequest", "dbo");
        entity.HasKey(e => e.Id);

        entity.Property(e => e.ProposedCheckInTime).HasMaxLength(10);
        entity.Property(e => e.ProposedCheckOutTime).HasMaxLength(10);
        entity.Property(e => e.Reason).HasMaxLength(500).IsRequired();
        entity.Property(e => e.RequestKind).HasMaxLength(20).IsRequired();
        entity.Property(e => e.Status).HasMaxLength(20).IsRequired();
        entity.Property(e => e.SubmittedByUserKey).HasMaxLength(100).IsRequired();
        entity.Property(e => e.ReviewedByUserKey).HasMaxLength(100);
        entity.Property(e => e.ReviewNote).HasMaxLength(500);
        entity.Property(e => e.SubmittedAtPkt).HasColumnType("datetime2(3)");
        entity.Property(e => e.ReviewedAtPkt).HasColumnType("datetime2(3)");

        entity.HasIndex(e => new { e.Status, e.AttendanceDate })
            .HasDatabaseName("IX_EmployeeAttendanceChangeRequest_Status_AttendanceDate");

        entity.HasIndex(e => new { e.EmployeeAttendanceId, e.Status })
            .HasDatabaseName("IX_EmployeeAttendanceChangeRequest_Attendance_Status");

        entity.HasOne(e => e.EmployeeAttendance)
            .WithMany()
            .HasForeignKey(e => e.EmployeeAttendanceId)
            .HasPrincipalKey(a => a.ID)
            .IsRequired(false)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
