namespace School.Infrastructure.Entities;

// One-to-one entry details. Content is optional; SectionCode enforces the matching entry type.
public interface ICoordinatorProformaDetail
{
    public int EntryId { get; set; }
    public ProformaSectionCode SectionCode { get; set; }
    public CoordinatorProformaEntry Entry { get; set; }
}

public sealed class CoordinatorProformaMeeting : ICoordinatorProformaDetail
{
    public int EntryId { get; set; }
    public ProformaSectionCode SectionCode { get; set; } = ProformaSectionCode.Morning;
    public string? MeetingPoints { get; set; }
    public CoordinatorProformaEntry Entry { get; set; } = null!;
}

public sealed class CoordinatorProformaDispatch : ICoordinatorProformaDetail
{
    public int EntryId { get; set; }
    public ProformaSectionCode SectionCode { get; set; } = ProformaSectionCode.Dispatch;
    public ProformaDispatchType? DispatchTypeCode { get; set; }
    public string? Details { get; set; }
    public CoordinatorProformaEntry Entry { get; set; } = null!;
}

public sealed class CoordinatorProformaActivity : ICoordinatorProformaDetail
{
    public int EntryId { get; set; }
    public ProformaSectionCode SectionCode { get; set; } = ProformaSectionCode.Activities;
    public ProformaActivityType? ActivityTypeCode { get; set; }
    public string? Details { get; set; }
    public CoordinatorProformaEntry Entry { get; set; } = null!;
}

public sealed class CoordinatorProformaPriorityResponse : ICoordinatorProformaDetail
{
    public int EntryId { get; set; }
    public ProformaSectionCode SectionCode { get; set; } = ProformaSectionCode.Priority;
    public string? Concern { get; set; }
    public string? Response { get; set; }
    public CoordinatorProformaEntry Entry { get; set; } = null!;
}

public sealed class CoordinatorProformaCriticalDiary : ICoordinatorProformaDetail
{
    public int EntryId { get; set; }
    public ProformaSectionCode SectionCode { get; set; } = ProformaSectionCode.CriticalDiary;
    public string? Issue { get; set; }
    public string? Concern { get; set; }
    public string? Response { get; set; }
    public CoordinatorProformaEntry Entry { get; set; } = null!;
}

public sealed class CoordinatorProformaParentContact : ICoordinatorProformaDetail
{
    public int EntryId { get; set; }
    public ProformaSectionCode SectionCode { get; set; } = ProformaSectionCode.Parents;
    public ProformaContactType? ContactTypeCode { get; set; }
    public ProformaDirection? DirectionCode { get; set; }
    public string? Concern { get; set; }
    public string? Response { get; set; }
    public CoordinatorProformaEntry Entry { get; set; } = null!;
}

public sealed class CoordinatorProformaTestConfirmation : ICoordinatorProformaDetail
{
    public int EntryId { get; set; }
    public ProformaSectionCode SectionCode { get; set; } = ProformaSectionCode.Tests;
    public ProformaTestType? TestTypeCode { get; set; }
    public int? TestCopies { get; set; }
    public int? AbsentCount { get; set; }
    public DateOnly? TestDate { get; set; }
    public string? PeriodText { get; set; }
    public CoordinatorProformaEntry Entry { get; set; } = null!;
}

public sealed class CoordinatorProformaOxygenPeriod : ICoordinatorProformaDetail
{
    public int EntryId { get; set; }
    public ProformaSectionCode SectionCode { get; set; } = ProformaSectionCode.Oxygen;
    public string? PeriodText { get; set; }
    public string? InstructionalComments { get; set; }
    public CoordinatorProformaEntry Entry { get; set; } = null!;
}

public sealed class CoordinatorProformaStudentKaizen : ICoordinatorProformaDetail
{
    public int EntryId { get; set; }
    public ProformaSectionCode SectionCode { get; set; } = ProformaSectionCode.Kaizen;
    public ProformaKaizenCategory? CategoryCode { get; set; }
    public string? RemedialCounselling { get; set; }
    public CoordinatorProformaEntry Entry { get; set; } = null!;
}

