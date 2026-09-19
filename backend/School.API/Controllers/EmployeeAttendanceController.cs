using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using School.Application.Common;
using School.Application.DTOs;
using School.Application.Interfaces;
using System.Text.Json;

namespace School.API.Controllers;

[ApiController]
[Authorize]
[Route("api/employee-attendance")]
public class EmployeeAttendanceController : ControllerBase
{
    private readonly IEmployeeAttendanceService _employeeAttendanceService;
    private readonly IEmployeeAttendanceImportService _employeeAttendanceImportService;
    private readonly IEmployeeAttendanceLiveUpdateSink _liveUpdateSink;
    private readonly TenantContext _tenantContext;

    public EmployeeAttendanceController(
        IEmployeeAttendanceService employeeAttendanceService,
        IEmployeeAttendanceImportService employeeAttendanceImportService,
        IEmployeeAttendanceLiveUpdateSink liveUpdateSink,
        TenantContext tenantContext)
    {
        _employeeAttendanceService = employeeAttendanceService;
        _employeeAttendanceImportService = employeeAttendanceImportService;
        _liveUpdateSink = liveUpdateSink;
        _tenantContext = tenantContext;
    }

    [HttpGet("by-date")]
    public async Task<IActionResult> GetByDate(
        [FromQuery] DateTime? date,
        CancellationToken cancellationToken)
    {
        var result = await _employeeAttendanceService.GetLiveDayAsync(date, cancellationToken);
        return Ok(ApiResponse<EmployeeAttendanceLiveDayDto>.SuccessResponse(result));
    }

    [HttpGet("live")]
    public async Task<IActionResult> GetLiveDay(
        [FromQuery] DateTime? date,
        CancellationToken cancellationToken)
    {
        var result = await _employeeAttendanceService.GetLiveDayAsync(date, cancellationToken);
        return Ok(ApiResponse<EmployeeAttendanceLiveDayDto>.SuccessResponse(result));
    }

    [HttpGet("live/stream")]
    public async Task StreamLiveUpdates(CancellationToken cancellationToken)
    {
        Response.Headers.CacheControl = "no-cache";
        Response.Headers.Connection = "keep-alive";
        Response.ContentType = "text/event-stream";

        var reader = _liveUpdateSink.Subscribe(_tenantContext.Campus, cancellationToken);
        await Response.WriteAsync(": connected\n\n", cancellationToken);
        await Response.Body.FlushAsync(cancellationToken);

        await foreach (var row in reader.ReadAllAsync(cancellationToken))
        {
            var payload = JsonSerializer.Serialize(row, JsonSerializerOptions.Web);
            await Response.WriteAsync("event: attendance\n", cancellationToken);
            await Response.WriteAsync($"data: {payload}\n\n", cancellationToken);
            await Response.Body.FlushAsync(cancellationToken);
        }
    }

