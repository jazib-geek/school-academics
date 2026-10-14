using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using School.Infrastructure.Entities;

namespace School.Infrastructure.Data.Configurations;

public class StudentShortLeaveConfiguration : IEntityTypeConfiguration<StudentShortLeave>
{
    public void Configure(EntityTypeBuilder<StudentShortLeave> entity)
    {
        entity.ToTable("tblStudentShortLeave", "dbo");
        entity.HasKey(e => e.Id);

        entity.Property(e => e.PickupPersonName).HasMaxLength(120).IsRequired();
        entity.Property(e => e.PickupRelation).HasMaxLength(20).IsRequired();
        entity.Property(e => e.Reason).HasMaxLength(500).IsRequired();
        entity.Property(e => e.PhoneConfirmedWith).HasMaxLength(120);
        entity.Property(e => e.ApprovedByUserName).HasMaxLength(100).IsRequired();
        entity.Property(e => e.CreatedAtPkt).HasColumnType("datetime2(3)");

        entity.HasIndex(e => e.LeaveDate)
            .HasDatabaseName("IX_StudentShortLeave_LeaveDate");
    }
}

public class StudentShortLeaveStudentConfiguration : IEntityTypeConfiguration<StudentShortLeaveStudent>
{
    public void Configure(EntityTypeBuilder<StudentShortLeaveStudent> entity)
    {
        entity.ToTable("tblStudentShortLeaveStudent", "dbo");
        entity.HasKey(e => e.Id);

        entity.HasIndex(e => new { e.StudentId, e.LeaveDate })
            .IsUnique()
            .HasDatabaseName("IX_StudentShortLeaveStudent_Student_LeaveDate");

        entity.HasOne(e => e.ShortLeave)
            .WithMany(e => e.Students)
            .HasForeignKey(e => e.ShortLeaveId)
            .OnDelete(DeleteBehavior.Cascade);

        entity.HasOne(e => e.Student)
            .WithMany()
            .HasForeignKey(e => e.StudentId)
            .HasPrincipalKey(s => s.Reg_Id)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
