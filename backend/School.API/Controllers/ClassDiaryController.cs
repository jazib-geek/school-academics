using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using School.API.Filters;
using School.API.Models;
using School.Application.Common;
using School.Application.DTOs;
using School.Application.Interfaces;
using School.Infrastructure.Data;

namespace School.API.Controllers;

[ApiController]
[Authorize]
[AuthorizeCampusOrEmployee]
[Route("api/class-diary")]
public class ClassDiaryController : ControllerBase
{
    private const long MaxTotalUploadBytes = 1_048_576;

    private readonly IClassDiaryService _classDiaryService;
    private readonly AppDbContext _context;

    public ClassDiaryController(IClassDiaryService classDiaryService, AppDbContext context)
    {
        _classDiaryService = classDiaryService;
        _context = context;
    }

    /// <summary>All class diaries grouped by class and date (image URLs comma-separated).</summary>
    [HttpGet("listing")]
    public async Task<IActionResult> GetListing(CancellationToken cancellationToken)
    {
        var result = await _classDiaryService.GetListingAsync(cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<ClassDiaryListingDto>>.SuccessResponse(result));
    }

    [HttpGet("upload-history")]
    public async Task<IActionResult> GetUploadHistory(
        [FromQuery] int classId,
        [FromQuery] string date,
        CancellationToken cancellationToken)
    {
        if (classId <= 0)
            return BadRequest(ApiResponse<object>.FailureResponse("Invalid class."));

        if (!DateOnly.TryParse(date, out var diaryDate))
            return BadRequest(ApiResponse<object>.FailureResponse("Invalid date. Use yyyy-MM-dd."));

        try
        {
            var result = await _classDiaryService.GetUploadHistoryAsync(classId, diaryDate, cancellationToken);
            return Ok(ApiResponse<IReadOnlyList<ClassDiaryUploadHistoryItemDto>>.SuccessResponse(result));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<object>.FailureResponse(ex.Message));
        }
    }

    /// <summary>Class diaries for the student's class (resolved via section).</summary>
    [HttpGet("student/{studentId}")]
    public async Task<IActionResult> GetByStudent(int studentId, CancellationToken cancellationToken)
    {
        try
        {
            var result = await _classDiaryService.GetByStudentIdAsync(studentId, cancellationToken);
            return Ok(ApiResponse<IReadOnlyList<ClassDiaryListingDto>>.SuccessResponse(result));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<object>.FailureResponse(ex.Message));
        }
    }

    /// <summary>Upload 1–2 diary images (multipart). Replaces any existing diary for the same class and date.
    /// Date must be yesterday, today, or tomorrow in Pakistan time.</summary>
    [HttpPost("upload")]
    [RequestSizeLimit(52_428_800)]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> Upload(
        [FromForm] ClassDiaryUploadForm form,
        CancellationToken cancellationToken)
    {
        var files = form.Files?.Where(f => f.Length > 0).ToList() ?? [];
        if (files.Count is < 1 or > 2)
        {
            return BadRequest(ApiResponse<object>.FailureResponse("Upload 1 or 2 image files."));
        }

        if (!DateOnly.TryParse(form.Date, out var diaryDate))
        {
            return BadRequest(ApiResponse<object>.FailureResponse("Invalid date. Use yyyy-MM-dd."));
        }

        if (!PakistanTime.IsAllowedDiaryDate(diaryDate))
        {
            return BadRequest(
                ApiResponse<object>.FailureResponse(
                    "Diary date must be yesterday, today, or tomorrow (Pakistan time)."));
        }

        var totalBytes = files.Sum(f => f.Length);
        if (totalBytes > MaxTotalUploadBytes)
        {
            return BadRequest(
                ApiResponse<object>.FailureResponse(
                    "Combined image size must be 1 MB or less. Reduce image size and try again."));
        }

        foreach (var file in files)
        {
            if (string.IsNullOrWhiteSpace(file.ContentType) ||
                !file.ContentType.StartsWith("image/", StringComparison.OrdinalIgnoreCase))
            {
                return BadRequest(ApiResponse<object>.FailureResponse("Only image files are allowed."));
            }
        }

        var uploads = new List<ClassDiaryFileUpload>();
        var streams = new List<Stream>();

        try
        {
            foreach (var file in files)
            {
                var stream = file.OpenReadStream();
                streams.Add(stream);
                uploads.Add(new ClassDiaryFileUpload
                {
                    Content = stream,
                    FileName = file.FileName,
                    ContentType = file.ContentType,
                    SizeBytes = file.Length,
                });
            }

            var (notifyCampusUsers, actorEmployeeId) = ResolveEmployeeUploadNotify();
            var actor = await ResolveUploadActorAsync(cancellationToken);
            var result = await _classDiaryService.UploadDiaryAsync(
                form.ClassId,
                diaryDate,
                uploads,
                form.Description,
                actor,
                notifyCampusUsers,
                actorEmployeeId,
                cancellationToken);

            return Ok(ApiResponse<ClassDiaryDto>.SuccessResponse(result, "Diary saved."));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<object>.FailureResponse(ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, ApiResponse<object>.FailureResponse(ex.Message));
        }
        finally
        {
            foreach (var stream in streams)
            {
                await stream.DisposeAsync();
            }
        }
    }

    [HttpPost("delete")]
    public async Task<IActionResult> Delete(
        [FromBody] ClassDiaryDeleteRequestDto request,
        CancellationToken cancellationToken)
    {
        try
        {
            var actor = await ResolveUploadActorAsync(cancellationToken);
            await _classDiaryService.DeleteDiaryAsync(request.ClassId, request.Date, actor, cancellationToken);
            return Ok(ApiResponse<object>.SuccessResponse(new { }, "Diary deleted."));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<object>.FailureResponse(ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            return StatusCode(StatusCodes.Status502BadGateway, ApiResponse<object>.FailureResponse(ex.Message));
        }
    }

    /// <summary>Only employee-portal uploads should fan out campus toasts; campus UI uploads stay quiet.</summary>
    private (bool NotifyCampusUsers, int? ActorEmployeeId) ResolveEmployeeUploadNotify()
    {
        var authSource = User.FindFirst(AuthSourceClaims.ClaimType)?.Value;
        if (!string.Equals(authSource, AuthSourceClaims.Employee, StringComparison.OrdinalIgnoreCase))
            return (false, null);

        int? employeeId = int.TryParse(User.FindFirst("FamilyDbId")?.Value, out var id) && id > 0
            ? id
            : null;

        return (true, employeeId);
    }

    private async Task<ClassDiaryUploadActorDto> ResolveUploadActorAsync(CancellationToken cancellationToken)
    {
        var isEmployee = string.Equals(
            User.FindFirst(AuthSourceClaims.ClaimType)?.Value,
            AuthSourceClaims.Employee,
            StringComparison.OrdinalIgnoreCase);

        if (!int.TryParse(User.FindFirst("FamilyDbId")?.Value, out var familyDbId) || familyDbId <= 0)
        {
            return new ClassDiaryUploadActorDto
            {
                DisplayName = "Staff",
                ActorSource = isEmployee ? "employee" : "campusUser",
            };
        }

        if (isEmployee)
        {
            var name = await _context.Employees.AsNoTracking()
                .Where(x => x.ID == familyDbId)
                .Select(x => x.EmployeeName)
                .FirstOrDefaultAsync(cancellationToken);

            return new ClassDiaryUploadActorDto
            {
                EmployeeId = familyDbId,
                DisplayName = string.IsNullOrWhiteSpace(name) ? "Staff" : name.Trim(),
                ActorSource = "employee",
            };
        }

        var username = await _context.Users.AsNoTracking()
            .Where(x => x.ID == familyDbId)
            .Select(x => x.Username)
            .FirstOrDefaultAsync(cancellationToken);

        return new ClassDiaryUploadActorDto
        {
            CampusUserId = familyDbId,
            DisplayName = string.IsNullOrWhiteSpace(username) ? "Staff" : username.Trim(),
            ActorSource = "campusUser",
        };
    }
}
