namespace School.Application.Interfaces;

public enum ParentPushSendResult { Sent, InvalidToken, Retry, Rejected }

public interface IParentPushSender
{
    Task<ParentPushSendResult> SendAsync(string token, string title, string campus,
        int announcementId, CancellationToken cancellationToken);
    Task<ParentPushSendResult> SendDiaryAsync(string token, string title, string campus,
        int classId, DateOnly date, int studentId, int familyDbId, CancellationToken cancellationToken);
}
