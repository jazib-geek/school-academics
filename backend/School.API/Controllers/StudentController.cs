using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using School.Application.Common;
using School.Application.DTOs;
using School.Application.Interfaces;

namespace School.API.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public class StudentController : ControllerBase
{
    private readonly IStudentLedgerService _ledgerService;
    private readonly IStudentService _studentService;

    public StudentController(IStudentLedgerService ledgerService, IStudentService studentService)
    {
        _ledgerService = ledgerService;
        _studentService = studentService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAllStudents([FromQuery] StudentListFilterDto filter)
    {
        var result = await _studentService.GetStudentsAsync(filter);
        return Ok(ApiResponse<PagedResultDto<StudentListItemDto>>.SuccessResponse(result));
    }

    [HttpGet("family/{familyId:int}")]
    public async Task<IActionResult> GetStudentsByFamily(int familyId)
    {
        var result = await _studentService.GetFamilyMembersAsync(familyId);
        return Ok(ApiResponse<IReadOnlyList<StudentFamilyMemberDto>>.SuccessResponse(result));
    }

    [HttpGet("{studentId}/ledger")]
    public async Task<IActionResult> GetLedger(int studentId)
    {
        var result = await _ledgerService.GetStudentLedgerAsync(studentId);

        return Ok(ApiResponse<object>.SuccessResponse(result));
    }

    [HttpGet("{studentId}/fee-balance")]
    public async Task<IActionResult> GetFeeBalance(int studentId, [FromQuery] bool singleStudent = false)
    {
        try
        {
            var result = await _studentService.GetFeeBalanceAsync(studentId, singleStudent);
            return Ok(ApiResponse<StudentFeeBalanceDto>.SuccessResponse(result));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<object>.FailureResponse(ex.Message));
        }
    }

