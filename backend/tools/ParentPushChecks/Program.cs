using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using School.API.Controllers;
using School.Application.Common;
using School.Application.DTOs;
using School.Application.Interfaces;
using School.Application.Services;
using School.Infrastructure.Data;
using School.Infrastructure.Entities;
using School.Infrastructure.Repositories;

// Entirely in-memory SQLite + fake sender: no production DBs, credentials, or FCM calls.
await using var connection = new SqliteConnection("Data Source=:memory:");
await connection.OpenAsync();
await using var db = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>().UseSqlite(connection).Options);
// The full campus model has SQL Server-specific types/defaults. Only create the
// existing columns touched by these checks plus the new push tables.
await db.Database.ExecuteSqlRawAsync("""
    CREATE TABLE tblStudentFamilyDetail (ID INTEGER PRIMARY KEY, FamilyID INTEGER, IsActive INTEGER);
    CREATE TABLE tblStudent (Reg_Id INTEGER PRIMARY KEY, Family_Code INTEGER, IsActive INTEGER,
      ClassCompositeID INTEGER, Class_ID INTEGER);
    CREATE TABLE tblSection (ID INTEGER PRIMARY KEY, Class_ID INTEGER);
    CREATE TABLE tblClassDiary (ID INTEGER PRIMARY KEY AUTOINCREMENT, ClassID INTEGER, Date TEXT,
      SubjectID INTEGER, Description TEXT, ImgURL TEXT, LastUpdatedBy TEXT, LastUpdatedAt TEXT);
    CREATE TABLE tblNewsAndEvents (ID INTEGER PRIMARY KEY AUTOINCREMENT, Date TEXT, Title TEXT,
      Type TEXT, Description TEXT, IsActive INTEGER, ShowOnHome INTEGER, ImagePath TEXT);
    CREATE TABLE ParentPushDevice (Id INTEGER PRIMARY KEY AUTOINCREMENT, InstallationId TEXT UNIQUE,
      FamilyDbId INTEGER, Token TEXT, TokenHash TEXT UNIQUE, RegistrationVersion TEXT, IsActive INTEGER, UpdatedAtUtc TEXT);
    CREATE TABLE ParentAnnouncementPush (Id INTEGER PRIMARY KEY AUTOINCREMENT, AnnouncementId INTEGER UNIQUE,
      DiaryClassId INTEGER, DiaryDate TEXT, Title TEXT, CreatedAtUtc TEXT, UNIQUE(DiaryClassId,DiaryDate));
    CREATE TABLE ParentPushDelivery (Id INTEGER PRIMARY KEY AUTOINCREMENT, PushId INTEGER, DeviceId INTEGER,
      RegistrationVersion TEXT, StudentId INTEGER, Attempts INTEGER, NextAttemptUtc TEXT, CompletedAtUtc TEXT,
      LeaseUntilUtc TEXT, LeaseId TEXT, Outcome TEXT, UNIQUE(PushId,DeviceId));
    INSERT INTO tblStudentFamilyDetail VALUES(1,101,NULL),(2,202,1),(3,303,0),(4,404,NULL);
    INSERT INTO tblSection VALUES(101,10),(102,10),(201,20);
    INSERT INTO tblStudent VALUES(1,101,1,101,999),(2,202,1,201,10),(3,303,1,101,10);
    """);
var ct = CancellationToken.None;
var push = new ParentPushService(db, Options.Create(new ParentPushOptions { Enabled = true }));
var news = new NewsAndEventService(db, push);
var controller = new ParentPushController(push, Options.Create(new ParentPushOptions { Enabled = true }));
controller.ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() };
controller.HttpContext.User = new ClaimsPrincipal(new ClaimsIdentity(new[] {
    new Claim("Campus", "dc"), new Claim("FamilyDbId", "1"), new Claim("FamilyID", "")
}, "test"));
Check(await controller.Register(new(Guid.NewGuid(), "fake-staff-token"), ct) is ForbidResult,
    "staff cannot register as a parent");
