using School.Infrastructure.Academics.Entities;

namespace School.Infrastructure.Academics.Data;

/// <summary>
/// Canonical permission catalog for the Academics DB. Seeded into tblPermission only —
/// never writes to AcademicLogin / tblUserRights from this catalog alone.
/// </summary>
public static class AcademicPermissionCatalog
{
    public static IReadOnlyList<AcademicPermission> All { get; } = Build();

    private static IReadOnlyList<AcademicPermission> Build()
    {
        var items = new List<(string Code, string Name, string Head)>();

        void Add(string code, string name, string head) => items.Add((code, name, head));

        // Dashboard
        Add("view_dashboard", "View Dashboard", "Dashboard");

        // Classes
        Add("view_classes", "View Classes", "Classes");
        Add("create_class", "Create Class", "Classes");
        Add("edit_class", "Edit Class", "Classes");
        Add("delete_class", "Delete Class", "Classes");

        // Subjects
        Add("view_subjects", "View Subjects", "Subjects");
        Add("create_subject", "Create Subject", "Subjects");
        Add("edit_subject", "Edit Subject", "Subjects");
        Add("delete_subject", "Delete Subject", "Subjects");

        // Chapters
        Add("view_chapters", "View Chapters", "Chapters");
        Add("create_chapter", "Create Chapter", "Chapters");
        Add("edit_chapter", "Edit Chapter", "Chapters");
        Add("delete_chapter", "Delete Chapter", "Chapters");

        // Question catalog
        Add("view_question_catalog", "View Question Catalog", "Question Catalog");
        Add("create_question", "Create Question", "Question Catalog");
        Add("edit_question", "Edit Question", "Question Catalog");
        Add("delete_question", "Delete Question", "Question Catalog");

        // Exam titles
        Add("view_exam_titles", "View Exam Titles", "Exam Titles");
        Add("create_exam_title", "Create Exam Title", "Exam Titles");
        Add("edit_exam_title", "Edit Exam Title", "Exam Titles");
        Add("delete_exam_title", "Delete Exam Title", "Exam Titles");

        // Exam maker
        Add("view_exam_maker", "View Exam Maker", "Exam Maker");
        Add("create_exam_paper", "Create Exam Paper", "Exam Maker");
        Add("edit_exam_paper", "Edit Exam Paper", "Exam Maker");
        Add("delete_exam_paper", "Delete Exam Paper", "Exam Maker");

        // Institute settings
        Add("view_institute_settings", "View Institute Settings", "Institute");
        Add("edit_institute_settings", "Edit Institute Settings", "Institute");

        // Users
        Add("view_users", "View Users", "Users");
        Add("create_user", "Create User", "Users");
        Add("edit_user", "Edit User", "Users");
        Add("delete_user", "Deactivate User", "Users");

        return items
            .Select((item, index) => new AcademicPermission
            {
                Id = index + 1,
                Code = item.Code,
                Name = item.Name,
                ModuleHead = item.Head,
                SortOrder = (index + 1) * 10,
                IsActive = true
            })
            .ToList();
    }
}
