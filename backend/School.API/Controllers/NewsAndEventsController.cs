using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using School.Application.Common;
using School.Application.DTOs;
using School.Application.Interfaces;

namespace School.API.Controllers;

[ApiController]
[Authorize]
[Route("api/NewsAndEvents")]
public class NewsAndEventsController : ControllerBase
{
    private readonly INewsAndEventService _service;

    public NewsAndEventsController(INewsAndEventService service)
    {
        _service = service;
    }

    /// <summary>Parent / public feed: active announcements only.</summary>
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var result = await _service.GetActiveAsync(false);
        return Ok(ApiResponse<object>.SuccessResponse(result));
    }

    /// <summary>Parent home feed: active announcements marked show-on-home.</summary>
    [HttpGet("home")]
    public async Task<IActionResult> GetHome()
    {
        var result = await _service.GetActiveAsync(true);
        return Ok(ApiResponse<object>.SuccessResponse(result));
    }

    [HttpGet("manage")]
    public async Task<IActionResult> GetManageList(CancellationToken cancellationToken)
    {
        var result = await _service.GetManageListAsync(cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<NewsAndEventManageDto>>.SuccessResponse(result));
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id, CancellationToken cancellationToken)
    {
        try
        {
            var result = await _service.GetByIdAsync(id, cancellationToken);
            return Ok(ApiResponse<NewsAndEventManageDto>.SuccessResponse(result));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<object>.FailureResponse(ex.Message));
        }
    }

    [HttpPost]
    public async Task<IActionResult> Create(
        [FromBody] UpsertNewsAndEventRequestDto request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _service.CreateAsync(request, cancellationToken);
            return Ok(ApiResponse<NewsAndEventManageDto>.SuccessResponse(result, "Announcement saved."));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<object>.FailureResponse(ex.Message));
        }
    }

    [HttpPost("{id:int}/update")]
    public async Task<IActionResult> Update(
        int id,
        [FromBody] UpsertNewsAndEventRequestDto request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _service.UpdateAsync(id, request, cancellationToken);
            return Ok(ApiResponse<NewsAndEventManageDto>.SuccessResponse(result, "Announcement updated."));
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

    [HttpPost("{id:int}/status")]
    public async Task<IActionResult> SetStatus(
        int id,
        [FromBody] SetNewsAndEventStatusDto request,
        CancellationToken cancellationToken)
    {
        try
        {
            await _service.SetActiveAsync(id, request.IsActive, cancellationToken);
            return Ok(ApiResponse<object>.SuccessResponse(
                new { },
                request.IsActive ? "Announcement activated." : "Announcement deactivated."));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<object>.FailureResponse(ex.Message));
        }
    }
}

public class SetNewsAndEventStatusDto
{
    public bool IsActive { get; set; }
}