var install = Guid.NewGuid();
await push.RegisterAsync(1, 101, install, "fake-token-one", ct);
await push.RegisterAsync(1, 101, install, "fake-token-one", ct);
Check(await db.Set<ParentPushDevice>().CountAsync() == 1, "repeat registration is idempotent");
Pass("legacy NULL family status registers when the family has an active child");
try { await push.RegisterAsync(4, 404, Guid.NewGuid(), "no-active-child", ct); throw new Exception("Childless legacy family accepted"); }
catch (UnauthorizedAccessException) { Pass("legacy NULL family status still requires an active child"); }
try { await push.RegisterAsync(3, 303, Guid.NewGuid(), "inactive", ct); throw new Exception("Inactive family accepted"); }
catch (UnauthorizedAccessException) { Pass("inactive family rejected"); }
try { await push.RegisterAsync(1, 202, Guid.NewGuid(), "wrong-family", ct); throw new Exception("Family mismatch accepted"); }
catch (UnauthorizedAccessException) { Pass("family DB ID and family code must match"); }

var draft = await news.CreateAsync(Request("Draft", active: false), ct);
Check(await db.Set<ParentAnnouncementPush>().CountAsync() == 0, "draft does not queue");
var hidden = await news.CreateAsync(Request("Hidden", home: false), ct);
Check(await db.Set<ParentAnnouncementPush>().CountAsync() == 0, "non-home item does not queue");
await news.SetActiveAsync(draft.Id, true, ct);
Check(await db.Set<ParentAnnouncementPush>().CountAsync() == 1, "first home publication queues atomically");
await news.UpdateAsync(draft.Id, Request("Edited"), ct);
await news.SetActiveAsync(draft.Id, false, ct);
await news.SetActiveAsync(draft.Id, true, ct);
Check(await db.Set<ParentAnnouncementPush>().CountAsync() == 1, "edit/reactivation do not resend");

var sender = new FakeSender();
var dispatcher = new ParentPushDispatcher(db, sender);
await dispatcher.DispatchAsync("dc", ct);
Check(sender.Calls.Count == 1 && sender.Calls[0] == ("dc", draft.Id), "dispatch targets the supplied campus and announcement");
await dispatcher.DispatchAsync("dc", ct);
Check(sender.Calls.Count == 1, "completed deliveries do not resend");

await news.CreateAsync(Request("Queued before sign out"), ct);
await push.UnregisterAsync(1, install, ct);
await dispatcher.DispatchAsync("dc", ct);
Check(sender.Calls.Count == 1, "signed-out device skipped");
await push.RegisterAsync(1, 101, install, "fake-token-two", ct);
await news.CreateAsync(Request("Queued before account switch"), ct);
await push.RegisterAsync(2, 202, install, "fake-token-three", ct);
await dispatcher.DispatchAsync("dc", ct);
Check(sender.Calls.Count == 1, "registration-version mismatch skipped after account switch");

var expiredNews = await news.CreateAsync(Request("Old queued item"), ct);
var expiredPush = await db.Set<ParentAnnouncementPush>().SingleAsync(p => p.AnnouncementId == expiredNews.Id);
expiredPush.CreatedAtUtc = DateTime.UtcNow.AddDays(-2);
await db.SaveChangesAsync();
await dispatcher.DispatchAsync("dc", ct);
Check(sender.Calls.Count == 1, "expired queue entries skipped");

var hiddenAfterQueue = await news.CreateAsync(Request("Withdrawn announcement"), ct);
await news.UpdateAsync(hiddenAfterQueue.Id, Request("Withdrawn announcement", home: false), ct);
await dispatcher.DispatchAsync("dc", ct);
Check(sender.Calls.Count == 1, "withdrawn home announcement skipped before delivery");

