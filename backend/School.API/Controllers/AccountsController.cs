using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using School.Application.Common;
using School.Application.DTOs;
using School.Application.Interfaces;
using School.Infrastructure.Data;

namespace School.API.Controllers;

[ApiController]
[Authorize]
[Route("api/campus/accounts")]
public class AccountsController : ControllerBase
{
    private readonly IAccountChartService _chartService;
    private readonly IAccountVoucherService _voucherService;
    private readonly IAccountLedgerService _ledgerService;
    private readonly IAccountCashBookService _cashBookService;
    private readonly IAccountSummaryService _summaryService;
    private readonly IDayClosingService _dayClosingService;
    private readonly AppDbContext _context;

    public AccountsController(
        IAccountChartService chartService,
        IAccountVoucherService voucherService,
        IAccountLedgerService ledgerService,
        IAccountCashBookService cashBookService,
        IAccountSummaryService summaryService,
        IDayClosingService dayClosingService,
        AppDbContext context)
    {
        _chartService = chartService;
        _voucherService = voucherService;
        _ledgerService = ledgerService;
        _cashBookService = cashBookService;
        _summaryService = summaryService;
        _dayClosingService = dayClosingService;
        _context = context;
    }

    [HttpGet("masters")]
    public async Task<IActionResult> GetMasters(CancellationToken cancellationToken)
    {
        var result = await _chartService.GetMastersAsync(cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<AccountMasterDto>>.SuccessResponse(result));
    }

    [HttpGet("groups")]
    public async Task<IActionResult> GetGroups([FromQuery] int? masterId, CancellationToken cancellationToken)
    {
        var result = await _chartService.GetGroupsAsync(masterId, cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<AccountGroupDto>>.SuccessResponse(result));
    }

    [HttpGet("sub-groups")]
    public async Task<IActionResult> GetSubGroups([FromQuery] string? groupId, CancellationToken cancellationToken)
    {
        var result = await _chartService.GetSubGroupsAsync(groupId, cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<AccountSubGroupDto>>.SuccessResponse(result));
    }

    [HttpGet("level4")]
    public async Task<IActionResult> GetLevel4([FromQuery] string? subGroupId, CancellationToken cancellationToken)
    {
        var result = await _chartService.GetAccountsAsync(subGroupId, cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<AccountLevel4Dto>>.SuccessResponse(result));
    }

    [HttpGet("postable")]
    public async Task<IActionResult> GetPostableAccounts(
        [FromQuery] bool excludeCashInHand = true,
        CancellationToken cancellationToken = default)
    {
        var result = await _chartService.GetPostableAccountsAsync(excludeCashInHand, cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<AccountLookupDto>>.SuccessResponse(result));
    }

