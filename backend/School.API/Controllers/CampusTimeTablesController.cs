using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using School.API.Filters;
using School.Application.Common;
using School.Application.DTOs;
using School.Application.Interfaces;

namespace School.API.Controllers;

[ApiController]
[Authorize]
[AuthorizeCampusOrEmployee]
[Route("api/campus/timetables")]
public class CampusTimeTablesController : ControllerBase
{
    private readonly ICampusTimeTableService _service;

    public CampusTimeTablesController(ICampusTimeTableService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<IActionResult> GetList(CancellationToken cancellationToken)
    {
        var result = await _service.GetListAsync(cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<CampusTimeTableListItemDto>>.SuccessResponse(result));
    }

    [HttpGet("mine")]
    public async Task<IActionResult> GetMyTimetable(CancellationToken cancellationToken)
    {
        if (!int.TryParse(User.FindFirst("FamilyDbId")?.Value, out var employeeId) || employeeId <= 0)
            return Unauthorized(ApiResponse<object>.FailureResponse("Employee session required."));

        try
        {
            var result = await _service.GetMyTimetableAsync(employeeId, cancellationToken);
            return Ok(ApiResponse<EmployeeMyTimetableDto>.SuccessResponse(result));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<object>.FailureResponse(ex.Message));
        }
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id, CancellationToken cancellationToken)
    {
        try
        {
            var result = await _service.GetByIdAsync(id, cancellationToken);
            return Ok(ApiResponse<CampusTimeTableDetailDto>.SuccessResponse(result));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<object>.FailureResponse(ex.Message));
        }
    }

    [HttpGet("{id:int}/print")]
    public async Task<IActionResult> GetPrint(int id, CancellationToken cancellationToken)
    {
        try
        {
            var result = await _service.GetPrintAsync(id, cancellationToken);
            return Ok(ApiResponse<CampusTimeTablePrintDto>.SuccessResponse(result));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<object>.FailureResponse(ex.Message));
        }
    }

    [HttpGet("{id:int}/allocation-candidates")]
    public async Task<IActionResult> GetAllocationCandidates(int id, CancellationToken cancellationToken)
    {
        try
        {
            var result = await _service.GetAllocationCandidatesAsync(id, cancellationToken);
            return Ok(ApiResponse<IReadOnlyList<CampusTimeTableAllocationCandidateDto>>.SuccessResponse(result));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<object>.FailureResponse(ex.Message));
        }
    }

    [HttpPost]
    public async Task<IActionResult> Create(
        [FromBody] CampusTimeTableCreateDto request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _service.CreateAsync(request, cancellationToken);
            return Ok(ApiResponse<CampusTimeTableDetailDto>.SuccessResponse(result, "Timetable created."));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<object>.FailureResponse(ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<object>.FailureResponse(ex.Message));
        }
    }

    [HttpPost("{id:int}/update")]
    public async Task<IActionResult> Update(
        int id,
        [FromBody] CampusTimeTableUpdateDto request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _service.UpdateAsync(id, request, cancellationToken);
            return Ok(ApiResponse<CampusTimeTableDetailDto>.SuccessResponse(result, "Timetable updated."));
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

    [HttpPost("{id:int}/set-default")]
    public async Task<IActionResult> SetDefault(int id, CancellationToken cancellationToken)
    {
        try
        {
            await _service.SetDefaultAsync(id, cancellationToken);
            return Ok(ApiResponse<object>.SuccessResponse(new { }, "Default timetable updated."));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<object>.FailureResponse(ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<object>.FailureResponse(ex.Message));
        }
    }

    [HttpPost("{id:int}/clear-default")]
    public async Task<IActionResult> ClearDefault(int id, CancellationToken cancellationToken)
    {
        try
        {
            await _service.ClearDefaultAsync(id, cancellationToken);
            return Ok(ApiResponse<object>.SuccessResponse(new { }, "Default removed."));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<object>.FailureResponse(ex.Message));
        }
    }

    [HttpPost("{id:int}/periods")]
    public async Task<IActionResult> ReplacePeriods(
        int id,
        [FromBody] CampusTimeTableReplacePeriodsDto request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _service.ReplacePeriodsAsync(id, request, cancellationToken);
            return Ok(ApiResponse<CampusTimeTableDetailDto>.SuccessResponse(result, "Periods saved."));
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
            return BadRequest(ApiResponse<object>.FailureResponse(ex.Message));
        }
    }

    [HttpPost("{id:int}/members")]
    public async Task<IActionResult> ReplaceMembers(
        int id,
        [FromBody] CampusTimeTableReplaceMembersDto request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _service.ReplaceMembersAsync(id, request, cancellationToken);
            return Ok(ApiResponse<CampusTimeTableDetailDto>.SuccessResponse(result, "Members saved."));
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

    [HttpPost("{id:int}/slots")]
    public async Task<IActionResult> ReplaceSlots(
        int id,
        [FromBody] CampusTimeTableReplaceSlotsDto request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _service.ReplaceSlotsAsync(id, request, cancellationToken);
            return Ok(ApiResponse<CampusTimeTableDetailDto>.SuccessResponse(result, "Slots saved."));
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
            return BadRequest(ApiResponse<object>.FailureResponse(ex.Message));
        }
    }

    [HttpPost("{id:int}/seed-from-allocation")]
    public async Task<IActionResult> SeedFromAllocation(int id, CancellationToken cancellationToken)
    {
        try
        {
            var result = await _service.SeedFromAllocationAsync(id, cancellationToken);
            return Ok(ApiResponse<CampusTimeTableDetailDto>.SuccessResponse(result, "Slots seeded from subject allocation."));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<object>.FailureResponse(ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<object>.FailureResponse(ex.Message));
        }
    }

    [HttpPost("{id:int}/delete")]
    public async Task<IActionResult> Delete(int id, CancellationToken cancellationToken)
    {
        try
        {
            await _service.DeleteAsync(id, cancellationToken);
            return Ok(ApiResponse<object>.SuccessResponse(new { }, "Timetable deleted."));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<object>.FailureResponse(ex.Message));
        }
    }
}
