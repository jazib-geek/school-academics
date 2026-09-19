using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using School.Infrastructure.Entities;

namespace School.Infrastructure.Data.Configurations;

public class DayClosingConfiguration : IEntityTypeConfiguration<DayClosing>
{
    public void Configure(EntityTypeBuilder<DayClosing> entity)
    {
        entity.ToTable("DayClosing", "dbo");
        entity.HasKey(e => e.Id);

        entity.Property(e => e.ClosingDate).HasColumnType("date").IsRequired();
        entity.Property(e => e.TotalCashCollected).HasColumnType("decimal(18, 2)").IsRequired();
        entity.Property(e => e.TotalExpenses).HasColumnType("decimal(18, 2)").IsRequired();
        entity.Property(e => e.RemainingCash).HasColumnType("decimal(18, 2)").IsRequired();
        entity.Property(e => e.Narration).HasMaxLength(500);
        entity.Property(e => e.EntryUser).HasMaxLength(50);
        entity.Property(e => e.CreatedAtPkt).HasColumnType("datetime2(3)").IsRequired();
        entity.Property(e => e.UpdatedAtPkt).HasColumnType("datetime2(3)");

        entity.HasIndex(e => e.ClosingDate)
            .IsUnique()
            .HasDatabaseName("UQ_DayClosing_ClosingDate");
    }
}
