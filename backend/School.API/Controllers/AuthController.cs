using Microsoft.AspNetCore.Mvc;
using School.Application.Common;
using School.Application.DTOs;
using School.Application.Interfaces;

namespace School.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;
    private readonly IEmployeeAuthService _employeeAuthService;
    private readonly IConfiguration _configuration;

    public AuthController(
        IAuthService authService,
        IEmployeeAuthService employeeAuthService,
        IConfiguration configuration)
    {
        _authService = authService;
        _employeeAuthService = employeeAuthService;
        _configuration = configuration;
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequestDto request)
    {
        var result = await _authService.LoginAsync(request);

        if (result == null)
        {
            return Unauthorized(
                ApiResponse<LoginResponseDto>
                    .FailureResponse("Invalid credentials.")
            );
        }

        return Ok(
            ApiResponse<LoginResponseDto>
                .SuccessResponse(result, "Login successful.")
        );
    }

    [HttpPost("campus-login")]
    public async Task<IActionResult> CampusLogin([FromBody] CampusLoginRequestDto request)
    {
        var result = await _authService.CampusLoginAsync(request);

        if (result == null)
        {
            return Unauthorized(
                ApiResponse<CampusLoginResponseDto>
                    .FailureResponse("Invalid username or password.")
            );
        }

        return Ok(
            ApiResponse<CampusLoginResponseDto>
                .SuccessResponse(result, "Login successful.")
        );
    }

    [HttpPost("employee-login")]
    public async Task<IActionResult> EmployeeLogin([FromBody] EmployeeLoginRequestDto request)
    {
        var result = await _employeeAuthService.LoginAsync(request);

        if (result == null)
        {
            return Unauthorized(
                ApiResponse<EmployeeLoginResponseDto>
                    .FailureResponse("Invalid employee ID or password.")
            );
        }

        return Ok(
            ApiResponse<EmployeeLoginResponseDto>
                .SuccessResponse(result, "Employee login successful.")
        );
    }

    [HttpGet("campuses")]
    public IActionResult GetCampuses()
    {
        var campuses = _configuration
            .GetSection("CampusSettings:Campuses")
            .GetChildren()
            .Select(x => x.Key)
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .ToList();

        return Ok(ApiResponse<List<string>>.SuccessResponse(campuses, "Campuses loaded."));
    }
}
