using FirebaseAdmin;
using FirebaseAdmin.Messaging;
using Google.Apis.Auth.OAuth2;
using Microsoft.Extensions.Options;
using School.Application.Common;
using School.Application.Interfaces;

namespace School.API.Services;

public sealed class FirebaseParentPushSender(IOptions<ParentPushOptions> options,
    ILogger<FirebaseParentPushSender> logger) : IParentPushSender, IDisposable
{
    private readonly object _sync = new();
    private FirebaseApp? _app;

    private FirebaseMessaging Messaging
    {
        get
        {
            lock (_sync)
            {
                var settings = options.Value;
                if (!settings.Enabled || string.IsNullOrWhiteSpace(settings.ProjectId)
                    || string.IsNullOrWhiteSpace(settings.ServiceAccountPath))
                    throw new InvalidOperationException("Parent push Firebase configuration is incomplete.");
                _app ??= FirebaseApp.Create(new AppOptions
                {
                    ProjectId = settings.ProjectId,
                    Credential = CredentialFactory.FromFile<ServiceAccountCredential>(settings.ServiceAccountPath).ToGoogleCredential()
                }, "sbs-parent-push");
                return FirebaseMessaging.GetMessaging(_app);
            }
        }
    }

    public Task<ParentPushSendResult> SendAsync(string token, string title, string campus,
        int announcementId, CancellationToken cancellationToken) =>
        SendMessageAsync(token, title, "New announcement from your campus. Tap to view.",
            $"{campus}-announcement-{announcementId}", new Dictionary<string, string>
            {
                ["type"] = "announcement", ["campus"] = campus,
                ["announcementId"] = announcementId.ToString(System.Globalization.CultureInfo.InvariantCulture)
            }, cancellationToken);

    public Task<ParentPushSendResult> SendDiaryAsync(string token, string title, string campus,
        int classId, DateOnly date, int studentId, int familyDbId, CancellationToken cancellationToken) =>
        SendMessageAsync(token, title, $"Homework diary for {date:dd MMM yyyy} is available. Tap to view.",
            $"{campus}-diary-{classId}-{date:yyyy-MM-dd}", new Dictionary<string, string>
            {
                ["type"] = "diary", ["campus"] = campus,
                ["classId"] = classId.ToString(System.Globalization.CultureInfo.InvariantCulture),
                ["studentId"] = studentId.ToString(System.Globalization.CultureInfo.InvariantCulture),
                ["familyDbId"] = familyDbId.ToString(System.Globalization.CultureInfo.InvariantCulture),
                ["diaryDate"] = date.ToString("yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture)
            }, cancellationToken);

    private async Task<ParentPushSendResult> SendMessageAsync(string token, string title, string body,
        string tag, Dictionary<string, string> data, CancellationToken cancellationToken)
    {
        try
        {
            using var sendTimeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            sendTimeout.CancelAfter(TimeSpan.FromSeconds(30));
            await Messaging.SendAsync(new Message
            {
                Token = token,
                Notification = new Notification { Title = title, Body = body },
                Data = data,
                Android = new AndroidConfig
                {
                    Priority = Priority.High, TimeToLive = TimeSpan.FromHours(24),
                    CollapseKey = tag,
                    Notification = new AndroidNotification
                    {
                        ChannelId = "school_announcements", Icon = "ic_notification",
                        Tag = tag, Sound = "default"
                    }
                }
            }, sendTimeout.Token);
            return ParentPushSendResult.Sent;
        }
        catch (FirebaseMessagingException ex)
        {
            // Log codes only: SDK exceptions can contain registration tokens.
            logger.LogWarning("Parent push FCM returned {Code}.", ex.MessagingErrorCode);
            return ex.MessagingErrorCode switch
            {
                MessagingErrorCode.Unregistered => ParentPushSendResult.InvalidToken,
                MessagingErrorCode.InvalidArgument => ParentPushSendResult.Rejected,
                _ => ParentPushSendResult.Retry
            };
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested) { throw; }
        catch (Exception ex)
        {
            logger.LogWarning("Parent push send failed ({ErrorType}); it will be retried.", ex.GetType().Name);
            return ParentPushSendResult.Retry;
        }
    }

    public void Dispose() { lock (_sync) { _app?.Delete(); } }
}
