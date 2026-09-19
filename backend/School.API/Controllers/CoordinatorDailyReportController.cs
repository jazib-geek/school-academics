using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using School.Application.Common;
using School.Application.DTOs;
using School.Application.Interfaces;
using School.Infrastructure.Repositories;

namespace School.API.Controllers;

/// <summary>
/// Employee Portal — coordinator daily updates for head office (campus DB).
/// Uses JWT from employee login; employee id is taken from the <c>FamilyDbId</c> claim (same token shape as other campus APIs).
/// All mutations use POST (Plesk blocks PUT at the edge).
/// </summary>
[ApiController]
[Authorize]
[Route("api/employee/coordinator/daily-report")]
public class CoordinatorDailyReportController : ControllerBase
{
    private readonly ICoordinatorDailyReportService _coordinatorDailyReportService;
    private readonly ICoordinatorAccessService _coordinatorAccessService;
    private readonly ICoordinatorStaffReadRepository _staffReadRepository;

    public CoordinatorDailyReportController(
        ICoordinatorDailyReportService coordinatorDailyReportService,
        ICoordinatorAccessService coordinatorAccessService,
        ICoordinatorStaffReadRepository staffReadRepository)
    {
        _coordinatorDailyReportService = coordinatorDailyReportService;
        _coordinatorAccessService = coordinatorAccessService;
        _staffReadRepository = staffReadRepository;
    }

    /// <summary>Active employees for MOD / absent-teacher pickers (tblEmployee).</summary>
    [HttpGet("me/staff-for-pick")]
    public async Task<IActionResult> GetStaffForPick(CancellationToken cancellationToken)
    {
        var auth = await EnsureCoordinatorAsync(cancellationToken);
        if (!auth.Success)
        {
            return auth.ErrorResult!;
        }

        var tuples = await _staffReadRepository.GetActiveEmployeesAsync(cancellationToken);
        var dto = tuples
            .Select(t => new CoordinatorEmployeePickDto { Id = t.Id, EmployeeName = t.EmployeeName })
            .ToList();

        return Ok(ApiResponse<List<CoordinatorEmployeePickDto>>.SuccessResponse(dto));
    }

    /// <summary>Load persisted coordinator report for a date (null Data if none yet).</summary>
    [HttpGet("me")]
    public async Task<IActionResult> GetMyReport([FromQuery] DateOnly? reportDate, CancellationToken cancellationToken)
    {
        var auth = await EnsureCoordinatorAsync(cancellationToken);
        if (!auth.Success)
        {
            return auth.ErrorResult!;
        }

        var date = reportDate ?? DateOnly.FromDateTime(DateTime.Today);
        var result = await _coordinatorDailyReportService.GetReportAsync(auth.EmployeeId, date, cancellationToken);
        return Ok(ApiResponse<CoordinatorDailyReportDto?>.SuccessResponse(result));
    }

    /// <summary>
    /// Campus admin (JWT from campus login): read-only monitor of all coordinator daily reports for a date,
    /// plus campus-wide class attendance totals. Route is absolute so it is not under <c>api/employee/…</c>.
    /// </summary>
    [HttpGet("/api/campus/coordinator-daily-report/monitor")]
    public async Task<IActionResult> GetCampusDailyReportingMonitor(
        [FromQuery] DateOnly? reportDate,
        CancellationToken cancellationToken)
    {
        var date = reportDate ?? DateOnly.FromDateTime(DateTime.Today);
        var result = await _coordinatorDailyReportService.GetCampusDailyReportingMonitorAsync(date, cancellationToken);
        return Ok(ApiResponse<CoordinatorDailyReportCampusMonitorDto>.SuccessResponse(result));
    }

    /// <summary>Report + class-wise present/total for head office (attendance is computed, not stored on coordinator tables).</summary>
    [HttpGet("me/head-office-bundle")]
    public async Task<IActionResult> GetMyHeadOfficeBundle([FromQuery] DateOnly? reportDate, CancellationToken cancellationToken)
    {
        var auth = await EnsureCoordinatorAsync(cancellationToken);
        if (!auth.Success)
        {
            return auth.ErrorResult!;
        }

        var date = reportDate ?? DateOnly.FromDateTime(DateTime.Today);
        var result = await _coordinatorDailyReportService.GetHeadOfficeDayBundleAsync(auth.EmployeeId, date, cancellationToken);
        return Ok(ApiResponse<CoordinatorHeadOfficeDayBundleDto>.SuccessResponse(result));
    }

