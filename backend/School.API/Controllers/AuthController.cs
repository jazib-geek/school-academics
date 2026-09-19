using Microsoft.AspNetCore.Authorization;
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
                    .FailureResponse("Invalid username or password.")
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

    [Authorize]
    [HttpPost("switch-campus")]
    public async Task<IActionResult> SwitchCampus(
        [FromBody] SwitchCampusRequestDto request,
        CancellationToken cancellationToken)
    {
        if (!int.TryParse(User.FindFirst("FamilyDbId")?.Value, out var userId) || userId <= 0)
        {
            return Unauthorized(ApiResponse<object>.FailureResponse("You must be signed in to switch campus."));
        }

        try
        {
            var result = await _authService.SwitchCampusAsync(userId, request, cancellationToken);
            return Ok(ApiResponse<CampusLoginResponseDto>.SuccessResponse(result, "Campus switched."));
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(ApiResponse<object>.FailureResponse(ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<object>.FailureResponse(ex.Message));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<object>.FailureResponse(ex.Message));
        }
    }

    [Authorize]
    [HttpPost("login-as")]
    public async Task<IActionResult> LoginAs(
        [FromBody] LoginAsCampusUserRequestDto request,
        CancellationToken cancellationToken)
    {
        if (!int.TryParse(User.FindFirst("FamilyDbId")?.Value, out var userId) || userId <= 0)
        {
            return Unauthorized(ApiResponse<object>.FailureResponse("You must be signed in to use Login as."));
        }

        try
        {
            var result = await _authService.LoginAsAsync(userId, request, cancellationToken);
            return Ok(ApiResponse<CampusLoginResponseDto>.SuccessResponse(result, "Signed in as selected user."));
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(ApiResponse<object>.FailureResponse(ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<object>.FailureResponse(ex.Message));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<object>.FailureResponse(ex.Message));
        }
    }

    [Authorize]
    [HttpPost("change-password")]
    public async Task<IActionResult> ChangeCampusPassword(
        [FromBody] ChangeCampusPasswordDto request,
        CancellationToken cancellationToken)
    {
        if (!int.TryParse(User.FindFirst("FamilyDbId")?.Value, out var userId) || userId <= 0)
        {
            return Unauthorized(ApiResponse<object>.FailureResponse("You must be signed in to change your password."));
        }

        try
        {
            await _authService.ChangeCampusPasswordAsync(userId, request, cancellationToken);
            return Ok(ApiResponse<object>.SuccessResponse(
                new { },
                "Password changed. Please sign in again."));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<object>.FailureResponse(ex.Message));
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(ApiResponse<object>.FailureResponse(ex.Message));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<object>.FailureResponse(ex.Message));
        }
    }

    [Authorize]
    [HttpGet("employee-session")]
    public async Task<IActionResult> GetEmployeeSession(CancellationToken cancellationToken)
    {
        var authSource = User.FindFirst(AuthSourceClaims.ClaimType)?.Value;
        if (!string.Equals(authSource, AuthSourceClaims.Employee, StringComparison.OrdinalIgnoreCase))
        {
            return Unauthorized(ApiResponse<object>.FailureResponse("Employee sign-in is required."));
        }

        if (!int.TryParse(User.FindFirst("FamilyDbId")?.Value, out var employeeId) || employeeId <= 0)
        {
            return Unauthorized(ApiResponse<object>.FailureResponse("You must be signed in."));
        }

        var session = await _employeeAuthService.GetSessionAsync(employeeId, cancellationToken);
        if (session == null)
        {
            return NotFound(ApiResponse<object>.FailureResponse("Employee was not found."));
        }

        return Ok(ApiResponse<EmployeeSessionDto>.SuccessResponse(session, "Session loaded."));
    }

    [Authorize]
    [HttpPost("employee-change-password")]
    public async Task<IActionResult> ChangeEmployeePassword(
        [FromBody] ChangeEmployeePasswordDto request,
        CancellationToken cancellationToken)
    {
        var authSource = User.FindFirst(AuthSourceClaims.ClaimType)?.Value;
        if (!string.Equals(authSource, AuthSourceClaims.Employee, StringComparison.OrdinalIgnoreCase))
        {
            return Unauthorized(ApiResponse<object>.FailureResponse("Employee sign-in is required."));
        }

        if (!int.TryParse(User.FindFirst("FamilyDbId")?.Value, out var employeeId) || employeeId <= 0)
        {
            return Unauthorized(ApiResponse<object>.FailureResponse("You must be signed in to change your password."));
        }

        try
        {
            await _employeeAuthService.ChangePasswordAsync(employeeId, request, cancellationToken);
            return Ok(ApiResponse<object>.SuccessResponse(
                new { },
                "Password changed. Please sign in again."));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<object>.FailureResponse(ex.Message));
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(ApiResponse<object>.FailureResponse(ex.Message));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<object>.FailureResponse(ex.Message));
        }
    }
}