public sealed class CoordinatorProformaDiaryCheck : ICoordinatorProformaDetail
{
    public int EntryId { get; set; }
    public ProformaSectionCode SectionCode { get; set; } = ProformaSectionCode.Diary;
    public ProformaDiaryIssue? IssueCode { get; set; }
    public string? IssueDetails { get; set; }
    public CoordinatorProformaEntry Entry { get; set; } = null!;
}

public sealed class CoordinatorProformaNotebookCheck : ICoordinatorProformaDetail
{
    public int EntryId { get; set; }
    public ProformaSectionCode SectionCode { get; set; } = ProformaSectionCode.Notebooks;
    public bool? TitlePresent { get; set; }
    public bool? PageNumberingPresent { get; set; }
    public bool? NeatnessSatisfactory { get; set; }
    public ProformaWritingQuality? WritingQualityCode { get; set; }
    public string? Mistakes { get; set; }
    public string? CorrectionTimeText { get; set; }
    public DateOnly? CorrectionDueDate { get; set; }
    public ProformaCorrectionStatus? CorrectionStatusCode { get; set; }
    public ProformaTeacherInformed? TeacherInformedCode { get; set; }
    public CoordinatorProformaEntry Entry { get; set; } = null!;
}

public sealed class CoordinatorProformaClassObservation : ICoordinatorProformaDetail
{
    public int EntryId { get; set; }
    public ProformaSectionCode SectionCode { get; set; } = ProformaSectionCode.Observation;
    public string? PeriodText { get; set; }
    public ProformaObservationType? ObservationTypeCode { get; set; }
    public string? ObservationRemarks { get; set; }
    public string? GuidanceText { get; set; }
    public CoordinatorProformaEntry Entry { get; set; } = null!;
}

public sealed class CoordinatorProformaTeacherFollowup : ICoordinatorProformaDetail
{
    public int EntryId { get; set; }
    public ProformaSectionCode SectionCode { get; set; } = ProformaSectionCode.Teachers;
    public ProformaFollowupArea? AreaCode { get; set; }
    public string? PointsOfConcern { get; set; }
    public string? AcknowledgedMeasures { get; set; }
    public CoordinatorProformaEntry Entry { get; set; } = null!;
}

public sealed class CoordinatorProformaFacultyCounselling : ICoordinatorProformaDetail
{
    public int EntryId { get; set; }
    public ProformaSectionCode SectionCode { get; set; } = ProformaSectionCode.Faculty;
    public ProformaCounsellingType? TypeCode { get; set; }
    public string? Concern { get; set; }
    public string? AgreedAction { get; set; }
    public CoordinatorProformaEntry Entry { get; set; } = null!;
}

public sealed class CoordinatorProformaClosing : ICoordinatorProformaDetail
{
    public int EntryId { get; set; }
    public ProformaSectionCode SectionCode { get; set; } = ProformaSectionCode.Closing;
    public ProformaNarrativeState? PendingSubmissionState { get; set; }
    public string? PendingSubmissionText { get; set; }
    public ProformaYesNoNa? SvhwResultsSentCode { get; set; }
    public ProformaNarrativeState? CriticalMatterState { get; set; }
    public string? CriticalMatterText { get; set; }
    public ProformaNarrativeState? PeopleRemainingState { get; set; }
    public string? PeopleRemainingText { get; set; }
    public ProformaPlanReport? PlanReportCode { get; set; }
    public TimeOnly? DepartureTime { get; set; }
    public string? MorningModsText { get; set; }
    public string? ClosingRemarks { get; set; }
    public CoordinatorProformaEntry Entry { get; set; } = null!;
}

public sealed class CoordinatorProformaDailyCheck : ICoordinatorProformaDetail
{
    public int EntryId { get; set; }
    public ProformaSectionCode SectionCode { get; set; } = ProformaSectionCode.DailyChecks;
    public string? MoralLessonTopic { get; set; }
    public ProformaAssemblyResponse? AssemblyResponse { get; set; }
    public TimeOnly? ArrivalTime { get; set; }
    public ProformaModDuty? DutyCode { get; set; }
    public string? DutyOtherLabel { get; set; }
    public CoordinatorProformaEntry Entry { get; set; } = null!;
}
