using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using School.Application.Common;
using School.Application.DTOs;
using School.Application.Interfaces;

namespace School.API.Controllers;

[ApiController]
[Authorize]
[Route("api/fee-reminder-notices")]
public class FeeReminderNoticesController : ControllerBase
{
    private readonly IFeeReminderNoticeService _service;

    public FeeReminderNoticesController(IFeeReminderNoticeService service)
    {
        _service = service;
    }

    [HttpGet("templates")]
    public async Task<IActionResult> GetTemplates()
    {
        var result = await _service.GetTemplatesAsync();
        return Ok(ApiResponse<object>.SuccessResponse(result));
    }

    [HttpPost("templates/{code}/update")]
    public async Task<IActionResult> UpdateTemplate(string code, [FromBody] FeeReminderNoticeTemplateUpdateDto? dto)
    {
        if (dto is null)
        {
            return BadRequest(ApiResponse<object>.FailureResponse("Request body is required."));
        }

        if (string.IsNullOrWhiteSpace(dto.Title) || string.IsNullOrWhiteSpace(dto.BodyText))
        {
            return BadRequest(ApiResponse<object>.FailureResponse("Title and message body are required."));
        }

        if (dto.DayOfMonth is < 1 or > 31)
        {
            return BadRequest(ApiResponse<object>.FailureResponse("Day of month must be between 1 and 31."));
        }

        var result = await _service.UpdateTemplateAsync(code, dto);
        if (result is null)
        {
            return NotFound(ApiResponse<object>.FailureResponse("Notice template not found."));
        }

        return Ok(ApiResponse<object>.SuccessResponse(result));
    }

    [HttpGet("class-balances")]
    public async Task<IActionResult> GetClassBalances([FromQuery] string? className)
    {
        if (string.IsNullOrWhiteSpace(className))
        {
            return BadRequest(ApiResponse<object>.FailureResponse("className is required."));
        }

        var result = await _service.GetClassBalancesAsync(className);
        return Ok(ApiResponse<object>.SuccessResponse(result));
    }
}
