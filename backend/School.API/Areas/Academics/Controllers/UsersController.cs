using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using School.Application.Academics.DTOs;
using School.Application.Academics.Interfaces;
using School.Application.Common;
using School.Application.DTOs;

namespace School.API.Areas.Academics.Controllers;

[Area("Academics")]
[ApiController]
[Authorize(Policy = "AcademicsOnly")]
[Route("api/academics/users")]
public class UsersController : ControllerBase
{
    private readonly IAcademicUserService _userService;

    public UsersController(IAcademicUserService userService)
    {
        _userService = userService;
    }

    [HttpGet("permissions")]
    public async Task<IActionResult> GetPermissionCatalog(CancellationToken cancellationToken)
    {
        var result = await _userService.GetPermissionCatalogAsync(cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<PermissionGroupDto>>.SuccessResponse(result));
    }

    [HttpGet]
    public async Task<IActionResult> GetUsers(CancellationToken cancellationToken)
    {
        var result = await _userService.GetUsersAsync(cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<AcademicUserListItemDto>>.SuccessResponse(result));
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetUser(int id, CancellationToken cancellationToken)
    {
        try
        {
            var result = await _userService.GetUserAsync(id, cancellationToken);
            return Ok(ApiResponse<AcademicUserDto>.SuccessResponse(result));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<object>.FailureResponse(ex.Message));
        }
    }

    [HttpPost]
    public async Task<IActionResult> CreateUser(
        [FromBody] AcademicUserUpsertDto request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _userService.CreateUserAsync(request, cancellationToken);
            return CreatedAtAction(
                nameof(GetUser),
                new { id = result.Id },
                ApiResponse<AcademicUserDto>.SuccessResponse(result, "User created."));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<object>.FailureResponse(ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(ApiResponse<object>.FailureResponse(ex.Message));
        }
        catch (DbUpdateException)
        {
            return Conflict(ApiResponse<object>.FailureResponse(
                "The user could not be created because a unique value is already in use."));
        }
    }

    [HttpPost("{id:int}/update")]
    public async Task<IActionResult> UpdateUser(
        int id,
        [FromBody] AcademicUserUpsertDto request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _userService.UpdateUserAsync(id, request, cancellationToken);
            return Ok(ApiResponse<AcademicUserDto>.SuccessResponse(result, "User updated."));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<object>.FailureResponse(ex.Message));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<object>.FailureResponse(ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(ApiResponse<object>.FailureResponse(ex.Message));
        }
        catch (DbUpdateException)
        {
            return Conflict(ApiResponse<object>.FailureResponse(
                "The user could not be updated because a unique value is already in use."));
        }
    }

    [HttpPost("{id:int}/status")]
    public async Task<IActionResult> SetUserStatus(
        int id,
        [FromBody] AcademicUserStatusUpdateDto request,
        CancellationToken cancellationToken)
    {
        try
        {
            await _userService.SetUserStatusAsync(id, request.IsActive, cancellationToken);
            var message = request.IsActive ? "User activated." : "User deactivated.";
            return Ok(ApiResponse<object>.SuccessResponse(new { }, message));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<object>.FailureResponse(ex.Message));
        }
    }

    [HttpPost("{id:int}/password")]
    public async Task<IActionResult> ForceChangePassword(
        int id,
        [FromBody] ForceChangeAcademicPasswordDto request,
        CancellationToken cancellationToken)
    {
        try
        {
            await _userService.ForceChangePasswordAsync(id, request, cancellationToken);
            return Ok(ApiResponse<object>.SuccessResponse(new { }, "Password updated."));
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
