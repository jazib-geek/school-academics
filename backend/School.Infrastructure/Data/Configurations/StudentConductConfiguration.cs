using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using School.Infrastructure.Entities;

namespace School.Infrastructure.Data.Configurations;

public class StudentConductTypeConfiguration : IEntityTypeConfiguration<StudentConductType>
{
    public void Configure(EntityTypeBuilder<StudentConductType> entity)
    {
        entity.ToTable("tblStudentConductType", "dbo");
        entity.HasKey(e => e.Id);
        entity.Property(e => e.Name).HasMaxLength(80).IsRequired();
        entity.Property(e => e.IsSystem).IsRequired();
        entity.Property(e => e.IsActive).IsRequired().HasDefaultValue(true);
        entity.HasIndex(e => e.Name).IsUnique().HasDatabaseName("UQ_StudentConductType_Name");
        entity.HasData(StudentConductCatalog.Types);
    }
}

public class StudentConductTagConfiguration : IEntityTypeConfiguration<StudentConductTag>
{
    public void Configure(EntityTypeBuilder<StudentConductTag> entity)
    {
        entity.ToTable("tblStudentConductTag", "dbo");
        entity.HasKey(e => e.Id);
        entity.Property(e => e.Name).HasMaxLength(80).IsRequired();
        entity.Property(e => e.IsSystem).IsRequired();
        entity.Property(e => e.IsGood).IsRequired();
        entity.Property(e => e.IsActive).IsRequired().HasDefaultValue(true);

        entity.HasIndex(e => new { e.ConductTypeId, e.Name })
            .IsUnique()
            .HasDatabaseName("UQ_StudentConductTag_Type_Name");

        entity.HasOne(e => e.ConductType)
            .WithMany(e => e.Tags)
            .HasForeignKey(e => e.ConductTypeId)
            .OnDelete(DeleteBehavior.Restrict);

        entity.HasData(StudentConductCatalog.Tags);
    }
}

public class StudentConductNoteConfiguration : IEntityTypeConfiguration<StudentConductNote>
{
    public void Configure(EntityTypeBuilder<StudentConductNote> entity)
    {
        entity.ToTable("tblStudentConductNote", "dbo");
        entity.HasKey(e => e.Id);
        entity.Property(e => e.NoteDate).HasColumnType("date").IsRequired();
        entity.Property(e => e.Remarks).HasMaxLength(500);
        entity.Property(e => e.RecordedByName).HasMaxLength(150);
        entity.Property(e => e.CreatedAtPkt).HasColumnType("datetime2(3)").IsRequired();
        entity.Property(e => e.UpdatedAtPkt).HasColumnType("datetime2(3)");
        entity.Property(e => e.ParentAcknowledgedAtPkt).HasColumnType("datetime2(3)");

        entity.HasIndex(e => new { e.StudentId, e.NoteDate, e.ConductTypeId })
            .IsUnique()
            .HasDatabaseName("UQ_StudentConductNote_Student_Date_Type");
        entity.HasIndex(e => new { e.StudentId, e.NoteDate })
            .HasDatabaseName("IX_StudentConductNote_Student_Date");

        entity.HasOne(e => e.Student)
            .WithMany()
            .HasForeignKey(e => e.StudentId)
            .HasPrincipalKey(s => s.Reg_Id)
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

public class StudentConductNoteTagConfiguration : IEntityTypeConfiguration<StudentConductNoteTag>
{
    public void Configure(EntityTypeBuilder<StudentConductNoteTag> entity)
    {
        entity.ToTable("tblStudentConductNoteTag", "dbo");
        entity.HasKey(e => new { e.NoteId, e.TagId });

        entity.HasOne(e => e.Note)
            .WithMany(e => e.NoteTags)
            .HasForeignKey(e => e.NoteId)
            .OnDelete(DeleteBehavior.Cascade);

        entity.HasOne(e => e.Tag)
            .WithMany(e => e.NoteTags)
            .HasForeignKey(e => e.TagId)
            .OnDelete(DeleteBehavior.Restrict);

        entity.HasIndex(e => e.TagId).HasDatabaseName("IX_StudentConductNoteTag_Tag");
    }
}

public class StudentConductParentAckConfiguration : IEntityTypeConfiguration<StudentConductParentAck>
{
    public void Configure(EntityTypeBuilder<StudentConductParentAck> entity)
    {
        entity.ToTable("tblStudentConductParentAck", "dbo");
        entity.HasKey(e => e.Id);
        entity.Property(e => e.AcknowledgedAtPkt).HasColumnType("datetime2(3)").IsRequired();

        entity.HasIndex(e => new { e.FamilyDbId, e.NoteId })
            .IsUnique()
            .HasDatabaseName("UQ_StudentConductParentAck_Family_Note");

        entity.HasIndex(e => e.NoteId)
            .HasDatabaseName("IX_StudentConductParentAck_Note");

        entity.HasOne(e => e.Family)
            .WithMany()
            .HasForeignKey(e => e.FamilyDbId)
            .OnDelete(DeleteBehavior.Cascade);

        entity.HasOne(e => e.Note)
            .WithMany()
            .HasForeignKey(e => e.NoteId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