var retryNews = await news.CreateAsync(Request("Retry me"), ct);
sender.Result = ParentPushSendResult.Retry;
await dispatcher.DispatchAsync("dc", ct);
var retry = await db.Set<ParentPushDelivery>().SingleAsync(d => d.Push.AnnouncementId == retryNews.Id);
Check(retry.CompletedAtUtc == null && retry.Attempts == 1 && retry.NextAttemptUtc > DateTime.UtcNow, "transient failure persisted with backoff");
retry.NextAttemptUtc = DateTime.UtcNow.AddSeconds(-1);
await db.SaveChangesAsync();
sender.Result = ParentPushSendResult.InvalidToken;
await dispatcher.DispatchAsync("dc", ct);
Check(!await db.Set<ParentPushDevice>().AnyAsync(d => d.InstallationId == install && d.IsActive), "unregistered FCM token deactivated");

var disabled = new ParentPushService(db, Options.Create(new ParentPushOptions()));
var disabledNews = new NewsAndEventService(db, disabled);
var count = await db.Set<ParentAnnouncementPush>().CountAsync();
await disabledNews.CreateAsync(Request("Feature disabled"), ct);
Check(await db.Set<ParentAnnouncementPush>().CountAsync() == count, "disabled feature preserves announcement saves without push backlog");

// Audience checks deliberately conflict with Student.Class_ID. The API uses the
// section join, not that legacy field, section name, or the selected app child.
await db.Database.ExecuteSqlRawAsync("""
    INSERT INTO tblStudentFamilyDetail VALUES(5,505,1),(6,606,1);
    INSERT INTO tblStudent VALUES(4,101,1,102,999),(5,505,1,NULL,10),(6,606,1,102,999),(7,202,0,101,10);
    """);
var parentA = Guid.NewGuid();
var parentASecondPhone = Guid.NewGuid();
var parentB = Guid.NewGuid();
var parentC = Guid.NewGuid();
await push.UnregisterAsync(2, install, ct);
await push.RegisterAsync(1, 101, parentA, "class10-parent-a", ct);
await push.RegisterAsync(1, 101, parentASecondPhone, "class10-parent-a-second-phone", ct);
await push.RegisterAsync(2, 202, parentB, "class20-parent-b", ct);
await push.RegisterAsync(6, 606, parentC, "class10-parent-c", ct);
await push.RegisterAsync(5, 505, Guid.NewGuid(), "no-mapped-class", ct);
var repository = new ClassDiaryRepository(db);
Check(await repository.GetClassIdForStudentAsync(1, ct) == 10
    && await repository.GetClassIdForStudentAsync(2, ct) == 20,
    "diary API resolves class through composite section, ignoring legacy class field");
var access = new ParentDiaryAccessService(db);
Check(await access.CanReadAsync(1, 101, 1, ct) && await access.CanReadAsync(1, 101, 4, ct), "family can read either active sibling diary");
Check(!await access.CanReadAsync(1, 101, 2, ct), "other family's student ID cannot be used to read diary");
Check(!await access.CanReadAsync(2, 202, 7, ct), "inactive student cannot be used to read diary");
Check(!await access.CanReadAsync(1, 202, 2, ct), "spoofed family DB ID/code combination cannot read diary");
Check(!await access.CanReadAsync(3, 303, 3, ct), "explicitly inactive family cannot read diary even with an active child");

sender.Result = ParentPushSendResult.Sent;
var allClassesNews = await news.CreateAsync(Request("Campus-wide announcement"), ct);
var announcementDevices = await db.Set<ParentPushDelivery>().Where(d => d.Push.AnnouncementId == allClassesNews.Id)
    .Select(d => d.Device.Token).ToListAsync(ct);
Check(announcementDevices.Count == 5 && announcementDevices.Contains("class20-parent-b")
    && announcementDevices.Contains("class10-parent-c") && announcementDevices.Contains("no-mapped-class"),
    "announcement includes all eligible registered devices, without a class restriction");
await dispatcher.DispatchAsync("dc", ct);

