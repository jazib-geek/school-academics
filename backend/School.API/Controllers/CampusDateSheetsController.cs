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
[Route("api/campus/datesheets")]
public class CampusDateSheetsController : ControllerBase
{
    private readonly ICampusDateSheetService _service;

    public CampusDateSheetsController(ICampusDateSheetService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<IActionResult> GetList(CancellationToken cancellationToken)
    {
        var result = await _service.GetListAsync(cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<CampusDateSheetListItemDto>>.SuccessResponse(result));
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id, CancellationToken cancellationToken)
    {
        try
        {
            var result = await _service.GetByIdAsync(id, cancellationToken);
            return Ok(ApiResponse<CampusDateSheetDetailDto>.SuccessResponse(result));
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
            return Ok(ApiResponse<CampusDateSheetPrintDto>.SuccessResponse(result));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<object>.FailureResponse(ex.Message));
        }
    }

    [HttpPost]
    public async Task<IActionResult> Create(
        [FromBody] CampusDateSheetCreateDto request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _service.CreateAsync(request, cancellationToken);
            return Ok(ApiResponse<CampusDateSheetDetailDto>.SuccessResponse(result, "Datesheet created."));
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
        [FromBody] CampusDateSheetUpdateDto request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _service.UpdateAsync(id, request, cancellationToken);
            return Ok(ApiResponse<CampusDateSheetDetailDto>.SuccessResponse(result, "Datesheet updated."));
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

    [HttpPost("{id:int}/classes")]
    public async Task<IActionResult> ReplaceClasses(
        int id,
        [FromBody] CampusDateSheetReplaceClassesDto request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _service.ReplaceClassesAsync(id, request, cancellationToken);
            return Ok(ApiResponse<CampusDateSheetDetailDto>.SuccessResponse(result, "Classes updated."));
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

    [HttpPost("{id:int}/days")]
    public async Task<IActionResult> ReplaceDays(
        int id,
        [FromBody] CampusDateSheetReplaceDaysDto request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _service.ReplaceDaysAsync(id, request, cancellationToken);
            return Ok(ApiResponse<CampusDateSheetDetailDto>.SuccessResponse(result, "Dates updated."));
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

    [HttpPost("{id:int}/entries")]
    public async Task<IActionResult> ReplaceEntries(
        int id,
        [FromBody] CampusDateSheetReplaceEntriesDto request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _service.ReplaceEntriesAsync(id, request, cancellationToken);
            return Ok(ApiResponse<CampusDateSheetDetailDto>.SuccessResponse(result, "Datesheet saved."));
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

    [HttpPost("{id:int}/delete")]
    public async Task<IActionResult> Delete(int id, CancellationToken cancellationToken)
    {
        try
        {
            await _service.DeleteAsync(id, cancellationToken);
            return Ok(ApiResponse<object>.SuccessResponse(new { }, "Datesheet deleted."));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<object>.FailureResponse(ex.Message));
        }
    }
}
