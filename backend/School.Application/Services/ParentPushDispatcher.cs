using Microsoft.EntityFrameworkCore;
using School.Application.Interfaces;
using School.Infrastructure.Data;
using School.Infrastructure.Repositories;

namespace School.Application.Services;

public class ParentPushDispatcher(AppDbContext db, IParentPushSender sender)
{
    // Each delivery is leased atomically so overlapping IIS workers cannot claim it together.
    public async Task<int> DispatchAsync(string campus, CancellationToken ct)
    {
        var now = DateTime.UtcNow;
        var ids = await db.Set<School.Infrastructure.Entities.ParentPushDelivery>().AsNoTracking()
            .Where(d => d.CompletedAtUtc == null && d.NextAttemptUtc <= now
                && (d.LeaseUntilUtc == null || d.LeaseUntilUtc < now))
            .OrderBy(d => d.Id).Select(d => d.Id).Take(50).ToListAsync(ct);
        foreach (var id in ids)
        {
            var leaseId = Guid.NewGuid();
            var claimed = await db.Set<School.Infrastructure.Entities.ParentPushDelivery>()
                .Where(d => d.Id == id && d.CompletedAtUtc == null
                    && (d.LeaseUntilUtc == null || d.LeaseUntilUtc < now))
                .ExecuteUpdateAsync(s => s.SetProperty(d => d.LeaseId, leaseId)
                    .SetProperty(d => d.LeaseUntilUtc, now.AddMinutes(5)), ct);
            if (claimed == 0) continue;
            var delivery = await db.Set<School.Infrastructure.Entities.ParentPushDelivery>()
                .AsNoTracking()
                .Include(d => d.Device).Include(d => d.Push).ThenInclude(p => p.Announcement)
                .SingleAsync(d => d.Id == id, ct);
            var device = delivery.Device;
            var familyActive = await db.StudentFamilyDetails.AnyAsync(f => f.ID == device.FamilyDbId
                && f.IsActive != false && db.Students.Any(s => s.Family_Code == f.FamilyID && s.IsActive == true), ct);
            var expired = delivery.Push.CreatedAtUtc < now.AddDays(-1);
            var isDiary = delivery.Push.DiaryClassId != null;
            if (isDiary)
            {
                // A sibling chosen when queuing may have transferred since then.
                // Resolve an active matching child again rather than notifying for
                // the old child or dropping a family that still has an eligible sibling.
                delivery.StudentId = await (
                    from student in ClassDiaryAudience.ActiveStudentsForClass(db, delivery.Push.DiaryClassId!.Value)
                    join family in db.StudentFamilyDetails on student.Family_Code equals family.FamilyID
                    where family.ID == device.FamilyDbId && family.IsActive != false
                    select (int?)student.Reg_Id).MinAsync(ct);
            }
            var contentAvailable = isDiary
                ? await db.ClassDiaries.AnyAsync(d => d.ClassID == delivery.Push.DiaryClassId
                    && d.Date == delivery.Push.DiaryDate && d.ImgURL != null && d.ImgURL != "", ct)
                    && delivery.StudentId != null
                : delivery.Push.Announcement != null && ParentPushService.IsHomeAnnouncement(delivery.Push.Announcement);
            if (expired || !device.IsActive || device.RegistrationVersion != delivery.RegistrationVersion
                || !familyActive || !contentAvailable)
            {
                delivery.Outcome = "skipped";
                delivery.CompletedAtUtc = DateTime.UtcNow;
            }
            else
            {
                var result = isDiary
                    ? await sender.SendDiaryAsync(device.Token, delivery.Push.Title, campus,
                        delivery.Push.DiaryClassId!.Value, delivery.Push.DiaryDate!.Value,
                        delivery.StudentId!.Value, device.FamilyDbId, ct)
                    : await sender.SendAsync(device.Token, delivery.Push.Title, campus,
                        delivery.Push.AnnouncementId!.Value, ct);
                delivery.Attempts++;
                delivery.Outcome = result.ToString();
                if (result != ParentPushSendResult.Retry || delivery.Attempts >= 8)
                    delivery.CompletedAtUtc = DateTime.UtcNow;
                else
                    delivery.NextAttemptUtc = DateTime.UtcNow.AddSeconds(Math.Min(3600, 30 * Math.Pow(2, delivery.Attempts)));
                if (result == ParentPushSendResult.InvalidToken)
                {
                    // Don't deactivate a token refreshed while this send was in flight.
                    await db.Set<School.Infrastructure.Entities.ParentPushDevice>()
                        .Where(d => d.Id == device.Id && d.RegistrationVersion == delivery.RegistrationVersion)
                        .ExecuteUpdateAsync(s => s.SetProperty(d => d.IsActive, false), ct);
                }
            }
            // Persist explicitly: a delivery previously tracked before the SQL claim
            // must not leave its lease set because EF saw null -> null in memory.
            await db.Set<School.Infrastructure.Entities.ParentPushDelivery>()
                .Where(d => d.Id == id && d.LeaseId == leaseId)
                .ExecuteUpdateAsync(s => s
                    .SetProperty(d => d.Attempts, delivery.Attempts)
                    .SetProperty(d => d.StudentId, delivery.StudentId)
                    .SetProperty(d => d.Outcome, delivery.Outcome)
                    .SetProperty(d => d.CompletedAtUtc, delivery.CompletedAtUtc)
                    .SetProperty(d => d.NextAttemptUtc, delivery.NextAttemptUtc)
                    .SetProperty(d => d.LeaseUntilUtc, (DateTime?)null)
                    .SetProperty(d => d.LeaseId, (Guid?)null), ct);
            db.ChangeTracker.Clear();
        }
        return ids.Count;
    }
}
