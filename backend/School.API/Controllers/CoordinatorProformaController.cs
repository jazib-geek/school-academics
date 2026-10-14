using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using School.Application.Common;
using School.Application.DTOs;
using School.Application.Interfaces;

namespace School.API.Controllers;

[ApiController]
[Authorize]
[Route("api/employee/coordinator/proforma")]
public class CoordinatorProformaController : ControllerBase
{
    private readonly ICoordinatorProformaService _proformaService;
    private readonly ICoordinatorAccessService _coordinatorAccessService;
    private readonly IAcademicHeadAccessService _academicHeadAccessService;

    public CoordinatorProformaController(
        ICoordinatorProformaService proformaService,
        ICoordinatorAccessService coordinatorAccessService,
        IAcademicHeadAccessService academicHeadAccessService)
    {
        _proformaService = proformaService;
        _coordinatorAccessService = coordinatorAccessService;
        _academicHeadAccessService = academicHeadAccessService;
    }

    [HttpGet("me")]
    public async Task<IActionResult> GetMyDay([FromQuery] DateOnly? reportDate, CancellationToken cancellationToken)
    {
        var auth = await EnsureCoordinatorAsync(cancellationToken);
        if (!auth.Success)
            return auth.ErrorResult!;

        var date = reportDate ?? PakistanTime.Today;
        var result = await _proformaService.GetMyDayAsync(auth.EmployeeId, date, cancellationToken);
        return Ok(ApiResponse<CoordinatorProformaDayDto>.SuccessResponse(result));
    }

    [HttpPost("me/save")]
    public async Task<IActionResult> SaveMyDay([FromBody] CoordinatorProformaSaveRequestDto request, CancellationToken cancellationToken)
    {
        var auth = await EnsureCoordinatorAsync(cancellationToken);
        if (!auth.Success)
            return auth.ErrorResult!;

        try
        {
            var result = await _proformaService.SaveMyDayAsync(auth.EmployeeId, request, cancellationToken);
            return Ok(ApiResponse<CoordinatorProformaDayDto>.SuccessResponse(result, "Report saved."));
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

    [HttpGet("lookups")]
    public async Task<IActionResult> GetLookups(CancellationToken cancellationToken)
    {
        var auth = await EnsureCoordinatorAsync(cancellationToken);
        if (!auth.Success)
            return auth.ErrorResult!;

        var result = await _proformaService.GetLookupsAsync(cancellationToken);
        return Ok(ApiResponse<CoordinatorProformaLookupsDto>.SuccessResponse(result));
    }

    [HttpPost("me/submit")]
    public async Task<IActionResult> SubmitMyDay([FromBody] CoordinatorProformaSubmitRequestDto request, CancellationToken cancellationToken)
    {
        var auth = await EnsureCoordinatorAsync(cancellationToken);
        if (!auth.Success)
            return auth.ErrorResult!;

        try
        {
            var result = await _proformaService.SubmitMyDayAsync(auth.EmployeeId, request, cancellationToken);
            return Ok(ApiResponse<CoordinatorProformaDayDto>.SuccessResponse(result, "Report submitted."));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<object>.FailureResponse(ex.Message));
        }
    }

    [HttpGet("monitor/campuses")]
    public async Task<IActionResult> GetMonitorCampuses(CancellationToken cancellationToken)
    {
        var auth = await EnsureAcademicHeadAsync(cancellationToken);
        if (!auth.Success)
            return auth.ErrorResult!;

        var result = await _proformaService.GetMonitorCampusesAsync(cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<CoordinatorProformaMonitorCampusDto>>.SuccessResponse(result));
    }

    [HttpGet("monitor")]
    public async Task<IActionResult> GetMonitorDay([FromQuery] CoordinatorProformaMonitorQueryDto query, CancellationToken cancellationToken)
    {
        var auth = await EnsureAcademicHeadAsync(cancellationToken);
        if (!auth.Success)
            return auth.ErrorResult!;

        var date = query.ReportDate ?? PakistanTime.Today;
        var campusKey = string.IsNullOrWhiteSpace(query.CampusKey)
            ? HttpContext.Request.Headers["X-Campus"].ToString().Trim().ToLowerInvariant()
            : query.CampusKey.Trim().ToLowerInvariant();

        if (string.IsNullOrWhiteSpace(campusKey))
            return BadRequest(ApiResponse<object>.FailureResponse("Choose a campus."));

        try
        {
            var result = await _proformaService.GetMonitorDayAsync(date, campusKey, cancellationToken);
            return Ok(ApiResponse<CoordinatorProformaMonitorDayDto>.SuccessResponse(result));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<object>.FailureResponse(ex.Message));
        }
    }

