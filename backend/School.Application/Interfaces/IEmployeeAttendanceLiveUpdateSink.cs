using School.Application.DTOs;
using System.Threading.Channels;

namespace School.Application.Interfaces;

public interface IEmployeeAttendanceLiveUpdateSink
{
    ChannelReader<EmployeeAttendanceLiveRowDto> Subscribe(
        string campus,
        CancellationToken cancellationToken = default);

    ValueTask PublishAsync(
        string campus,
        EmployeeAttendanceLiveRowDto row,
        CancellationToken cancellationToken = default);
}
