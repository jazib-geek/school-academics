using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Configuration;
using School.API.Controllers;
using School.Application.Common;
using School.Application.DTOs;
using School.Application.Services;
using School.Infrastructure.Data;
using School.Infrastructure.Entities;

// Run from backend: dotnet run --project tools/FeeTimeChecks
// Uses only local SQL Server and removes its own fixture records in finally.
var configuration = new ConfigurationBuilder().SetBasePath(Path.Combine(Directory.GetCurrentDirectory(), "School.API"))
    .AddJsonFile("appsettings.json").AddJsonFile("appsettings.Development.json", optional: true)
    .AddEnvironmentVariables().Build();
var connectionString = configuration["CampusSettings:Campuses:local"] ?? throw new Exception("Local campus is not configured.");
var connection = new SqlConnectionStringBuilder(connectionString);
var server = connection.DataSource.Split('\\')[0];
Assert(new[] { ".", "localhost", "127.0.0.1", Environment.MachineName }.Contains(server, StringComparer.OrdinalIgnoreCase),
    "Integration checks require verified local SQL Server.");
var interceptor = new FailAfterSaveInterceptor();
var options = new DbContextOptionsBuilder<AppDbContext>().UseSqlServer(connectionString).AddInterceptors(interceptor).Options;
await using var context = new AppDbContext(options);
const int regId = 2147483001;
Assert(!await context.Students.AnyAsync(x => x.Reg_Id == regId), "Fixture student ID already exists.");
var user = new User { Username = "fee-time-check-" + Guid.NewGuid().ToString("N"), Password = Guid.NewGuid().ToString("N"), IsActive = true };
var student = new Student { Reg_Id = regId, FullName = "Fee time integration fixture", Fee = 5000, TutionFee = 4500, FeeConcession = 500, IsActive = true };
var service = new FeeTimeService(context);
try
{
    context.Users.Add(user);
    context.Students.Add(student);
    await context.SaveChangesAsync();
    var controller = new FeeTimeController(service);
    void SetClaims(params Claim[] extra)
    {
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext
            {
                User = new ClaimsPrincipal(new ClaimsIdentity(new[]
                {
                    new Claim("FamilyDbId", user.ID.ToString()), new Claim("Campus", "local")
                }.Concat(extra), "test"))
            }
        };
    }
    SetClaims(new Claim("FamilyID", ""));
    Assert(await controller.List(default) is ForbidResult, "A campus user without fee_time must be denied.");
    Assert(await controller.Search("fixture", default, "name") is ForbidResult, "Student search requires fee_time permission.");
    var right = new UserRight { UserName = user.Username, ModuleCode = "fee_time", HasAccess = true };
    context.UserRights.Add(right);
    await context.SaveChangesAsync();
    foreach (var restricted in new[] { new Claim("FamilyID", "123"), new Claim("AuthSource", "employee"), new Claim("App", "Academics") })
    {
        SetClaims(restricted);
        Assert(await controller.List(default) is ForbidResult &&
               await controller.Save(regId, new FeeTimeSaveDto { FeeTime = "blocked" }, default) is ForbidResult &&
               await controller.Remove(regId, default) is ForbidResult, "Non-campus principals must be denied for reads and writes.");
    }
    SetClaims(new Claim("FamilyID", ""));
    Assert(await controller.Student(regId, default) is OkObjectResult, "Student lookup should work with fee_time permission alone.");
    Assert((await service.SearchAsync(regId.ToString(), "reg", default)).Single().RegId == regId, "Registration search must find the exact ID.");
    Assert(!(await service.SearchAsync("214748300", "reg", default)).Any(x => x.RegId == regId), "Registration search must not match an ID prefix.");
    Assert((await service.SearchAsync("time integration", "name", default)).Any(x => x.RegId == regId), "Name search must return partial matches.");
    Assert((await service.SearchAsync("f", "name", default)).Count == 0, "Name search requires at least two characters.");
    Assert(await controller.Search("fixture", default, "other") is BadRequestObjectResult, "Unknown search modes must be rejected.");
    Assert(await controller.Student(2147483002, default) is NotFoundObjectResult, "Missing student should return 404.");
    Assert(await controller.Save(regId, new FeeTimeSaveDto { FeeTime = "   " }, default) is BadRequestObjectResult, "Blank values must be rejected.");
    var overlong = new FeeTimeSaveDto { FeeTime = new string('x', 501) };
    Assert(!Validator.TryValidateObject(overlong,
        new ValidationContext(overlong), new List<ValidationResult>(), true), "Overlong requests must fail validation.");

    Assert(await controller.Save(regId, new FeeTimeSaveDto { FeeTime = " 25 every month " }, default) is OkObjectResult, "Save failed.");
    var saved = await service.GetAsync(regId, default) ?? throw new Exception("Saved student is missing.");
    Assert(saved.FeeTime == "25 every month" && saved.UpdatedAt.HasValue, "Saved value/date is wrong.");
    Assert((await service.ListAsync(default)).Any(x => x.RegId == regId), "Saved fee time must appear in the listing.");
    var logs = await context.ActivityLogs.AsNoTracking().Where(x => x.EntityId == regId && x.ActivityType == ActivityLogTypes.StudentFeeTimeUpdate).ToListAsync();
    Assert(logs.Count == 1 && logs[0].UserId == user.ID && logs[0].UserName == user.Username, "Save must record the acting user.");
    using (var details = JsonDocument.Parse(logs[0].DetailsJson!))
    {
        var change = details.RootElement.GetProperty("changes")[0];
        Assert(change.GetProperty("old").ValueKind == JsonValueKind.Null && change.GetProperty("new").GetString() == "25 every month", "Audit must preserve old/new values.");
    }
    await controller.Save(regId, new FeeTimeSaveDto { FeeTime = "25 every month" }, default);
    Assert(await LogCount() == 1 && (await service.GetAsync(regId, default))?.UpdatedAt == saved.UpdatedAt, "No-op saves must not change the audit or timestamp.");

    interceptor.RejectNextSave = true;
    var rolledBack = false;
    try { await controller.Save(regId, new FeeTimeSaveDto { FeeTime = "must roll back" }, default); }
    catch (InvalidOperationException ex) when (ex.Message == "Injected failure after database save") { rolledBack = true; }
    context.ChangeTracker.Clear();
    Assert(rolledBack && (await service.GetAsync(regId, default))?.FeeTime == "25 every month" && await LogCount() == 1,
        "A failure after SQL writes must roll back the student update AND audit.");

    await controller.Save(regId, new FeeTimeSaveDto { FeeTime = "Reference" }, default);
    Assert(await LogCount() == 2, "Updating a fee time must write a new audit entry.");
    var removed = await controller.Remove(regId, default);
    Assert(removed is OkObjectResult && (await service.GetAsync(regId, default))?.FeeTime == null && await LogCount() == 3,
        "Remove must clear current state and record history.");
    Assert(!(await service.ListAsync(default)).Any(x => x.RegId == regId), "Removed fee time must disappear from the listing.");
    await controller.Remove(regId, default);
    Assert(await LogCount() == 3, "Repeated removal must be idempotent.");
    await controller.Save(regId, new FeeTimeSaveDto { FeeTime = "Restored" }, default);
    Assert((await service.GetAsync(regId, default))?.FeeTime == "Restored", "A removed fee time must be definable again.");
    context.FeeAndFundCollections.Add(new FeeAndFundCollection
    {
        StudentID = regId, FundTypeID = 1, Month = 11, Year = 2026,
        Date = new DateTime(2026, 11, 1), Payment = 5000, Recieved = 1000, Type = user.Username
    });
    await context.SaveChangesAsync();
    var feeReports = new FeeReportService(context, new SystemAccountResolver(context));
    var smartReports = new SmartFeeReportService(context, feeReports);
    var reportIds = new[] { "tuition-defaulters", "overall-receivable", "overall-receivable-class-wise" };
    foreach (var id in reportIds)
    {
        var report = await smartReports.RunAsync(id, new() { ["month"] = 11, ["year"] = 2026 });
        var row = report.Rows.Single(x => Convert.ToInt32(x["studentId"]) == regId);
        Assert((string?)row["feeTime"] == "Restored" && report.Columns.Any(x => x.Key == "feeTime" && x.Format == "text"),
            $"{id} must expose current student fee time and column metadata.");
        Assert(Convert.ToDecimal(row["outstandingAmount"]) == 4000, $"{id} report amounts must be unchanged.");
    }
    await service.SetAsync(regId, null, user.ID, default);
    foreach (var id in reportIds)
    {
        var report = await smartReports.RunAsync(id, new() { ["month"] = 11, ["year"] = 2026 });
        Assert(report.Rows.Single(x => Convert.ToInt32(x["studentId"]) == regId)["feeTime"] == null,
            $"{id} must reflect fee time removal.");
    }
    var unchanged = await context.Students.AsNoTracking().SingleAsync(x => x.Reg_Id == regId);
    Assert(unchanged.Fee == 5000 && unchanged.TutionFee == 4500 && unchanged.FeeConcession == 500,
        "Fee-time changes must not affect fee amounts.");
    await context.Users.Where(x => x.ID == user.ID).ExecuteUpdateAsync(x => x.SetProperty(u => u.IsActive, false));
    Assert(await controller.List(default) is ForbidResult, "Inactive users must be denied even with permission.");
    await context.Users.Where(x => x.ID == user.ID).ExecuteUpdateAsync(x => x.SetProperty(u => u.IsActive, true).SetProperty(u => u.IsSuperAdmin, true));
    await context.UserRights.Where(x => x.UserName == user.Username).ExecuteDeleteAsync();
    Assert(await controller.List(default) is OkObjectResult, "Active superadmins must have access without an explicit right.");
    Console.WriteLine("PASS: lookup/list, save/update/remove/restore, validation, permission boundaries, audit values, idempotency, timestamps, unchanged fees, atomic rollback, and fee time in all three receivable/defaulter reports.");
}
finally
{
    interceptor.RejectNextSave = false;
    context.ChangeTracker.Clear();
    await using var cleanup = await context.Database.BeginTransactionAsync();
    await context.ActivityLogs.Where(x => x.EntityId == regId && x.ActivityType == ActivityLogTypes.StudentFeeTimeUpdate && x.UserName == user.Username).ExecuteDeleteAsync();
    await context.UserRights.Where(x => x.UserName == user.Username).ExecuteDeleteAsync();
    await context.FeeAndFundCollections.Where(x => x.StudentID == regId && x.Type == user.Username).ExecuteDeleteAsync();
    await context.Students.Where(x => x.Reg_Id == regId && x.FullName == student.FullName).ExecuteDeleteAsync();
    await context.Users.Where(x => x.Username == user.Username).ExecuteDeleteAsync();
    await cleanup.CommitAsync();
    Console.WriteLine("Fixture student, user, rights and audit records removed.");
}

Task<int> LogCount() => context.ActivityLogs.CountAsync(x => x.EntityId == regId && x.ActivityType == ActivityLogTypes.StudentFeeTimeUpdate);
static void Assert(bool condition, string message) { if (!condition) throw new Exception(message); }

sealed class FailAfterSaveInterceptor : SaveChangesInterceptor
{
    public bool RejectNextSave { get; set; }
    public override ValueTask<int> SavedChangesAsync(SaveChangesCompletedEventData eventData, int result, CancellationToken cancellationToken = default)
    {
        if (RejectNextSave)
        {
            RejectNextSave = false;
            throw new InvalidOperationException("Injected failure after database save");
        }
        return ValueTask.FromResult(result);
    }
}
