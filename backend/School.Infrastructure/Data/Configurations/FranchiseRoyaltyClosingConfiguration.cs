using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using School.Infrastructure.Entities;

namespace School.Infrastructure.Data.Configurations;

public class FranchiseRoyaltyClosingConfiguration : IEntityTypeConfiguration<FranchiseRoyaltyClosing>
{
    public void Configure(EntityTypeBuilder<FranchiseRoyaltyClosing> entity)
    {
        entity.ToTable("tblFranchiseRoyaltyClosing", "dbo");
        entity.HasKey(e => e.Id);

        entity.Property(e => e.TotalFeeCollected).HasColumnType("decimal(18, 2)").IsRequired();
        entity.Property(e => e.RoyaltySharePercent).HasColumnType("decimal(5, 2)").IsRequired();
        entity.Property(e => e.RoyaltyAmount).HasColumnType("decimal(18, 2)").IsRequired();
        entity.Property(e => e.ClosedAtPkt).HasColumnType("datetime2(3)").IsRequired();
        entity.Property(e => e.ClosedByUserName).HasMaxLength(100);
        entity.Property(e => e.VoucherNo).HasMaxLength(50);
        entity.Property(e => e.EntryUser).HasMaxLength(50);
        entity.Property(e => e.CreatedAtPkt).HasColumnType("datetime2(3)").IsRequired();

        entity.HasIndex(e => new { e.CalendarYear, e.CalendarMonth })
            .IsUnique()
            .HasDatabaseName("UQ_FranchiseRoyaltyClosing_YearMonth");
    }
}
