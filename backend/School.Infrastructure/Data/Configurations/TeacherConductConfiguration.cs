using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using School.Infrastructure.Entities;

namespace School.Infrastructure.Data.Configurations;

public class TeacherConductTypeConfiguration : IEntityTypeConfiguration<TeacherConductType>
{
    public void Configure(EntityTypeBuilder<TeacherConductType> entity)
    {
        entity.ToTable("tblTeacherConductType", "dbo");
        entity.HasKey(e => e.Id);
        entity.Property(e => e.Name).HasMaxLength(80).IsRequired();
        entity.Property(e => e.IsSystem).IsRequired();
        entity.Property(e => e.IsActive).IsRequired().HasDefaultValue(true);
        entity.HasIndex(e => e.Name).IsUnique().HasDatabaseName("UQ_TeacherConductType_Name");
        entity.HasData(TeacherConductCatalog.Types);
    }
}

public class TeacherConductTagConfiguration : IEntityTypeConfiguration<TeacherConductTag>
{
    public void Configure(EntityTypeBuilder<TeacherConductTag> entity)
    {
        entity.ToTable("tblTeacherConductTag", "dbo");
        entity.HasKey(e => e.Id);
        entity.Property(e => e.Name).HasMaxLength(80).IsRequired();
        entity.Property(e => e.IsSystem).IsRequired();
        entity.Property(e => e.IsGood).IsRequired();
        entity.Property(e => e.IsActive).IsRequired().HasDefaultValue(true);

        entity.HasIndex(e => new { e.ConductTypeId, e.Name })
            .IsUnique()
            .HasDatabaseName("UQ_TeacherConductTag_Type_Name");

        entity.HasOne(e => e.ConductType)
            .WithMany(e => e.Tags)
            .HasForeignKey(e => e.ConductTypeId)
            .OnDelete(DeleteBehavior.Restrict);

        entity.HasData(TeacherConductCatalog.Tags);
    }
}

public class TeacherConductNoteConfiguration : IEntityTypeConfiguration<TeacherConductNote>
{
    public void Configure(EntityTypeBuilder<TeacherConductNote> entity)
    {
        entity.ToTable("tblTeacherConductNote", "dbo");
        entity.HasKey(e => e.Id);
        entity.Property(e => e.NoteDate).HasColumnType("date").IsRequired();
        entity.Property(e => e.Remarks).HasMaxLength(500);
        entity.Property(e => e.RecordedByName).HasMaxLength(150);
        entity.Property(e => e.CreatedAtPkt).HasColumnType("datetime2(3)").IsRequired();
        entity.Property(e => e.UpdatedAtPkt).HasColumnType("datetime2(3)");

        entity.HasIndex(e => new { e.SubjectEmployeeId, e.NoteDate, e.ConductTypeId })
            .IsUnique()
            .HasDatabaseName("UQ_TeacherConductNote_Employee_Date_Type");
        entity.HasIndex(e => new { e.SubjectEmployeeId, e.NoteDate })
            .HasDatabaseName("IX_TeacherConductNote_Employee_Date");

        entity.HasOne(e => e.SubjectEmployee)
            .WithMany()
            .HasForeignKey(e => e.SubjectEmployeeId)
            .HasPrincipalKey(s => s.ID)
            .OnDelete(DeleteBehavior.Restrict);

        entity.HasOne(e => e.ConductType)
            .WithMany(e => e.Notes)
            .HasForeignKey(e => e.ConductTypeId)
            .OnDelete(DeleteBehavior.Restrict);

        entity.HasOne(e => e.RecordedByEmployee)
            .WithMany()
            .HasForeignKey(e => e.RecordedByEmployeeId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}

public class TeacherConductNoteTagConfiguration : IEntityTypeConfiguration<TeacherConductNoteTag>
{
    public void Configure(EntityTypeBuilder<TeacherConductNoteTag> entity)
    {
        entity.ToTable("tblTeacherConductNoteTag", "dbo");
        entity.HasKey(e => new { e.NoteId, e.TagId });

        entity.HasOne(e => e.Note)
            .WithMany(e => e.NoteTags)
            .HasForeignKey(e => e.NoteId)
            .OnDelete(DeleteBehavior.Cascade);

        entity.HasOne(e => e.Tag)
            .WithMany(e => e.NoteTags)
            .HasForeignKey(e => e.TagId)
            .OnDelete(DeleteBehavior.Restrict);

        entity.HasIndex(e => e.TagId).HasDatabaseName("IX_TeacherConductNoteTag_Tag");
    }
}
