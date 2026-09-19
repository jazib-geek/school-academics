using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using School.Application.Common;
using School.Application.Interfaces;

namespace School.API.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public class FeeReportsController : ControllerBase
{
    private readonly IFeeReportService _service;
    private readonly ISmartFeeReportService _smart;

    public FeeReportsController(IFeeReportService service, ISmartFeeReportService smart)
    {
        _service = service;
        _smart = smart;
    }

    [HttpGet("smart/catalog")]
    public async Task<IActionResult> GetSmartCatalog()
    {
        var catalog = await _smart.GetCatalogAsync();
        return Ok(ApiResponse<object>.SuccessResponse(catalog));
    }

    [HttpGet("smart/executive-snapshot")]
    public async Task<IActionResult> GetExecutiveSnapshot()
    {
        var snapshot = await _smart.GetExecutiveSnapshotAsync();
        return Ok(ApiResponse<object>.SuccessResponse(snapshot));
    }

    [HttpPost("smart/run")]
    public async Task<IActionResult> RunSmartReport([FromBody] School.Application.DTOs.SmartFeeReportRunRequestDto? request)
    {
        if (request is null || string.IsNullOrWhiteSpace(request.ReportId))
        {
            return BadRequest(ApiResponse<object>.FailureResponse("reportId is required."));
        }

        try
        {
            var result = await _smart.RunAsync(request.ReportId, request.Parameters ?? new());
            return Ok(ApiResponse<object>.SuccessResponse(result));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<object>.FailureResponse(ex.Message));
        }
    }

    [HttpGet("collection-by-date")]
    public async Task<IActionResult> GetCollectionByDate([FromQuery] DateTime? date)
    {
        if (!date.HasValue)
        {
            return BadRequest(ApiResponse<object>.FailureResponse("date is required."));
        }

        var result = await _service.GetFeeCollectionOnDateAsync(date.Value);
        return Ok(ApiResponse<object>.SuccessResponse(result));
    }

    [HttpGet("collection-by-interval")]
    public async Task<IActionResult> GetCollectionByInterval([FromQuery] DateTime? dateFrom, [FromQuery] DateTime? dateTo)
    {
        if (!dateFrom.HasValue || !dateTo.HasValue)
        {
            return BadRequest(ApiResponse<object>.FailureResponse("dateFrom and dateTo are required."));
        }

        if (dateFrom.Value.Date > dateTo.Value.Date)
        {
            return BadRequest(ApiResponse<object>.FailureResponse("dateFrom cannot be greater than dateTo."));
        }

        var result = await _service.GetFeeCollectionInIntervalAsync(dateFrom.Value, dateTo.Value);
        return Ok(ApiResponse<object>.SuccessResponse(result));
    }

    [HttpGet("fee-defaulters")]
    public async Task<IActionResult> GetFeeDefaulters([FromQuery] int? month, [FromQuery] int? year)
    {
        if (!month.HasValue || !year.HasValue)
        {
            return BadRequest(ApiResponse<object>.FailureResponse("month and year are required."));
        }

        if (month < 1 || month > 12)
        {
            return BadRequest(ApiResponse<object>.FailureResponse("month must be between 1 and 12."));
        }

        var result = await _service.GetFeeDefaultersAsync(month.Value, year.Value);
        return Ok(ApiResponse<object>.SuccessResponse(result));
    }

    [HttpGet("fund-defaulters")]
    public async Task<IActionResult> GetFundDefaulters([FromQuery] int? fundTypeId)
    {
        if (!fundTypeId.HasValue)
        {
            return BadRequest(ApiResponse<object>.FailureResponse("fundTypeId is required."));
        }

        if (fundTypeId <= 1)
        {
            return BadRequest(ApiResponse<object>.FailureResponse("fundTypeId must be greater than 1 for fund defaulters."));
        }

        var result = await _service.GetFundDefaultersAsync(fundTypeId.Value);
        return Ok(ApiResponse<object>.SuccessResponse(result));
    }

    [HttpGet("overall-receivable")]
    public async Task<IActionResult> GetOverallReceivable()
    {
        var result = await _service.GetOverallReceivableAsync();
        return Ok(ApiResponse<object>.SuccessResponse(result));
    }

    [HttpGet("fund-types")]
    public async Task<IActionResult> GetFundTypes()
    {
        var result = await _service.GetFundTypesAsync();
        return Ok(ApiResponse<object>.SuccessResponse(result));
    }

    [HttpGet("expected-income")]
    public async Task<IActionResult> GetExpectedIncome()
    {
        try
        {
            var result = await _service.GetExpectedIncomeReportAsync();
            return Ok(ApiResponse<object>.SuccessResponse(result));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<object>.FailureResponse(ex.Message));
        }
    }

    [HttpGet("income-statement")]
    public async Task<IActionResult> GetIncomeStatement([FromQuery] int? month, [FromQuery] int? year)
    {
        if (!month.HasValue || !year.HasValue)
        {
            return BadRequest(ApiResponse<object>.FailureResponse("month and year are required."));
        }

        if (month < 1 || month > 12)
        {
            return BadRequest(ApiResponse<object>.FailureResponse("month must be between 1 and 12."));
        }

        var result = await _service.GetIncomeStatementAsync(month.Value, year.Value);
        return Ok(ApiResponse<object>.SuccessResponse(result));
    }

    [HttpGet("balance-sheet")]
    public async Task<IActionResult> GetBalanceSheet()
    {
        try
        {
            var result = await _service.GetBalanceSheetAsync();
            return Ok(ApiResponse<object>.SuccessResponse(result));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<object>.FailureResponse(ex.Message));
        }
    }
}
