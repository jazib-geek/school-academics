using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using School.Application.Common;
using School.Application.DTOs;
using School.Application.Interfaces;

namespace School.API.Controllers;

[ApiController]
[Authorize]
[Route("api/fee/receipts")]
public class FeeReceiptsController : ControllerBase
{
    private readonly IFeeReceiptHistoryService _service;

    public FeeReceiptsController(IFeeReceiptHistoryService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<IActionResult> Search(
        [FromQuery] DateTime? dateFrom,
        [FromQuery] DateTime? dateTo,
        [FromQuery] string? studentName,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _service.SearchAsync(
                new FeeReceiptHistoryQueryDto
                {
                    DateFrom = dateFrom,
                    DateTo = dateTo,
                    StudentName = studentName
                },
                cancellationToken);
            return Ok(ApiResponse<IReadOnlyList<FeeReceiptHistoryItemDto>>.SuccessResponse(result));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<object>.FailureResponse(ex.Message));
        }
    }

    [HttpGet("voided")]
    public async Task<IActionResult> GetVoided(
        [FromQuery] DateOnly? dateFrom,
        [FromQuery] DateOnly? dateTo,
        [FromQuery] string? studentName,
        [FromQuery] int? receiptId,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 25,
        CancellationToken cancellationToken = default)
    {
        var result = await _service.GetVoidedReceiptsAsync(
            new VoidedFeeReceiptQueryDto
            {
                DateFrom = dateFrom,
                DateTo = dateTo,
                StudentName = studentName,
                ReceiptId = receiptId,
                PageNumber = pageNumber,
                PageSize = pageSize
            },
            cancellationToken);
        return Ok(ApiResponse<PagedResultDto<VoidedFeeReceiptListItemDto>>.SuccessResponse(result));
    }

    [HttpGet("voided/{activityLogId:int}")]
    public async Task<IActionResult> GetVoidedForPrint(int activityLogId, CancellationToken cancellationToken)
    {
        try
        {
            var result = await _service.GetVoidedReceiptForPrintAsync(activityLogId, cancellationToken);
            return Ok(ApiResponse<StudentFeeReceiptDto>.SuccessResponse(result));
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

    [HttpGet("{receiptId:int}")]
    public async Task<IActionResult> GetForReprint(int receiptId, CancellationToken cancellationToken)
    {
        try
        {
            var result = await _service.GetReceiptForReprintAsync(receiptId, cancellationToken);
            return Ok(ApiResponse<StudentFeeReceiptDto>.SuccessResponse(result));
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

    [HttpPost("{receiptId:int}/void")]
    public async Task<IActionResult> Void(int receiptId, [FromBody] VoidFeeReceiptRequestDto? request, CancellationToken cancellationToken)
    {
        try
        {
            int? userId = int.TryParse(User.FindFirst("FamilyDbId")?.Value, out var parsedUserId)
                ? parsedUserId
                : null;

            await _service.VoidReceiptAsync(receiptId, request ?? new VoidFeeReceiptRequestDto(), userId, cancellationToken);
            return Ok(ApiResponse<object>.SuccessResponse(new { receiptId }, "Receipt voided."));
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

    [HttpPost("{receiptId:int}/edit")]
    public async Task<IActionResult> Edit(
        int receiptId,
        [FromBody] EditFeeReceiptRequestDto request,
        CancellationToken cancellationToken)
    {
        try
        {
            int? userId = int.TryParse(User.FindFirst("FamilyDbId")?.Value, out var parsedUserId)
                ? parsedUserId
                : null;

            await _service.EditReceiptAsync(receiptId, request ?? new EditFeeReceiptRequestDto(), userId, cancellationToken);
            return Ok(ApiResponse<object>.SuccessResponse(new { receiptId }, "Receipt updated."));
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
}