    [HttpPost("me/arrival")]
    public async Task<IActionResult> PostMyArrival([FromBody] CoordinatorArrivalPostRequestDto request, CancellationToken cancellationToken)
    {
        var auth = await EnsureCoordinatorAsync(cancellationToken);
        if (!auth.Success)
        {
            return auth.ErrorResult!;
        }

        try
        {
            var result = await _coordinatorDailyReportService.UpsertArrivalAsync(
                auth.EmployeeId,
                request.ReportDate,
                request.ArrivalTime,
                cancellationToken);

            return Ok(ApiResponse<CoordinatorDailyReportDto>.SuccessResponse(result, "Arrival saved."));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<object>.FailureResponse(ex.Message));
        }
    }

    [HttpPost("me/assembly")]
    public async Task<IActionResult> PostMyAssembly([FromBody] CoordinatorAssemblyPostRequestDto request, CancellationToken cancellationToken)
    {
        var auth = await EnsureCoordinatorAsync(cancellationToken);
        if (!auth.Success)
        {
            return auth.ErrorResult!;
        }

        try
        {
            var dto = new CoordinatorAssemblyUpsertDto
            {
                AssemblyConductedPerPolicy = request.AssemblyConductedPerPolicy,
                MoralLessonTopic = request.MoralLessonTopic,
                UniformCheckNotes = request.UniformCheckNotes,
                CampusCleanlinessNotes = request.CampusCleanlinessNotes,
                TeachersInClassesNotes = request.TeachersInClassesNotes
            };

            var result = await _coordinatorDailyReportService.UpsertAssemblyAsync(
                auth.EmployeeId,
                request.ReportDate,
                dto,
                cancellationToken);

            return Ok(ApiResponse<CoordinatorDailyReportDto>.SuccessResponse(result, "Assembly details saved."));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<object>.FailureResponse(ex.Message));
        }
    }

    /// <summary>Replace all MOD rows for the day (Assembly / Break / OffTime / Other).</summary>
    [HttpPost("me/mod-duties")]
    public async Task<IActionResult> PostMyModDuties([FromBody] CoordinatorModDutiesPostRequestDto request, CancellationToken cancellationToken)
    {
        var auth = await EnsureCoordinatorAsync(cancellationToken);
        if (!auth.Success)
        {
            return auth.ErrorResult!;
        }

        try
        {
            var result = await _coordinatorDailyReportService.ReplaceModDutiesAsync(
                auth.EmployeeId,
                request.ReportDate,
                request.Duties,
                cancellationToken);

            return Ok(ApiResponse<CoordinatorDailyReportDto>.SuccessResponse(result, "MOD duties saved."));
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

    /// <summary>Replace absent-teacher rows for the day (employees must exist in tblEmployee).</summary>
    [HttpPost("me/absent-teachers")]
    public async Task<IActionResult> PostMyAbsentTeachers([FromBody] CoordinatorAbsentTeachersPostRequestDto request, CancellationToken cancellationToken)
    {
        var auth = await EnsureCoordinatorAsync(cancellationToken);
        if (!auth.Success)
        {
            return auth.ErrorResult!;
        }

        try
        {
            var result = await _coordinatorDailyReportService.ReplaceAbsentTeachersAsync(
                auth.EmployeeId,
                request.ReportDate,
                request.AbsentTeachers,
                cancellationToken);

            return Ok(ApiResponse<CoordinatorDailyReportDto>.SuccessResponse(result, "Absent teachers saved."));
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

    /// <summary>Replace daily working report bullet lines for the day.</summary>
    [HttpPost("me/working-report-lines")]
    public async Task<IActionResult> PostMyWorkingReportLines([FromBody] CoordinatorWorkingReportLinesPostRequestDto request, CancellationToken cancellationToken)
    {
        var auth = await EnsureCoordinatorAsync(cancellationToken);
        if (!auth.Success)
        {
            return auth.ErrorResult!;
        }

        try
        {
            var result = await _coordinatorDailyReportService.ReplaceWorkingReportLinesAsync(
                auth.EmployeeId,
                request.ReportDate,
                request.Lines,
                cancellationToken);

            return Ok(ApiResponse<CoordinatorDailyReportDto>.SuccessResponse(result, "Working report saved."));
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

    private async Task<(bool Success, int EmployeeId, IActionResult? ErrorResult)> EnsureCoordinatorAsync(
        CancellationToken cancellationToken)
    {
        var auth = await _coordinatorAccessService.EnsureCoordinatorAsync(User, cancellationToken);
        if (auth.Success)
        {
            return (true, auth.EmployeeId, null);
        }

        IActionResult error = auth.StatusCode switch
        {
            StatusCodes.Status401Unauthorized => Unauthorized(
                ApiResponse<object>.FailureResponse(auth.ErrorMessage ?? "Unauthorized.")),
            _ => StatusCode(
                auth.StatusCode,
                ApiResponse<object>.FailureResponse(auth.ErrorMessage ?? "Forbidden.")),
        };

        return (false, 0, error);
    }
}
