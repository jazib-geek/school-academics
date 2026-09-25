using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using School.Infrastructure.Entities;

namespace School.Infrastructure.Data.Configurations;

public class StudentLeaveApplicationConfiguration : IEntityTypeConfiguration<StudentLeaveApplication>
{
    public void Configure(EntityTypeBuilder<StudentLeaveApplication> entity)
    {
        entity.ToTable("tblStudentLeaveApplication", "dbo");
        entity.HasKey(e => e.Id);

        entity.Property(e => e.ReasonCode).HasMaxLength(40).IsRequired();
        entity.Property(e => e.ReasonDetails).HasMaxLength(500);
        entity.Property(e => e.Status).HasMaxLength(20).IsRequired();
        entity.Property(e => e.ReviewedByUserKey).HasMaxLength(100);
        entity.Property(e => e.ReviewNote).HasMaxLength(500);
        entity.Property(e => e.SubmittedAtPkt).HasColumnType("datetime2(3)");
        entity.Property(e => e.ReviewedAtPkt).HasColumnType("datetime2(3)");

        entity.HasIndex(e => new { e.Status, e.LeaveDate })
            .HasDatabaseName("IX_StudentLeaveApplication_Status_LeaveDate");

        entity.HasIndex(e => new { e.StudentId, e.LeaveDate })
            .HasDatabaseName("IX_StudentLeaveApplication_Student_LeaveDate");

        entity.HasOne(e => e.Student)
            .WithMany()
            .HasForeignKey(e => e.StudentId)
            .HasPrincipalKey(s => s.Reg_Id)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
