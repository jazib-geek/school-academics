using School.Application.DTOs;

namespace School.Application.Interfaces;

public interface ICustomNoticeService
{
    Task<CustomNoticePreviewDto> PreviewAsync(CustomNoticePreviewRequestDto request);
}
