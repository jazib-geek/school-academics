namespace School.Infrastructure.Entities;

// Persist enum names as stable codes. Display labels belong to the versioned UI/template.
public enum ProformaWingCode
{
    Junior,
    Primary,
    High,
    HighBoys,
    HighGirls,
    PrimaryHigh,
    JuniorPrimary
}

public static class ProformaWingCodeRules
{
    public const string SqlInList =
        "'Junior', 'Primary', 'High', 'HighBoys', 'HighGirls', 'PrimaryHigh', 'JuniorPrimary'";

    public const string EmployeeCheckConstraintName = "CK_Employee_WingCode";

    public const string ReportCheckConstraintName = "CK_CoordProforma_Report_WingCode";
}

public enum ProformaWorkflowStatus
{
    Draft,
    Submitted,
    Returned
}

public enum ProformaSectionCode
{
    Morning,
    Dispatch,
    Activities,
    Priority,
    CriticalDiary,
    Parents,
    Routine,
    Friday,
    Tests,
    Oxygen,
    Kaizen,
    Diary,
    Notebooks,
    Observation,
    Teachers,
    Faculty,
    Closing,
    DailyChecks
}

public enum ProformaDeclaration
{
    NoneToReport,
    NotApplicable
}

public enum ProformaPrincipalType
{
    Employee,
    CampusUser
}

public enum ProformaEmployeeRole
{
    SubjectTeacher,
    ClassTeacher,
    FollowupTeacher,
    CounselledStaff,
    MorningMod,
    DutyEmployee
}

public enum ProformaDispatchType
{
    Notice,
    FeeChallan,
    Schedule,
    Syllabus,
    QuestionPapers,
    Other
}

public enum ProformaActivityType
{
    ZLesson,
    SpecialPeriod,
    Competition,
    Event,
    Ptm,
    Other
}

public enum ProformaContactType
{
    Complaint,
    Call,
    Visit,
    Inquiry
}

public enum ProformaDirection
{
    Incoming,
    Outgoing
}

public enum ProformaTestType
{
    SosTest,
    Retest,
    MkrT
}

public enum ProformaKaizenCategory
{
    BelowAverage,
    Average,
    Good,
    AcademicSupport,
    Behaviour,
    Grooming,
    Motivation,
    Other
}

public enum ProformaDiaryIssue
{
    Ok,
    Missing,
    Unsigned,
    Unclear,
    Uncorrected,
    AwardTitleMissing,
    Other
}

public enum ProformaWritingQuality
{
    BelowAverage,
    Average,
    Good
}

public enum ProformaCorrectionStatus
{
    NotNeeded,
    NotCorrected,
    PartiallyCorrected,
    Completed
}

public enum ProformaTeacherInformed
{
    NotYet,
    InformedByCoordinator
}

public enum ProformaObservationType
{
    Formal,
    Informal
}

public enum ProformaFollowupArea
{
    SchemeOfStudies,
    StudentDiary,
    TeacherDiary,
    Notebooks,
    ClassObservation,
    Test,
    ModDiscipline,
    Other
}

public enum ProformaCounsellingType
{
    Counselling,
    Warning
}

public enum ProformaNarrativeState
{
    None,
    Details
}

public enum ProformaYesNoNa
{
    Yes,
    No,
    NotApplicable
}

public enum ProformaAssemblyResponse
{
    Yes,
    No,
    NotObserved
}

public enum ProformaPlanReport
{
    Plan,
    Report
}

public enum ProformaModDuty
{
    Welcome,
    Assembly,
    Break,
    OffTime,
    Other
}

public enum ProformaSummaryItem
{
    Notebooks,
    Diary,
    Kaizen,
    Observation,
    Teachers,
    Faculty
}

public enum ProformaAttendanceScope
{
    Campus
}

public enum ProformaAttendanceSource
{
    AttendanceService,
    Manual
}

public enum ProformaReviewEventCode
{
    Acknowledged,
    Approved,
    Returned
}

public enum ProformaActionStatus
{
    Open,
    InProgress,
    ReadyForVerification,
    Closed
}

public enum ProformaActionEventCode
{
    Created,
    Updated,
    Assigned,
    DueDateChanged,
    StatusChanged,
    ReadyForVerification,
    VerifiedClosed,
    Reopened
}

public enum ProformaUploadStatus
{
    Pending,
    Completed,
    Failed
}

public enum ProformaCheckResponseCode
{
    Done,
    NotDone,
    NotVerified,
    NotApplicable,
    Checked,
    NeedsAttention,
    NotChecked,
    Satisfactory
}

public enum ProformaCriterionCode
{
    RoutineMoralLessonDelivered,
    RoutineAbsenteesFollowup,
    RoutineHomeworkFirstLesson,
    RoutineModsWelcome,
    FridayEvidenceMatters,
    FridayTeachersDiary,
    FridayLessonPlanning,
    FridayTeachingMaterial,
    FridayOtherPlanning,
    OxygenQuestionPaper,
    OxygenAnswerSheets,
    OxygenAwardList,
    OxygenBoardUse,
    ObservationReferenceMaterial,
    ObservationSosRelevance,
    ObservationStudentEngagement,
    ObservationDemonstration,
    ObservationDiscipline,
    ObservationBoardAvUse,
    ObservationQuestionsAnswers,
    ObservationHomeworkAsScheduled,
    DailyUniform,
    DailyCampusCleanliness,
    DailyTeachersInClasses
}
