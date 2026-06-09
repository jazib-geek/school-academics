using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using School.Application.Common;
using School.Application.DTOs;
using School.Application.Interfaces;

namespace School.API.Controllers;

[ApiController]
[Authorize]
[Route("api/employee-attendance")]
public class EmployeeAttendanceController : ControllerBase
{
    private readonly IEmployeeAttendanceService _employeeAttendanceService;

    public EmployeeAttendanceController(IEmployeeAttendanceService employeeAttendanceService)
    {
        _employeeAttendanceService = employeeAttendanceService;
    }

    [HttpGet("monthly")]
    public async Task<IActionResult> GetMonthlySheet(
        [FromQuery] int? year,
        [FromQuery] int? month,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _employeeAttendanceService.GetMonthlySheetAsync(year, month, cancellationToken);
            return Ok(ApiResponse<EmployeeAttendanceMonthlySheetDto>.SuccessResponse(result));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<EmployeeAttendanceMonthlySheetDto>.FailureResponse(ex.Message));
        }
    }
}
