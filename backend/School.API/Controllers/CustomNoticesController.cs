using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using School.Application.Common;
using School.Application.DTOs;
using School.Application.Interfaces;

namespace School.API.Controllers;

[ApiController]
[Authorize]
[Route("api/custom-notices")]
public class CustomNoticesController : ControllerBase
{
    private readonly ICustomNoticeService _service;

    public CustomNoticesController(ICustomNoticeService service)
    {
        _service = service;
    }

    [HttpPost("preview")]
    public async Task<IActionResult> Preview([FromBody] CustomNoticePreviewRequestDto? dto)
    {
        if (dto is null)
        {
            return BadRequest(ApiResponse<object>.FailureResponse("Request body is required."));
        }

        try
        {
            var result = await _service.PreviewAsync(dto);
            return Ok(ApiResponse<object>.SuccessResponse(result));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<object>.FailureResponse(ex.Message));
        }
    }
}
