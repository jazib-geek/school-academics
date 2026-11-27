namespace School.Application.Common;

public class ParentPushOptions
{
    // Opt-in only, after campus migrations and Firebase credentials are ready.
    public bool Enabled { get; set; }
    public string ProjectId { get; set; } = "";
    public string ServiceAccountPath { get; set; } = "";
}
