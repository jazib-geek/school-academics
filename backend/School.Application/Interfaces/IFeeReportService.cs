using School.Application.DTOs;

namespace School.Application.Interfaces;

public interface IFeeReportService
{
    Task<FeeReportResponseDto<FeeTransactionReportItemDto>> GetFeeCollectionOnDateAsync(DateTime date);
    Task<FeeReportResponseDto<FeeTransactionReportItemDto>> GetFeeCollectionInIntervalAsync(DateTime dateFrom, DateTime dateTo);
    Task<FeeReportResponseDto<FeeDefaulterItemDto>> GetFeeDefaultersAsync(int month, int year);
    Task<FeeReportResponseDto<FeeDefaulterItemDto>> GetFundDefaultersAsync(int fundTypeId);
    Task<FeeReportResponseDto<ReceivableItemDto>> GetOverallReceivableAsync();
    Task<List<FundTypeOptionDto>> GetFundTypesAsync();
    Task<ExpectedIncomeReportDto> GetExpectedIncomeReportAsync();
    Task<IncomeStatementReportDto> GetIncomeStatementAsync(int month, int year);
    Task<BalanceSheetReportDto> GetBalanceSheetAsync();
}