    [HttpPost("groups")]
    public async Task<IActionResult> CreateGroup(
        [FromBody] CreateAccountGroupRequestDto request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _chartService.CreateGroupAsync(request, cancellationToken);
            return Ok(ApiResponse<AccountGroupDto>.SuccessResponse(result, "Group created."));
        }
        catch (Exception ex) when (ex is ArgumentException or InvalidOperationException or KeyNotFoundException)
        {
            return BadRequest(ApiResponse<object>.FailureResponse(ex.Message));
        }
    }

    [HttpPost("sub-groups")]
    public async Task<IActionResult> CreateSubGroup(
        [FromBody] CreateAccountSubGroupRequestDto request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _chartService.CreateSubGroupAsync(request, cancellationToken);
            return Ok(ApiResponse<AccountSubGroupDto>.SuccessResponse(result, "Subgroup created."));
        }
        catch (Exception ex) when (ex is ArgumentException or InvalidOperationException or KeyNotFoundException)
        {
            return BadRequest(ApiResponse<object>.FailureResponse(ex.Message));
        }
    }

    [HttpPost("level4")]
    public async Task<IActionResult> CreateAccount(
        [FromBody] CreateAccountRequestDto request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _chartService.CreateAccountAsync(
                request,
                await ResolveEntryUserAsync(cancellationToken),
                cancellationToken);
            return Ok(ApiResponse<AccountLevel4Dto>.SuccessResponse(result, "Account created."));
        }
        catch (Exception ex) when (ex is ArgumentException or InvalidOperationException or KeyNotFoundException)
        {
            return BadRequest(ApiResponse<object>.FailureResponse(ex.Message));
        }
    }

    [HttpPost("groups/{id:int}/update")]
    public async Task<IActionResult> RenameGroup(
        int id,
        [FromBody] RenameAccountNodeRequestDto request,
        CancellationToken cancellationToken)
    {
        try
        {
            await _chartService.RenameGroupAsync(id, request, cancellationToken);
            return Ok(ApiResponse<object>.SuccessResponse(new { }, "Group updated."));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<object>.FailureResponse(ex.Message));
        }
        catch (Exception ex) when (ex is ArgumentException or InvalidOperationException)
        {
            return BadRequest(ApiResponse<object>.FailureResponse(ex.Message));
        }
    }

    [HttpPost("sub-groups/{id:int}/update")]
    public async Task<IActionResult> RenameSubGroup(
        int id,
        [FromBody] RenameAccountNodeRequestDto request,
        CancellationToken cancellationToken)
    {
        try
        {
            await _chartService.RenameSubGroupAsync(id, request, cancellationToken);
            return Ok(ApiResponse<object>.SuccessResponse(new { }, "Subgroup updated."));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<object>.FailureResponse(ex.Message));
        }
        catch (Exception ex) when (ex is ArgumentException or InvalidOperationException)
        {
            return BadRequest(ApiResponse<object>.FailureResponse(ex.Message));
        }
    }

    [HttpPost("level4/{id:int}/update")]
    public async Task<IActionResult> RenameAccount(
        int id,
        [FromBody] RenameAccountNodeRequestDto request,
        CancellationToken cancellationToken)
    {
        try
        {
            await _chartService.RenameAccountAsync(id, request, cancellationToken);
            return Ok(ApiResponse<object>.SuccessResponse(new { }, "Account updated."));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<object>.FailureResponse(ex.Message));
        }
        catch (Exception ex) when (ex is ArgumentException or InvalidOperationException)
        {
            return BadRequest(ApiResponse<object>.FailureResponse(ex.Message));
        }
    }

    [HttpPost("vouchers/cash-payment")]
    public async Task<IActionResult> SaveCashPayment(
        [FromBody] SaveVoucherRequestDto request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _voucherService.SaveCashPaymentAsync(
                request,
                await ResolveEntryUserAsync(cancellationToken),
                cancellationToken);
            return Ok(ApiResponse<SaveVoucherResultDto>.SuccessResponse(result, "Voucher saved."));
        }
        catch (Exception ex) when (ex is ArgumentException or InvalidOperationException or KeyNotFoundException)
        {
            return BadRequest(ApiResponse<object>.FailureResponse(ex.Message));
        }
        catch (DbUpdateException)
        {
            return Conflict(ApiResponse<object>.FailureResponse("The voucher could not be saved."));
        }
    }

    [HttpPost("vouchers/cash-receipt")]
    public async Task<IActionResult> SaveCashReceipt(
        [FromBody] SaveVoucherRequestDto request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _voucherService.SaveCashReceiptAsync(
                request,
                await ResolveEntryUserAsync(cancellationToken),
                cancellationToken);
            return Ok(ApiResponse<SaveVoucherResultDto>.SuccessResponse(result, "Voucher saved."));
        }
        catch (Exception ex) when (ex is ArgumentException or InvalidOperationException or KeyNotFoundException)
        {
            return BadRequest(ApiResponse<object>.FailureResponse(ex.Message));
        }
        catch (DbUpdateException)
        {
            return Conflict(ApiResponse<object>.FailureResponse("The voucher could not be saved."));
        }
    }

    [HttpGet("ledger")]
    public async Task<IActionResult> GetLedger(
        [FromQuery] string accountId,
        [FromQuery] DateTime from,
        [FromQuery] DateTime to,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _ledgerService.GetLedgerAsync(accountId, from, to, cancellationToken);
            return Ok(ApiResponse<AccountLedgerResultDto>.SuccessResponse(result));
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

    [HttpGet("cash-book")]
    public async Task<IActionResult> GetCashBook(
        [FromQuery] DateTime from,
        [FromQuery] DateTime to,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _cashBookService.GetCashBookAsync(from, to, cancellationToken);
            return Ok(ApiResponse<CashBookResultDto>.SuccessResponse(result));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<object>.FailureResponse(ex.Message));
        }
    }

    [HttpGet("summary")]
    public async Task<IActionResult> GetSummary(
        [FromQuery] DateTime from,
        [FromQuery] DateTime to,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _summaryService.GetSummaryAsync(from, to, cancellationToken);
            return Ok(ApiResponse<AccountSummaryResultDto>.SuccessResponse(result));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<object>.FailureResponse(ex.Message));
        }
    }

    [HttpGet("day-closing")]
    public async Task<IActionResult> GetDayClosing(
        [FromQuery] DateOnly? date,
        CancellationToken cancellationToken)
    {
        var closingDate = date ?? School.Application.Common.PakistanTime.Today;
        var result = await _dayClosingService.GetPreviewAsync(closingDate, cancellationToken);
        return Ok(ApiResponse<DayClosingPreviewDto>.SuccessResponse(result));
    }

    [HttpPost("day-closing")]
    public async Task<IActionResult> CloseDay(
        [FromBody] CloseDayRequestDto request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _dayClosingService.CloseDayAsync(
                request,
                await ResolveEntryUserAsync(cancellationToken),
                cancellationToken);
            return Ok(ApiResponse<DayClosingDto>.SuccessResponse(result, "Day closed."));
        }
        catch (Exception ex) when (ex is ArgumentException or InvalidOperationException)
        {
            return BadRequest(ApiResponse<object>.FailureResponse(ex.Message));
        }
        catch (DbUpdateException)
        {
            return Conflict(ApiResponse<object>.FailureResponse("This day is already closed."));
        }
    }

    private async Task<string?> ResolveEntryUserAsync(CancellationToken cancellationToken)
    {
        if (!int.TryParse(User.FindFirst("FamilyDbId")?.Value, out var userId) || userId <= 0)
            return null;

        return await _context.Users
            .AsNoTracking()
            .Where(x => x.ID == userId)
            .Select(x => x.Username)
            .FirstOrDefaultAsync(cancellationToken);
    }
}
