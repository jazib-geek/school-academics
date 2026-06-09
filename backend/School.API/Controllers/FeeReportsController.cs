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

    public FeeReportsController(IFeeReportService service)
    {
        _service = service;
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
    public async Task<IActionResult> GetExpectedIncome([FromQuery] DateTime? dateFrom, [FromQuery] DateTime? dateTo)
    {
        if (!dateFrom.HasValue || !dateTo.HasValue)
        {
            return BadRequest(ApiResponse<object>.FailureResponse("dateFrom and dateTo are required."));
        }

        if (dateFrom.Value.Date > dateTo.Value.Date)
        {
            return BadRequest(ApiResponse<object>.FailureResponse("dateFrom cannot be greater than dateTo."));
        }

        var result = await _service.GetExpectedIncomeReportAsync(dateFrom.Value, dateTo.Value);
        return Ok(ApiResponse<object>.SuccessResponse(result));
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
}
