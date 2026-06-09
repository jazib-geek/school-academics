using AutoMapper;
using School.Application.Academics.DTOs;
using School.Infrastructure.Academics.Entities;

namespace School.Application.Mapping;

public class AcademicsMappingProfile : Profile
{
    public AcademicsMappingProfile()
    {
        CreateMap<Chapter, ChapterDto>()
            .ForMember(d => d.ClassName, o => o.MapFrom(s => s.Class != null ? s.Class.ClassName : string.Empty))
            .ForMember(d => d.SubjectName, o => o.MapFrom(s => s.Subject != null ? s.Subject.SubjectName : string.Empty));
    }
}
