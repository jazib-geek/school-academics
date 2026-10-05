using School.Application.DTOs;

namespace School.Application.Interfaces;

public interface IFeeReminderNoticeService
{
    Task<List<FeeReminderNoticeTemplateDto>> GetTemplatesAsync();
    Task<FeeReminderNoticeTemplateDto?> UpdateTemplateAsync(string code, FeeReminderNoticeTemplateUpdateDto dto);
    Task<FeeReminderClassBalancesDto> GetClassBalancesAsync(string className);
}
