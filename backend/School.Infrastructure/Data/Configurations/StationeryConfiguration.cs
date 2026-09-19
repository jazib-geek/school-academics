using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using School.Infrastructure.Entities;

namespace School.Infrastructure.Data.Configurations;

public class StationeryItemConfiguration : IEntityTypeConfiguration<StationeryItem>
{
    public void Configure(EntityTypeBuilder<StationeryItem> entity)
    {
        entity.ToTable("tblStationeryItem", "dbo");
        entity.HasKey(e => e.ID);
        entity.Property(e => e.Name).HasMaxLength(120).IsRequired();
        entity.Property(e => e.Category).HasMaxLength(50).IsRequired();
        entity.Property(e => e.Unit).HasMaxLength(20).IsRequired().HasDefaultValue("pcs");
        entity.Property(e => e.IsActive).HasDefaultValue(true);
        entity.HasIndex(e => e.Name).HasDatabaseName("IX_StationeryItem_Name");
        entity.HasIndex(e => e.Category).HasDatabaseName("IX_StationeryItem_Category");
    }
}

public class StationeryPurchaseConfiguration : IEntityTypeConfiguration<StationeryPurchase>
{
    public void Configure(EntityTypeBuilder<StationeryPurchase> entity)
    {
        entity.ToTable("tblStationeryPurchase", "dbo");
        entity.HasKey(e => e.ID);
        entity.Property(e => e.PurchaseDate).HasColumnType("date");
        entity.Property(e => e.Notes).HasMaxLength(500);
        entity.Property(e => e.TotalAmount).HasColumnType("decimal(18,2)");
        entity.Property(e => e.PostedToAccounts).HasDefaultValue(false);
        entity.Property(e => e.VoucherNo).HasMaxLength(50);
        entity.Property(e => e.ExpenseAccountId).HasMaxLength(50);
        entity.Property(e => e.EntryUser).HasMaxLength(50);
        entity.Property(e => e.CreatedAtPkt).HasColumnType("datetime2(3)");
        entity.HasIndex(e => e.PurchaseDate).HasDatabaseName("IX_StationeryPurchase_Date");
        entity.HasMany(e => e.Lines)
            .WithOne(e => e.Purchase)
            .HasForeignKey(e => e.PurchaseID)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

public class StationeryPurchaseLineConfiguration : IEntityTypeConfiguration<StationeryPurchaseLine>
{
    public void Configure(EntityTypeBuilder<StationeryPurchaseLine> entity)
    {
        entity.ToTable("tblStationeryPurchaseLine", "dbo");
        entity.HasKey(e => e.ID);
        entity.Property(e => e.Quantity).HasColumnType("decimal(18,2)");
        entity.Property(e => e.UnitPrice).HasColumnType("decimal(18,2)");
        entity.Property(e => e.LineTotal).HasColumnType("decimal(18,2)");
        entity.HasIndex(e => e.PurchaseID).HasDatabaseName("IX_StationeryPurchaseLine_Purchase");
        entity.HasIndex(e => e.ItemID).HasDatabaseName("IX_StationeryPurchaseLine_Item");
        entity.HasOne(e => e.Item)
            .WithMany(e => e.PurchaseLines)
            .HasForeignKey(e => e.ItemID)
            .OnDelete(DeleteBehavior.Restrict);
    }
}

public class StationeryHandoverConfiguration : IEntityTypeConfiguration<StationeryHandover>
{
    public void Configure(EntityTypeBuilder<StationeryHandover> entity)
    {
        entity.ToTable("tblStationeryHandover", "dbo");
        entity.HasKey(e => e.ID);
        entity.Property(e => e.HandoverDate).HasColumnType("date");
        entity.Property(e => e.Notes).HasMaxLength(500);
        entity.Property(e => e.EntryUser).HasMaxLength(50);
        entity.Property(e => e.CreatedAtPkt).HasColumnType("datetime2(3)");
        entity.HasIndex(e => e.HandoverDate).HasDatabaseName("IX_StationeryHandover_Date");
        entity.HasIndex(e => e.EmployeeID).HasDatabaseName("IX_StationeryHandover_Employee");
        entity.HasOne(e => e.Employee)
            .WithMany()
            .HasForeignKey(e => e.EmployeeID)
            .OnDelete(DeleteBehavior.Restrict);
        entity.HasMany(e => e.Lines)
            .WithOne(e => e.Handover)
            .HasForeignKey(e => e.HandoverID)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

public class StationeryHandoverLineConfiguration : IEntityTypeConfiguration<StationeryHandoverLine>
{
    public void Configure(EntityTypeBuilder<StationeryHandoverLine> entity)
    {
        entity.ToTable("tblStationeryHandoverLine", "dbo");
        entity.HasKey(e => e.ID);
        entity.Property(e => e.Quantity).HasColumnType("decimal(18,2)");
        entity.HasIndex(e => e.HandoverID).HasDatabaseName("IX_StationeryHandoverLine_Handover");
        entity.HasIndex(e => e.ItemID).HasDatabaseName("IX_StationeryHandoverLine_Item");
        entity.HasOne(e => e.Item)
            .WithMany(e => e.HandoverLines)
            .HasForeignKey(e => e.ItemID)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
