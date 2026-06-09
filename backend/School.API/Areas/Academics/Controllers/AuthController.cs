using Microsoft.AspNetCore.Mvc;
using School.Application.Academics.DTOs;
using School.Application.Academics.Interfaces;
using School.Application.Common;

namespace School.API.Areas.Academics.Controllers;

[Area("Academics")]
[ApiController]
[Route("api/academics/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAcademicAuthService _academicAuthService;

    public AuthController(IAcademicAuthService academicAuthService)
    {
        _academicAuthService = academicAuthService;
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] AcademicLoginRequestDto request)
    {
        var result = await _academicAuthService.LoginAsync(request);
        if (result == null)
        {
            return Unauthorized(
                ApiResponse<AcademicLoginResponseDto>.FailureResponse("Invalid username or password."));
        }

        return Ok(
            ApiResponse<AcademicLoginResponseDto>.SuccessResponse(result, "Academic login successful."));
    }
}
