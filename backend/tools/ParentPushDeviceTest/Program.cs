using System.Text.Json;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using School.API.Services;
using School.Application.Common;
using School.Application.Interfaces;

// Explicit one-emulator smoke test. No database access, topics, or broadcasts.
// Input files contain credentials/tokens: never print their contents.
if (args.Length != 2)
{
    Console.WriteLine("Usage: ParentPushDeviceTest <service-account-file> <emulator-token-file>");
    return 2;
}
try
{
    using var credential = JsonDocument.Parse(await File.ReadAllTextAsync(args[0]));
    using var target = JsonDocument.Parse(await File.ReadAllTextAsync(args[1]));
    var project = credential.RootElement.GetProperty("project_id").GetString();
    var t = target.RootElement;
    var serial = t.GetProperty("deviceSerial").GetString();
    var token = t.GetProperty("token").GetString();
    var captured = t.GetProperty("capturedAtUtc").GetDateTimeOffset();
    if (project != "sciencebaseparentapp" || t.GetProperty("projectId").GetString() != project
        || t.GetProperty("packageName").GetString() != "com.sbs.portal"
        || serial == null || !serial.StartsWith("emulator-", StringComparison.Ordinal)
        || captured < DateTimeOffset.UtcNow.AddMinutes(-30) || captured > DateTimeOffset.UtcNow.AddMinutes(1)
        || string.IsNullOrWhiteSpace(token))
    {
        Console.WriteLine("Refused: target must be a recently captured SBS emulator token for the expected project.");
        return 2;
    }
    using var loggerFactory = LoggerFactory.Create(b => b.AddSimpleConsole());
    using var sender = new FirebaseParentPushSender(Options.Create(new ParentPushOptions
    {
        Enabled = true, ProjectId = project, ServiceAccountPath = Path.GetFullPath(args[0])
    }), loggerFactory.CreateLogger<FirebaseParentPushSender>());
    // ID 0 is deliberately not a real announcement: the app won't open fabricated
    // content, and this test never creates a production business record.
    var result = await sender.SendAsync(token, "SBS emulator notification test", "dc", 0, CancellationToken.None);
    Console.WriteLine($"Single-device Firebase send result for {serial}: {result}.");
    return result == ParentPushSendResult.Sent ? 0 : 1;
}
catch (Exception ex)
{
    Console.WriteLine($"Emulator push test failed ({ex.GetType().Name}). No credential/token contents logged.");
    return 1;
}
