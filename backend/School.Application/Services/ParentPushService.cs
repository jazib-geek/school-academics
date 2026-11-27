using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using School.Application.Common;
using School.Application.Interfaces;
using School.Infrastructure.Data;
using School.Infrastructure.Entities;
using School.Infrastructure.Repositories;

namespace School.Application.Services;

public class ParentPushService(AppDbContext db, IOptions<ParentPushOptions> options)
{
    public async Task RegisterAsync(int familyDbId, int familyId, Guid installationId,
        string token, CancellationToken ct)
    {
        if (installationId == Guid.Empty || string.IsNullOrWhiteSpace(token) || token.Length > 4096)
            throw new ArgumentException("A valid installation ID and FCM token are required.");
        if (!await db.StudentFamilyDetails.AnyAsync(f => f.ID == familyDbId && f.FamilyID == familyId
                && f.IsActive == true, ct)
            || !await db.Students.AnyAsync(s => s.Family_Code == familyId && s.IsActive == true, ct))
            throw new UnauthorizedAccessException("An active family and student are required.");

        token = token.Trim();
        var hash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(token)));
        var rows = await db.Set<ParentPushDevice>()
            .Where(d => d.InstallationId == installationId || d.TokenHash == hash).ToListAsync(ct);
        var row = rows.FirstOrDefault(d => d.InstallationId == installationId);
        // One owner per token in a campus; old queued deliveries are invalidated.
        foreach (var other in rows.Where(d => d != row))
        {
            other.IsActive = false;
            other.TokenHash = "retired-" + Guid.NewGuid().ToString("N");
            other.RegistrationVersion = Guid.NewGuid();
        }
        if (row == null)
        {
            row = new ParentPushDevice { InstallationId = installationId };
            db.Add(row);
        }
        if (row.FamilyDbId != familyDbId || row.Token != token || !row.IsActive)
            row.RegistrationVersion = Guid.NewGuid();
        row.FamilyDbId = familyDbId;
        row.Token = token;
        row.TokenHash = hash;
        row.IsActive = true;
        row.UpdatedAtUtc = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
    }

    public async Task UnregisterAsync(int familyDbId, Guid installationId, CancellationToken ct)
    {
        var row = await db.Set<ParentPushDevice>().SingleOrDefaultAsync(
            d => d.InstallationId == installationId && d.FamilyDbId == familyDbId, ct);
        if (row == null) return;
        row.IsActive = false;
        row.RegistrationVersion = Guid.NewGuid();
        row.UpdatedAtUtc = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
    }

    public static bool IsHomeAnnouncement(NewsAndEvent row) =>
        row.IsActive == true && row.ShowOnHome == true
        && string.Equals(row.Type, "Announcement", StringComparison.OrdinalIgnoreCase);

    // Called before the announcement SaveChanges, so publication + queue commit atomically.
    public async Task QueueFirstPublicationAsync(NewsAndEvent row, CancellationToken ct)
    {
        if (!options.Value.Enabled || !IsHomeAnnouncement(row)) return;
        if (row.ID != 0 && await db.Set<ParentAnnouncementPush>().AnyAsync(p => p.AnnouncementId == row.ID, ct))
            return;
        var now = DateTime.UtcNow;
        var devices = await db.Set<ParentPushDevice>().AsNoTracking()
            .Where(d => d.IsActive && db.StudentFamilyDetails.Any(f => f.ID == d.FamilyDbId
                && f.IsActive == true && db.Students.Any(s => s.Family_Code == f.FamilyID && s.IsActive == true)))
            .Select(d => new { d.Id, d.RegistrationVersion }).ToListAsync(ct);
        db.Add(new ParentAnnouncementPush
        {
            Announcement = row,
            Title = (row.Title ?? "School announcement")[..Math.Min(row.Title?.Length ?? 19, 150)],
            CreatedAtUtc = now,
            Deliveries = devices.Select(d => new ParentPushDelivery
            {
                DeviceId = d.Id, RegistrationVersion = d.RegistrationVersion, NextAttemptUtc = now
            }).ToList()
        });
    }

    // Call once for a complete first upload, before saving its 1-2 image rows.
    public async Task QueueDiaryPublicationAsync(int classId, DateOnly date, string className, CancellationToken ct)
    {
        if (!options.Value.Enabled || classId <= 0) return;
        if (await db.Set<ParentAnnouncementPush>().AnyAsync(p => p.DiaryClassId == classId && p.DiaryDate == date, ct))
            return;
        var students = ClassDiaryAudience.ActiveStudentsForClass(db, classId);
        var recipients = await (
            from device in db.Set<ParentPushDevice>().AsNoTracking()
            join family in db.StudentFamilyDetails on device.FamilyDbId equals family.ID
            where device.IsActive && family.IsActive == true
            let studentId = students.Where(s => s.Family_Code == family.FamilyID).Min(s => (int?)s.Reg_Id)
            where studentId != null
            select new { device.Id, device.RegistrationVersion, StudentId = studentId }
        ).ToListAsync(ct);
        var now = DateTime.UtcNow;
        var title = $"New diary: {className}";
        db.Add(new ParentAnnouncementPush
        {
            DiaryClassId = classId, DiaryDate = date,
            Title = title[..Math.Min(title.Length, 150)], CreatedAtUtc = now,
            Deliveries = recipients.Select(d => new ParentPushDelivery
            {
                DeviceId = d.Id, RegistrationVersion = d.RegistrationVersion,
                StudentId = d.StudentId, NextAttemptUtc = now
            }).ToList()
        });
    }
}
