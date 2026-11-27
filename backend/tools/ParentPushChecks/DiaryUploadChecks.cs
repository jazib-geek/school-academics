using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using School.Application.Common;
using School.Application.DTOs;
using School.Application.Interfaces;
using School.Application.Services;
using School.Infrastructure.Data;
using School.Infrastructure.Entities;
using School.Infrastructure.Repositories;

static class DiaryUploadChecks
{
    public static async Task RunAsync(AppDbContext db, ParentPushService push, CancellationToken ct)
    {
        await db.Database.ExecuteSqlRawAsync("""
            CREATE TABLE tblClass (Class_ID INTEGER PRIMARY KEY, Class_Name TEXT, BranchID INTEGER,
              IsActive INTEGER, sort_by INTEGER, isHifz INTEGER);
            INSERT INTO tblClass(Class_ID,Class_Name,IsActive) VALUES(30,'Class Thirty',1);
            INSERT INTO tblSection VALUES(301,30);
            UPDATE tblStudent SET ClassCompositeID=301 WHERE Reg_Id=6;
            """);
        var storage = new FakeDiaryStorage { FailPage = 2 };
        var service = new ClassDiaryService(new ClassDiaryRepository(db), storage, null!, null!, db,
            new TenantContext { Campus = "dc" }, NullLogger<ClassDiaryService>.Instance, push);
        var files = Enumerable.Range(1, 2).Select(n => new ClassDiaryFileUpload
        {
            Content = new MemoryStream([1]), FileName = $"page-{n}.png", ContentType = "image/png", SizeBytes = 1
        }).ToList();
        var actor = new ClassDiaryUploadActorDto { ActorSource = "campusUser", DisplayName = "Test staff" };
        try
        {
            await service.UploadDiaryAsync(30, PakistanTime.Today, files, null, actor, cancellationToken: ct);
            throw new Exception("Expected second-page upload to fail");
        }
        catch (InvalidOperationException)
        {
            Require(!await db.Set<ParentAnnouncementPush>().AnyAsync(p => p.DiaryClassId == 30, ct)
                && !await db.ClassDiaries.AnyAsync(d => d.ClassID == 30, ct),
                "partial two-page upload does not save diary or queue a notification");
        }
        storage.FailPage = 0;
        await service.UploadDiaryAsync(30, PakistanTime.Today, files, null, actor, cancellationToken: ct);
        Require(await db.ClassDiaries.CountAsync(d => d.ClassID == 30, ct) == 2
            && await db.Set<ParentAnnouncementPush>().CountAsync(p => p.DiaryClassId == 30, ct) == 1
            && await db.Set<ParentPushDelivery>().CountAsync(d => d.Push.DiaryClassId == 30, ct) == 1,
            "complete two-page upload saves one diary event and only the matching parent's delivery");
        foreach (var file in files) file.Content.Dispose();
    }

    static void Require(bool value, string label)
    { if (!value) throw new Exception("FAIL: " + label); Console.WriteLine("PASS: " + label); }
}

class FakeDiaryStorage : IObjectStorageService
{
    public int FailPage { get; set; }
    public Task<ObjectStorageUploadResultDto?> UploadClassDiaryFileAsync(Stream content, string fileName,
        string? contentType, string campusKey, string className, DateOnly diaryDate, int pageIndex,
        int totalPages, CancellationToken cancellationToken = default)
    {
        if (pageIndex == FailPage) throw new InvalidOperationException("Synthetic upload failure");
        return Task.FromResult<ObjectStorageUploadResultDto?>(new() { Key = $"{campusKey}/diary/{diaryDate:yyyy-MM-dd}/{pageIndex}.png" });
    }
    public string? BuildPublicUrlFromKey(string key) => "https://example.invalid/" + key;
    public string? TryResolveObjectKey(string key) => key;
    public Task<bool> DeleteObjectAsync(string key, CancellationToken cancellationToken = default) => Task.FromResult(true);
    public Task<ObjectStorageUploadResultDto?> UploadTestFileAsync(Stream content, string name, string? type,
        CancellationToken cancellationToken = default) => throw new NotSupportedException();
    public string BuildStudentProfileObjectKey(string campusKey, int regId) => throw new NotSupportedException();
    public Task<ObjectStorageUploadResultDto?> UploadStudentProfileImageAsync(Stream content, string campusKey,
        int regId, CancellationToken cancellationToken = default) => throw new NotSupportedException();
    public Task<ObjectStorageDownloadResultDto?> GetObjectAsync(string key,
        CancellationToken cancellationToken = default) => throw new NotSupportedException();
}