var diaryDate = DateOnly.FromDateTime(DateTime.UtcNow);
await db.Database.ExecuteSqlInterpolatedAsync($"INSERT INTO tblClassDiary(ClassID,Date,ImgURL) VALUES(10,{diaryDate},'fake-page-one')");
await push.QueueDiaryPublicationAsync(10, diaryDate, "Class Ten", ct);
await db.SaveChangesAsync(ct);
var diaryDeliveries = await db.Set<ParentPushDelivery>().Where(d => d.Push.DiaryClassId == 10)
    .Select(d => new { d.Device.Token, d.StudentId }).ToListAsync(ct);
Check(diaryDeliveries.Count == 3 && diaryDeliveries.All(d => d.Token.StartsWith("class10-")),
    "diary recipients are only parents in the matching class, across its sections");
Check(diaryDeliveries.Count(d => d.Token == "class10-parent-a") == 1,
    "siblings in the same class do not duplicate a phone notification");
await push.QueueDiaryPublicationAsync(10, diaryDate, "Class Ten", ct);
await db.SaveChangesAsync(ct);
Check(await db.Set<ParentAnnouncementPush>().CountAsync(p => p.DiaryClassId == 10 && p.DiaryDate == diaryDate) == 1,
    "one class/date event even after retry or re-upload");
await dispatcher.DispatchAsync("dc", ct);
Check(sender.DiaryCalls.Count == 3 && sender.DiaryCalls.All(c => c.ClassId == 10 && c.Campus == "dc"),
    "diary send payload is tied to its campus, class, date and intended student");

var nextDate = diaryDate.AddDays(1);
await db.Database.ExecuteSqlInterpolatedAsync($"INSERT INTO tblClassDiary(ClassID,Date,ImgURL) VALUES(10,{nextDate},'fake-page-two')");
await push.QueueDiaryPublicationAsync(10, nextDate, "Class Ten", ct);
await db.SaveChangesAsync(ct);
await db.Database.ExecuteSqlRawAsync("UPDATE tblStudent SET ClassCompositeID=201 WHERE Reg_Id IN(1,4)");
await dispatcher.DispatchAsync("dc", ct);
Check(sender.DiaryCalls.Count == 4 && sender.DiaryCalls.Last().Token == "class10-parent-c",
    "family whose children transferred classes is skipped before delivery");

var removedDate = diaryDate.AddDays(2);
await db.Database.ExecuteSqlInterpolatedAsync($"INSERT INTO tblClassDiary(ClassID,Date,ImgURL) VALUES(10,{removedDate},'fake-page-three')");
await push.QueueDiaryPublicationAsync(10, removedDate, "Class Ten", ct);
await db.SaveChangesAsync(ct);
await db.Database.ExecuteSqlInterpolatedAsync($"DELETE FROM tblClassDiary WHERE Date={removedDate}");
await dispatcher.DispatchAsync("dc", ct);
Check(sender.DiaryCalls.Count == 4, "deleted diary is not sent");
await db.Database.ExecuteSqlRawAsync("INSERT INTO tblStudent VALUES(8,202,1,101,999)");
var siblingDate = diaryDate.AddDays(-1);
await db.Database.ExecuteSqlInterpolatedAsync($"INSERT INTO tblClassDiary(ClassID,Date,ImgURL) VALUES(10,{siblingDate},'sibling-page')");
await push.QueueDiaryPublicationAsync(10, siblingDate, "Class Ten", ct);
await db.SaveChangesAsync(ct);
Check(await db.Set<ParentPushDelivery>().AnyAsync(d => d.Push.DiaryDate == siblingDate
    && d.Device.Token == "class20-parent-b" && d.StudentId == 8, ct),
    "mixed-class family receives diary for its matching sibling, independent of selected app child");
