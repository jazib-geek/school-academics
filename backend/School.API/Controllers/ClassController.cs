using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using School.Application.Common;
using School.Application.DTOs;
using School.Application.Interfaces;

namespace School.API.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public class ClassController : ControllerBase
{
    private readonly IClassService _classService;

    public ClassController(IClassService classService)
    {
        _classService = classService;
    }

    [HttpGet]
    public async Task<IActionResult> GetClasses()
    {
        var result = await _classService.GetClassesAsync();
        return Ok(ApiResponse<List<ClassLookupDto>>.SuccessResponse(result));
    }

    /// <summary>Class levels from tblClass (e.g. Playgroup, Nursery, One … Ten).</summary>
    [HttpGet("levels")]
    public async Task<IActionResult> GetClassLevels()
    {
        var result = await _classService.GetClassLevelsAsync();
        return Ok(ApiResponse<List<ClassLookupDto>>.SuccessResponse(result));
    }
}
