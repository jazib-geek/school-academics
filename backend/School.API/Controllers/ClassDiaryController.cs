using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using School.API.Models;
using School.Application.Common;
using School.Application.DTOs;
using School.Application.Interfaces;

namespace School.API.Controllers;

[ApiController]
[Authorize]
[Route("api/class-diary")]
public class ClassDiaryController : ControllerBase
{
    private const long MaxTotalUploadBytes = 1_048_576;

    private readonly IClassDiaryService _classDiaryService;

    public ClassDiaryController(IClassDiaryService classDiaryService)
    {
        _classDiaryService = classDiaryService;
    }

    /// <summary>All class diaries grouped by class and date (image URLs comma-separated).</summary>
    [HttpGet("listing")]
    public async Task<IActionResult> GetListing(CancellationToken cancellationToken)
    {
        var result = await _classDiaryService.GetListingAsync(cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<ClassDiaryListingDto>>.SuccessResponse(result));
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

    /// <summary>Upload 1–2 diary images (multipart). Date must be today or yesterday in Pakistan time.</summary>
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

        if (!PakistanTime.IsTodayOrYesterday(diaryDate))
        {
            return BadRequest(
                ApiResponse<object>.FailureResponse("Diary date must be today or yesterday (Pakistan time)."));
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

            var result = await _classDiaryService.UploadDiaryAsync(
                form.ClassId,
                diaryDate,
                uploads,
                form.Description,
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
            await _classDiaryService.DeleteDiaryAsync(request.ClassId, request.Date, cancellationToken);
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
}