    [HttpPost("receive-fee")]
    public async Task<IActionResult> ReceiveFee([FromBody] ReceiveStudentFeeRequestDto request)
    {
        try
        {
            int? userId = int.TryParse(User.FindFirst("FamilyDbId")?.Value, out var parsedUserId)
                ? parsedUserId
                : null;

            var result = await _studentService.ReceiveFeeAsync(request, userId);
            return Ok(ApiResponse<ReceiveStudentFeeResponseDto>.SuccessResponse(result));
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

    [HttpGet("admission-lookups")]
    public async Task<IActionResult> GetAdmissionLookups(CancellationToken cancellationToken)
    {
        var result = await _studentService.GetAdmissionLookupsAsync(cancellationToken);
        return Ok(ApiResponse<StudentAdmissionLookupsDto>.SuccessResponse(result));
    }

    [HttpGet("families/next-code")]
    public async Task<IActionResult> GetNextFamilyCode(CancellationToken cancellationToken)
    {
        var code = await _studentService.GetNextFamilyCodeAsync(cancellationToken);
        return Ok(ApiResponse<object>.SuccessResponse(new { familyCode = code }));
    }

    [HttpGet("families/search")]
    public async Task<IActionResult> SearchFamilies([FromQuery] string? q, CancellationToken cancellationToken)
    {
        var result = await _studentService.SearchFamiliesAsync(q, cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<FamilySearchResultDto>>.SuccessResponse(result));
    }

    [HttpGet("families/{familyId:int}")]
    public async Task<IActionResult> GetFamily(int familyId, CancellationToken cancellationToken)
    {
        try
        {
            var result = await _studentService.GetFamilyAsync(familyId, cancellationToken);
            return Ok(ApiResponse<FamilySearchResultDto>.SuccessResponse(result));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<object>.FailureResponse(ex.Message));
        }
    }

    [HttpPost("register")]
    public async Task<IActionResult> RegisterStudent(
        [FromBody] StudentRegisterRequestDto request,
        CancellationToken cancellationToken)
    {
        try
        {
            int? userId = int.TryParse(User.FindFirst("FamilyDbId")?.Value, out var parsedUserId)
                ? parsedUserId
                : null;

            var result = await _studentService.RegisterStudentAsync(request, userId, cancellationToken);
            return Ok(ApiResponse<StudentRegisterResultDto>.SuccessResponse(result, "Student registered."));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<object>.FailureResponse(ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(ApiResponse<object>.FailureResponse(ex.Message));
        }
    }

    [HttpGet("{studentId:int}/admission")]
    public async Task<IActionResult> GetAdmissionDetail(int studentId, CancellationToken cancellationToken)
    {
        try
        {
            var result = await _studentService.GetAdmissionDetailAsync(studentId, cancellationToken);
            return Ok(ApiResponse<StudentAdmissionDetailDto>.SuccessResponse(result));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<object>.FailureResponse(ex.Message));
        }
    }

    [HttpPost("{studentId:int}/update")]
    public async Task<IActionResult> UpdateStudent(
        int studentId,
        [FromBody] StudentUpdateRequestDto request,
        CancellationToken cancellationToken)
    {
        try
        {
            int? userId = int.TryParse(User.FindFirst("FamilyDbId")?.Value, out var parsedUserId)
                ? parsedUserId
                : null;

            var result = await _studentService.UpdateStudentAsync(studentId, request, userId, cancellationToken);
            return Ok(ApiResponse<StudentUpdateResultDto>.SuccessResponse(result, "Student updated."));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<object>.FailureResponse(ex.Message));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<object>.FailureResponse(ex.Message));
        }
    }

    [HttpGet("bulk-edit")]
    public async Task<IActionResult> GetBulkEditStudents(
        [FromQuery] int classCompositeId,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _studentService.GetBulkEditStudentsAsync(classCompositeId, cancellationToken);
            return Ok(ApiResponse<IReadOnlyList<StudentBulkEditRowDto>>.SuccessResponse(result));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<object>.FailureResponse(ex.Message));
        }
    }

    [HttpPost("{studentId:int}/bulk-update")]
    public async Task<IActionResult> BulkUpdateStudent(
        int studentId,
        [FromBody] StudentBulkUpdateRequestDto request,
        CancellationToken cancellationToken)
    {
        try
        {
            int? userId = int.TryParse(User.FindFirst("FamilyDbId")?.Value, out var parsedUserId)
                ? parsedUserId
                : null;

            var result = await _studentService.BulkUpdateStudentAsync(studentId, request, userId, cancellationToken);
            return Ok(ApiResponse<StudentBulkUpdateResultDto>.SuccessResponse(result, "Student updated."));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<object>.FailureResponse(ex.Message));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<object>.FailureResponse(ex.Message));
        }
    }

    [HttpPost("{studentId:int}/transfer")]
    public async Task<IActionResult> TransferStudent(
        int studentId,
        [FromBody] StudentTransferRequestDto request,
        CancellationToken cancellationToken)
    {
        try
        {
            int? userId = int.TryParse(User.FindFirst("FamilyDbId")?.Value, out var parsedUserId)
                ? parsedUserId
                : null;

            var result = await _studentService.TransferStudentAsync(studentId, request, userId, cancellationToken);
            return Ok(ApiResponse<StudentTransferResultDto>.SuccessResponse(result, "Student transferred."));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<object>.FailureResponse(ex.Message));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<object>.FailureResponse(ex.Message));
        }
    }

    [HttpPost("{studentId:int}/update-fee")]
    public async Task<IActionResult> UpdateStudentTuitionFee(
        int studentId,
        [FromBody] StudentTuitionFeeUpdateRequestDto request,
        CancellationToken cancellationToken)
    {
        try
        {
            int? userId = int.TryParse(User.FindFirst("FamilyDbId")?.Value, out var parsedUserId)
                ? parsedUserId
                : null;

            var result = await _studentService.UpdateStudentTuitionFeeAsync(studentId, request, userId, cancellationToken);
            return Ok(ApiResponse<StudentTuitionFeeUpdateResultDto>.SuccessResponse(result, "Tuition fee updated."));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<object>.FailureResponse(ex.Message));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<object>.FailureResponse(ex.Message));
        }
    }

    [HttpPost("{studentId:int}/activate")]
    public async Task<IActionResult> ActivateStudent(
        int studentId,
        [FromBody] StudentActivationRequestDto request,
        CancellationToken cancellationToken)
    {
        try
        {
            int? userId = int.TryParse(User.FindFirst("FamilyDbId")?.Value, out var parsedUserId)
                ? parsedUserId
                : null;

            var result = await _studentService.ActivateStudentAsync(studentId, request, userId, cancellationToken);
            return Ok(ApiResponse<StudentActivationResultDto>.SuccessResponse(result, "Student activated."));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<object>.FailureResponse(ex.Message));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<object>.FailureResponse(ex.Message));
        }
    }

    [HttpPost("{studentId:int}/deactivate")]
    public async Task<IActionResult> DeactivateStudent(
        int studentId,
        [FromBody] StudentActivationRequestDto request,
        CancellationToken cancellationToken)
    {
        try
        {
            int? userId = int.TryParse(User.FindFirst("FamilyDbId")?.Value, out var parsedUserId)
                ? parsedUserId
                : null;

            var result = await _studentService.DeactivateStudentAsync(studentId, request, userId, cancellationToken);
            return Ok(ApiResponse<StudentActivationResultDto>.SuccessResponse(result, "Student deactivated."));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<object>.FailureResponse(ex.Message));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<object>.FailureResponse(ex.Message));
        }
    }
}