    [HttpGet("monthly")]
    public async Task<IActionResult> GetMonthlySheet(
        [FromQuery] int? year,
        [FromQuery] int? month,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _employeeAttendanceService.GetMonthlySheetAsync(year, month, cancellationToken);
            return Ok(ApiResponse<EmployeeAttendanceMonthlySheetDto>.SuccessResponse(result));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<EmployeeAttendanceMonthlySheetDto>.FailureResponse(ex.Message));
        }
    }

    [HttpGet("my")]
    public async Task<IActionResult> GetMyAttendance(
        [FromQuery] int? year,
        [FromQuery] int? month,
        CancellationToken cancellationToken)
    {
        var authSource = User.FindFirst(AuthSourceClaims.ClaimType)?.Value;
        if (!string.Equals(authSource, AuthSourceClaims.Employee, StringComparison.OrdinalIgnoreCase))
        {
            return Unauthorized(ApiResponse<object>.FailureResponse("Employee sign-in is required."));
        }

        if (!int.TryParse(User.FindFirst("FamilyDbId")?.Value, out var employeeId) || employeeId <= 0)
        {
            return Unauthorized(ApiResponse<object>.FailureResponse("You must be signed in."));
        }

        try
        {
            var result = await _employeeAttendanceService.GetMyAttendanceAsync(
                employeeId,
                year,
                month,
                cancellationToken);
            return Ok(ApiResponse<EmployeeMyAttendanceDto>.SuccessResponse(result));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<object>.FailureResponse(ex.Message));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<object>.FailureResponse(ex.Message));
        }
    }

    [HttpGet("manage")]
    public async Task<IActionResult> GetManageDay(
        [FromQuery] DateTime? date,
        CancellationToken cancellationToken)
    {
        var result = await _employeeAttendanceService.GetManageDayAsync(date, cancellationToken);
        return Ok(ApiResponse<EmployeeAttendanceManageDayDto>.SuccessResponse(result));
    }

    [HttpGet("backfill/existing")]
    public async Task<IActionResult> GetBackfillExisting(
        [FromQuery] int employeeId,
        [FromQuery] DateTime from,
        [FromQuery] DateTime to,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _employeeAttendanceService.GetBackfillExistingAsync(
                employeeId,
                from,
                to,
                cancellationToken);
            return Ok(ApiResponse<BackfillEmployeeAttendanceExistingDto>.SuccessResponse(result));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<object>.FailureResponse(ex.Message));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<object>.FailureResponse(ex.Message));
        }
    }

    [HttpPost("import/preview")]
    [RequestSizeLimit(20_971_520)]
    [RequestFormLimits(MultipartBodyLengthLimit = 20_971_520)]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> PreviewAttendanceImport(
        [FromForm] EmployeeAttendanceImportForm form,
        CancellationToken cancellationToken)
    {
        try
        {
            await using var stream = await CopyUploadAsync(form.File);
            var result = await _employeeAttendanceImportService.PreviewAsync(
                stream,
                form.File!.FileName,
                cancellationToken);
            return Ok(ApiResponse<EmployeeAttendanceImportPreviewDto>.SuccessResponse(result));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<object>.FailureResponse(ex.Message));
        }
    }

    [HttpPost("import")]
    [RequestSizeLimit(20_971_520)]
    [RequestFormLimits(MultipartBodyLengthLimit = 20_971_520)]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> ImportAttendance(
        [FromForm] EmployeeAttendanceImportForm form,
        CancellationToken cancellationToken)
    {
        try
        {
            await using var stream = await CopyUploadAsync(form.File);
            var rules = ParseImportRules(form.Rules);
            var result = await _employeeAttendanceImportService.ImportAsync(
                stream,
                form.File!.FileName,
                rules,
                ResolveUserId(),
                cancellationToken);
            return Ok(ApiResponse<EmployeeAttendanceImportResultDto>.SuccessResponse(
                result,
                BuildImportMessage(result)));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<object>.FailureResponse(ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<object>.FailureResponse(ex.Message));
        }
    }

    [HttpPost("{id:int}/edit")]
    public async Task<IActionResult> EditAttendance(
        int id,
        [FromBody] EditEmployeeAttendanceRequestDto request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _employeeAttendanceService.EditAttendanceAsync(
                id,
                request,
                ResolveUserId(),
                cancellationToken);
            return Ok(ApiResponse<EmployeeAttendanceMutationResultDto>.SuccessResponse(result, "Attendance updated."));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<object>.FailureResponse(ex.Message));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<object>.FailureResponse(ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<object>.FailureResponse(ex.Message));
        }
    }

    [HttpPost("{id:int}/delete")]
    public async Task<IActionResult> DeleteAttendance(
        int id,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _employeeAttendanceService.DeleteAttendanceAsync(
                id,
                ResolveUserId(),
                cancellationToken);
            return Ok(ApiResponse<DeleteEmployeeAttendanceResultDto>.SuccessResponse(
                result,
                "Attendance deleted."));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<object>.FailureResponse(ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<object>.FailureResponse(ex.Message));
        }
    }

    [HttpPost("mark-present")]
    public async Task<IActionResult> MarkPresent(
        [FromBody] MarkEmployeePresentRequestDto request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _employeeAttendanceService.MarkPresentAsync(
                request,
                ResolveUserId(),
                cancellationToken);
            return Ok(ApiResponse<EmployeeAttendanceMutationResultDto>.SuccessResponse(result, "Marked present."));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<object>.FailureResponse(ex.Message));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<object>.FailureResponse(ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(ApiResponse<object>.FailureResponse(ex.Message));
        }
    }

    [HttpPost("backfill")]
    public async Task<IActionResult> BackfillAttendance(
        [FromBody] BackfillEmployeeAttendanceRequestDto request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _employeeAttendanceService.BackfillAttendanceAsync(
                request,
                ResolveUserId(),
                cancellationToken);
            return Ok(ApiResponse<BackfillEmployeeAttendanceResultDto>.SuccessResponse(
                result,
                "Attendance backfilled."));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<object>.FailureResponse(ex.Message));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<object>.FailureResponse(ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<object>.FailureResponse(ex.Message));
        }
    }

    [HttpPost("mark-holiday")]
    public async Task<IActionResult> MarkHoliday(
        [FromBody] MarkEmployeeHolidayRequestDto request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _employeeAttendanceService.MarkDayAsHolidayAsync(
                request,
                ResolveUserId(),
                cancellationToken);
            return Ok(ApiResponse<MarkEmployeeHolidayResultDto>.SuccessResponse(result, "Holiday marked."));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<object>.FailureResponse(ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<object>.FailureResponse(ex.Message));
        }
    }

    [HttpPost("recalculate-duty-times")]
    public async Task<IActionResult> RecalculateDutyTimes(
        [FromBody] RecalculateDutyTimesRequestDto request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _employeeAttendanceService.RecalculateDutyTimesAsync(
                request,
                ResolveUserId(),
                cancellationToken);
            return Ok(ApiResponse<RecalculateDutyTimesResultDto>.SuccessResponse(
                result,
                "Late minutes were recalculated."));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<object>.FailureResponse(ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<object>.FailureResponse(ex.Message));
        }
    }

    [HttpGet("{id:int}/activity")]
    public async Task<IActionResult> GetAttendanceActivity(
        int id,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _employeeAttendanceService.GetAttendanceActivityAsync(id, cancellationToken);
            return Ok(ApiResponse<IReadOnlyList<ActivityLogDto>>.SuccessResponse(result));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<object>.FailureResponse(ex.Message));
        }
    }

    [HttpPost("mark")]
    public async Task<IActionResult> MarkAttendance(
        [FromBody] BiometricMarkAttendanceRequestDto request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _employeeAttendanceService.MarkBiometricAttendanceAsync(request, cancellationToken);
            return Ok(ApiResponse<BiometricMarkAttendanceResponseDto>.SuccessResponse(result, result.TimingMessage));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<BiometricMarkAttendanceResponseDto>.FailureResponse(ex.Message));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<BiometricMarkAttendanceResponseDto>.FailureResponse(ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(ApiResponse<BiometricMarkAttendanceResponseDto>.FailureResponse(ex.Message));
        }
    }

    private int? ResolveUserId() =>
        int.TryParse(User.FindFirst("FamilyDbId")?.Value, out var userId) && userId > 0
            ? userId
            : null;

    private static async Task<MemoryStream> CopyUploadAsync(IFormFile? file)
    {
        if (file == null || file.Length == 0)
            throw new ArgumentException("Choose an Excel file from the device.");

        var name = file.FileName ?? string.Empty;
        if (!name.EndsWith(".xls", StringComparison.OrdinalIgnoreCase) &&
            !name.EndsWith(".xlsx", StringComparison.OrdinalIgnoreCase))
        {
            throw new ArgumentException("Use an Excel file (.xls or .xlsx).");
        }

        var stream = new MemoryStream();
        await file.CopyToAsync(stream);
        stream.Position = 0;
        return stream;
    }

    private static EmployeeAttendanceImportRulesDto ParseImportRules(string? rulesJson)
    {
        if (string.IsNullOrWhiteSpace(rulesJson))
            throw new ArgumentException("Select dates and teacher times before importing.");

        var rules = JsonSerializer.Deserialize<EmployeeAttendanceImportRulesDto>(
            rulesJson,
            new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
        if (rules?.Dates is null || rules.Dates.Count == 0)
            throw new ArgumentException("Select dates and teacher times before importing.");

        return rules;
    }

    private static string BuildImportMessage(EmployeeAttendanceImportResultDto result)
    {
        var saved = result.CreatedCount + result.OverwrittenCount;
        if (saved == 0)
            return "No attendance rows were imported.";
        if (result.OverwrittenCount > 0 && result.CreatedCount > 0)
            return $"Imported {result.CreatedCount} new records and updated {result.OverwrittenCount} existing records.";
        if (result.OverwrittenCount > 0)
            return $"Updated {result.OverwrittenCount} existing attendance records.";
        return $"Imported {result.CreatedCount} attendance records.";
    }
}