    [HttpGet("monitor/{reportId:int}")]
    public async Task<IActionResult> GetMonitorReport(
        int reportId,
        [FromQuery] string campusKey,
        CancellationToken cancellationToken)
    {
        var auth = await EnsureAcademicHeadAsync(cancellationToken);
        if (!auth.Success)
            return auth.ErrorResult!;

        if (string.IsNullOrWhiteSpace(campusKey))
            return BadRequest(ApiResponse<object>.FailureResponse("Choose a campus."));

        var result = await _proformaService.GetMonitorReportAsync(reportId, campusKey.Trim().ToLowerInvariant(), cancellationToken);
        if (result == null)
            return NotFound(ApiResponse<object>.FailureResponse("Report not found."));

        return Ok(ApiResponse<CoordinatorProformaMonitorRowDto>.SuccessResponse(result));
    }

    [HttpPost("monitor/{reportId:int}/acknowledge")]
    public async Task<IActionResult> Acknowledge(int reportId, [FromQuery] string campusKey, CancellationToken cancellationToken)
    {
        var auth = await EnsureAcademicHeadAsync(cancellationToken);
        if (!auth.Success)
            return auth.ErrorResult!;

        await _proformaService.AcknowledgeAsync(auth.EmployeeId, campusKey.Trim().ToLowerInvariant(), reportId, cancellationToken);
        return Ok(ApiResponse<object>.SuccessResponse(null, "Report acknowledged."));
    }

    [HttpPost("monitor/{reportId:int}/approve")]
    public async Task<IActionResult> Approve(int reportId, [FromQuery] string campusKey, CancellationToken cancellationToken)
    {
        var auth = await EnsureAcademicHeadAsync(cancellationToken);
        if (!auth.Success)
            return auth.ErrorResult!;

        await _proformaService.ApproveAsync(auth.EmployeeId, campusKey.Trim().ToLowerInvariant(), reportId, cancellationToken);
        return Ok(ApiResponse<object>.SuccessResponse(null, "Report approved."));
    }

    [HttpPost("monitor/{reportId:int}/return")]
    public async Task<IActionResult> Return(int reportId, [FromQuery] string campusKey, [FromBody] CoordinatorProformaReviewRequestDto request, CancellationToken cancellationToken)
    {
        var auth = await EnsureAcademicHeadAsync(cancellationToken);
        if (!auth.Success)
            return auth.ErrorResult!;

        try
        {
            await _proformaService.ReturnAsync(auth.EmployeeId, campusKey.Trim().ToLowerInvariant(), reportId, request.Note ?? string.Empty, cancellationToken);
            return Ok(ApiResponse<object>.SuccessResponse(null, "Returned for correction."));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<object>.FailureResponse(ex.Message));
        }
    }

    [HttpPost("monitor/{reportId:int}/comment")]
    public async Task<IActionResult> AddComment(int reportId, [FromQuery] string campusKey, [FromBody] CoordinatorProformaReviewRequestDto request, CancellationToken cancellationToken)
    {
        var auth = await EnsureAcademicHeadAsync(cancellationToken);
        if (!auth.Success)
            return auth.ErrorResult!;

        try
        {
            await _proformaService.AddHeadCommentAsync(auth.EmployeeId, campusKey.Trim().ToLowerInvariant(), reportId, request.Note ?? string.Empty, cancellationToken);
            return Ok(ApiResponse<object>.SuccessResponse(null, "Note added."));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<object>.FailureResponse(ex.Message));
        }
    }

    private async Task<(bool Success, int EmployeeId, IActionResult? ErrorResult)> EnsureCoordinatorAsync(CancellationToken cancellationToken)
    {
        var auth = await _coordinatorAccessService.EnsureCoordinatorAsync(User, cancellationToken);
        if (auth.Success)
            return (true, auth.EmployeeId, null);

        IActionResult error = auth.StatusCode switch
        {
            401 => Unauthorized(ApiResponse<object>.FailureResponse(auth.ErrorMessage ?? "Unauthorized.")),
            _ => StatusCode(auth.StatusCode, ApiResponse<object>.FailureResponse(auth.ErrorMessage ?? "Forbidden.")),
        };
        return (false, 0, error);
    }

    private async Task<(bool Success, int EmployeeId, IActionResult? ErrorResult)> EnsureAcademicHeadAsync(CancellationToken cancellationToken)
    {
        var auth = await _academicHeadAccessService.EnsureAcademicHeadAsync(User, cancellationToken);
        if (auth.Success)
            return (true, auth.EmployeeId, null);

        IActionResult error = auth.StatusCode switch
        {
            401 => Unauthorized(ApiResponse<object>.FailureResponse(auth.ErrorMessage ?? "Unauthorized.")),
            _ => StatusCode(auth.StatusCode, ApiResponse<object>.FailureResponse(auth.ErrorMessage ?? "Forbidden.")),
        };
        return (false, 0, error);
    }
}
