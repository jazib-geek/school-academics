using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using School.Infrastructure.Entities;

namespace School.Infrastructure.Data.Configurations;

public class StudentSecurityDepositEventConfiguration : IEntityTypeConfiguration<StudentSecurityDepositEvent>
{
    public void Configure(EntityTypeBuilder<StudentSecurityDepositEvent> entity)
    {
        entity.ToTable("tblStudentSecurityDepositEvent", "dbo");
        entity.HasKey(e => e.Id);
        entity.Property(e => e.EventType).HasMaxLength(32).IsRequired();
        entity.Property(e => e.Amount).HasColumnType("decimal(18, 2)");
        entity.Property(e => e.EventDatePkt).HasColumnType("datetime2");
        entity.Property(e => e.CreatedAtPkt).HasColumnType("datetime2");
        entity.Property(e => e.VoucherNo).HasMaxLength(20);
        entity.Property(e => e.EntryUser).HasMaxLength(50);
        entity.Property(e => e.Notes).HasMaxLength(500);

        entity.HasIndex(e => e.StudentId)
            .HasDatabaseName("IX_StudentSecurityDepositEvent_StudentId");

        entity.HasIndex(e => e.FeeLedgerRowId)
            .HasDatabaseName("IX_StudentSecurityDepositEvent_FeeLedgerRowId")
            .HasFilter("[FeeLedgerRowId] IS NOT NULL");
    }
}
