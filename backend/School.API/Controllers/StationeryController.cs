using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using School.Application.Common;
using School.Application.DTOs;
using School.Application.Interfaces;
using School.Infrastructure.Data;
using System.Security.Claims;

namespace School.API.Controllers;

[ApiController]
[Authorize]
[Route("api/campus/stationery")]
public class StationeryController : ControllerBase
{
    private readonly IStationeryService _stationeryService;
    private readonly AppDbContext _context;

    public StationeryController(IStationeryService stationeryService, AppDbContext context)
    {
        _stationeryService = stationeryService;
        _context = context;
    }

    [HttpGet("items")]
    public async Task<IActionResult> GetItems(CancellationToken cancellationToken)
    {
        var result = await _stationeryService.GetItemsAsync(cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<StationeryItemDto>>.SuccessResponse(result));
    }

    [HttpGet("items/{id:int}")]
    public async Task<IActionResult> GetItem(int id, CancellationToken cancellationToken)
    {
        try
        {
            var result = await _stationeryService.GetItemAsync(id, cancellationToken);
            return Ok(ApiResponse<StationeryItemDto>.SuccessResponse(result));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<object>.FailureResponse(ex.Message));
        }
    }

    [HttpPost("items")]
    public async Task<IActionResult> CreateItem(
        [FromBody] StationeryItemUpsertDto request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _stationeryService.CreateItemAsync(request, cancellationToken);
            return CreatedAtAction(
                nameof(GetItem),
                new { id = result.Id },
                ApiResponse<StationeryItemDto>.SuccessResponse(result, "Item created."));
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
                "The item could not be created because a unique value is already in use."));
        }
    }

    [HttpPost("items/{id:int}/update")]
    public async Task<IActionResult> UpdateItem(
        int id,
        [FromBody] StationeryItemUpsertDto request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _stationeryService.UpdateItemAsync(id, request, cancellationToken);
            return Ok(ApiResponse<StationeryItemDto>.SuccessResponse(result, "Item updated."));
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
                "The item could not be updated because a unique value is already in use."));
        }
    }

    [HttpPost("items/{id:int}/status")]
    public async Task<IActionResult> SetItemStatus(
        int id,
        [FromBody] StationeryItemStatusUpdateDto request,
        CancellationToken cancellationToken)
    {
        try
        {
            await _stationeryService.SetItemStatusAsync(id, request.IsActive, cancellationToken);
            var message = request.IsActive ? "Item activated." : "Item deactivated.";
            return Ok(ApiResponse<object>.SuccessResponse(new { }, message));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<object>.FailureResponse(ex.Message));
        }
    }

    [HttpGet("purchases")]
    public async Task<IActionResult> GetPurchases(
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        CancellationToken cancellationToken)
    {
        var result = await _stationeryService.GetPurchasesAsync(from, to, cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<StationeryPurchaseDto>>.SuccessResponse(result));
    }

    [HttpGet("purchases/{id:int}")]
    public async Task<IActionResult> GetPurchase(int id, CancellationToken cancellationToken)
    {
        try
        {
            var result = await _stationeryService.GetPurchaseAsync(id, cancellationToken);
            return Ok(ApiResponse<StationeryPurchaseDto>.SuccessResponse(result));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<object>.FailureResponse(ex.Message));
        }
    }

    [HttpPost("purchases")]
    public async Task<IActionResult> CreatePurchase(
        [FromBody] StationeryPurchaseCreateDto request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _stationeryService.CreatePurchaseAsync(
                request,
                await ResolveEntryUserAsync(cancellationToken),
                ResolveUserId(),
                cancellationToken);
            return CreatedAtAction(
                nameof(GetPurchase),
                new { id = result.Id },
                ApiResponse<StationeryPurchaseDto>.SuccessResponse(result, "Purchase saved."));
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
        catch (DbUpdateException)
        {
            return Conflict(ApiResponse<object>.FailureResponse("The purchase could not be saved."));
        }
    }

    [HttpGet("handovers")]
    public async Task<IActionResult> GetHandovers(
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] int? employeeId,
        CancellationToken cancellationToken)
    {
        var result = await _stationeryService.GetHandoversAsync(from, to, employeeId, cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<StationeryHandoverDto>>.SuccessResponse(result));
    }

    [HttpGet("handovers/{id:int}")]
    public async Task<IActionResult> GetHandover(int id, CancellationToken cancellationToken)
    {
        try
        {
            var result = await _stationeryService.GetHandoverAsync(id, cancellationToken);
            return Ok(ApiResponse<StationeryHandoverDto>.SuccessResponse(result));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<object>.FailureResponse(ex.Message));
        }
    }

    [HttpPost("handovers")]
    public async Task<IActionResult> CreateHandover(
        [FromBody] StationeryHandoverCreateDto request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _stationeryService.CreateHandoverAsync(
                request,
                await ResolveEntryUserAsync(cancellationToken),
                ResolveUserId(),
                cancellationToken);
            return CreatedAtAction(
                nameof(GetHandover),
                new { id = result.Id },
                ApiResponse<StationeryHandoverDto>.SuccessResponse(result, "Handover saved."));
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
        catch (DbUpdateException)
        {
            return Conflict(ApiResponse<object>.FailureResponse("The handover could not be saved."));
        }
    }

    [HttpGet("stock")]
    public async Task<IActionResult> GetStock(CancellationToken cancellationToken)
    {
        var result = await _stationeryService.GetStockAsync(cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<StationeryStockDto>>.SuccessResponse(result));
    }

    [HttpGet("reports/expense")]
    public async Task<IActionResult> GetExpenseReport(
        [FromQuery] DateTime from,
        [FromQuery] DateTime to,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _stationeryService.GetExpenseReportAsync(from, to, cancellationToken);
            return Ok(ApiResponse<StationeryExpenseReportDto>.SuccessResponse(result));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<object>.FailureResponse(ex.Message));
        }
    }

    [HttpGet("reports/item")]
    public async Task<IActionResult> GetItemReport(
        [FromQuery] int itemId,
        [FromQuery] DateTime from,
        [FromQuery] DateTime to,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _stationeryService.GetItemReportAsync(itemId, from, to, cancellationToken);
            return Ok(ApiResponse<StationeryItemReportDto>.SuccessResponse(result));
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

    private int? ResolveUserId()
    {
        if (!int.TryParse(User.FindFirst("FamilyDbId")?.Value, out var userId) || userId <= 0)
            return null;
        return userId;
    }

    private async Task<string?> ResolveEntryUserAsync(CancellationToken cancellationToken)
    {
        var userId = ResolveUserId();
        if (userId is null)
            return User.FindFirst(ClaimTypes.Name)?.Value;

        return await _context.Users
            .AsNoTracking()
            .Where(x => x.ID == userId.Value)
            .Select(x => x.Username)
            .FirstOrDefaultAsync(cancellationToken);
    }
}