await dispatcher.DispatchAsync("dc", ct);
await db.Database.ExecuteSqlRawAsync("UPDATE tblStudent SET ClassCompositeID=101 WHERE Reg_Id=4");
var lateSiblingDate = diaryDate.AddDays(4);
await db.Database.ExecuteSqlInterpolatedAsync($"INSERT INTO tblClassDiary(ClassID,Date,ImgURL) VALUES(10,{lateSiblingDate},'late-sibling-page')");
await push.QueueDiaryPublicationAsync(10, lateSiblingDate, "Class Ten", ct);
await db.SaveChangesAsync(ct);
await db.Database.ExecuteSqlRawAsync("UPDATE tblStudent SET ClassCompositeID=201 WHERE Reg_Id=4; INSERT INTO tblStudent VALUES(9,101,1,101,999)");
var priorDiaryCalls = sender.DiaryCalls.Count;
await dispatcher.DispatchAsync("dc", ct);
var familyACalls = sender.DiaryCalls.Skip(priorDiaryCalls).Where(d => d.Token.StartsWith("class10-parent-a")).ToList();
Check(familyACalls.Count == 2 && familyACalls.All(d => d.StudentId == 9),
    "if the queued child transfers, an eligible sibling is resolved again for each family phone");
await DiaryUploadChecks.RunAsync(db, push, ct);

// A second independent campus database deliberately reuses family/student/class
// IDs. Neither its tokens nor events may participate in the first campus queue.
await using var otherConnection = new SqliteConnection("Data Source=:memory:");
await otherConnection.OpenAsync(ct);
await using var otherDb = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>().UseSqlite(otherConnection).Options);
var tableScripts = await db.Database.SqlQueryRaw<string>(
    "SELECT sql AS Value FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").ToListAsync(ct);
foreach (var script in tableScripts) await otherDb.Database.ExecuteSqlRawAsync(script, ct);
await otherDb.Database.ExecuteSqlRawAsync("""
    INSERT INTO tblStudentFamilyDetail VALUES(1,101,NULL);
    INSERT INTO tblSection VALUES(101,10);
    INSERT INTO tblStudent VALUES(1,101,1,101,10);
    """);
await otherDb.Database.ExecuteSqlInterpolatedAsync($"INSERT INTO tblClassDiary(ClassID,Date,ImgURL) VALUES(10,{diaryDate},'other-campus-page')");
var otherPush = new ParentPushService(otherDb, Options.Create(new ParentPushOptions { Enabled = true }));
await otherPush.RegisterAsync(1, 101, Guid.NewGuid(), "other-campus-parent", ct);
await otherPush.QueueDiaryPublicationAsync(10, diaryDate, "Other Campus Ten", ct);
await otherDb.SaveChangesAsync(ct);
var otherSender = new FakeSender();
await new ParentPushDispatcher(otherDb, otherSender).DispatchAsync("mt", ct);
Check(otherSender.DiaryCalls.Count == 1 && otherSender.DiaryCalls[0].Token == "other-campus-parent"
    && otherSender.DiaryCalls[0].Campus == "mt" && sender.DiaryCalls.All(d => d.Token != "other-campus-parent"),
    "same numeric class/student/family IDs in another campus never cross recipient boundaries");
Console.WriteLine("All parent push checks passed.");

static UpsertNewsAndEventRequestDto Request(string title, bool active = true, bool home = true) =>
    new() { Title = title, Type = "Announcement", IsActive = active, ShowOnHome = home };
static void Check(bool result, string name) { if (!result) throw new Exception("FAIL: " + name); Pass(name); }
static void Pass(string name) => Console.WriteLine("PASS: " + name);
class FakeSender : IParentPushSender
{
    public List<(string Token, string Campus, int ClassId, DateOnly Date, int StudentId, int FamilyDbId)> DiaryCalls { get; } = [];
    public List<(string Campus, int Id)> Calls { get; } = [];
    public ParentPushSendResult Result { get; set; } = ParentPushSendResult.Sent;
    public Task<ParentPushSendResult> SendAsync(string token, string title, string campus, int id, CancellationToken ct)
    { Calls.Add((campus, id)); return Task.FromResult(Result); }
    public Task<ParentPushSendResult> SendDiaryAsync(string token, string title, string campus,
        int classId, DateOnly date, int studentId, int familyDbId, CancellationToken ct)
    { DiaryCalls.Add((token, campus, classId, date, studentId, familyDbId)); return Task.FromResult(Result); }
}
