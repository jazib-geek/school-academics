using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using School.Application.Common;
using School.Application.DTOs;
using School.Application.Interfaces;

namespace School.API.Controllers;

[ApiController]
[Authorize]
[Route("api/campus/profile")]
public class CampusProfileController : ControllerBase
{
    private readonly ICampusProfileService _service;

    public CampusProfileController(ICampusProfileService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken cancellationToken)
    {
        var result = await _service.GetAsync(cancellationToken);
        return Ok(ApiResponse<CampusProfileDto>.SuccessResponse(result));
    }

    [HttpPost("update")]
    public async Task<IActionResult> Update(
        [FromBody] UpdateCampusProfileDto request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _service.UpdateAsync(request, cancellationToken);
            return Ok(ApiResponse<CampusProfileDto>.SuccessResponse(result, "Saved."));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<object>.FailureResponse(ex.Message));
        }
    }
}
