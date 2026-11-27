using Microsoft.EntityFrameworkCore;
using School.Infrastructure.Data;
using School.Infrastructure.Entities;

namespace School.Application.Services;

/// <summary>
/// Keeps saved exam rows when a student changes class.
/// Rows are retargeted only onto an exam the new class already has open,
/// and only for subjects that exam already contains.
/// </summary>
internal static class ExamTransferReconciler
{
    public static async Task MoveSavedRowsToOpenExamsAsync(
        AppDbContext context,
        int studentId,
        int fromClassId,
        int toClassId,
        CancellationToken cancellationToken = default)
    {
        if (studentId <= 0 || fromClassId <= 0 || toClassId <= 0 || fromClassId == toClassId)
            return;

        var oldRows = await context.Exams
            .Where(x =>
                x.StudentID == studentId &&
                x.ClassID == fromClassId &&
                x.ExamTypeID != null &&
                x.SubjectID != null)
            .ToListAsync(cancellationToken);

        if (oldRows.Count == 0)
            return;

        var examTypeIds = oldRows.Select(x => x.ExamTypeID!.Value).Distinct().ToList();
        var destinationRows = await context.Exams
            .Where(x =>
                x.ClassID == toClassId &&
                x.ExamTypeID != null &&
                examTypeIds.Contains(x.ExamTypeID.Value) &&
                x.SubjectID != null)
            .ToListAsync(cancellationToken);

        if (destinationRows.Count == 0)
            return;

        var rowIds = oldRows.Select(x => x.ID)
            .Concat(destinationRows.Where(x => x.StudentID == studentId).Select(x => x.ID))
            .Distinct()
            .ToList();
        var rowsWithComponentMarks = await LoadExamIdsWithComponentMarksAsync(context, rowIds, cancellationToken);

        foreach (var examTypeId in examTypeIds)
        {
            var typeRows = destinationRows.Where(x => x.ExamTypeID == examTypeId).ToList();
            if (typeRows.Count == 0)
                continue;

            var destinationSubjects = typeRows.Select(x => x.SubjectID!.Value).ToHashSet();
            var studentDestinationRows = typeRows.Where(x => x.StudentID == studentId).ToList();
            var coveredSubjects = new HashSet<int>();

            foreach (var oldRow in oldRows.Where(x => x.ExamTypeID == examTypeId))
            {
                var subjectId = oldRow.SubjectID!.Value;
                if (!destinationSubjects.Contains(subjectId))
                    continue;

                var placeholders = studentDestinationRows.Where(x => x.SubjectID == subjectId).ToList();
                var destinationAlreadySaved = false;
                foreach (var placeholder in placeholders)
                {
                    if (IsEmptyPlaceholder(placeholder, rowsWithComponentMarks))
                    {
                        context.Exams.Remove(placeholder);
                        studentDestinationRows.Remove(placeholder);
                        destinationRows.Remove(placeholder);
                        typeRows.Remove(placeholder);
                    }
                    else
                    {
                        destinationAlreadySaved = true;
                    }
                }

                if (destinationAlreadySaved)
                {
                    coveredSubjects.Add(subjectId);
                    continue;
                }

                oldRow.ClassID = toClassId;
                coveredSubjects.Add(subjectId);
                await RemapComponentHeadersAsync(context, oldRow, toClassId, cancellationToken);
            }

            foreach (var subjectId in destinationSubjects)
            {
                if (coveredSubjects.Contains(subjectId))
                    continue;

                // A row already on the new class (left behind on an earlier move) is enough.
                if (studentDestinationRows.Any(x => x.SubjectID == subjectId))
                    continue;

                var sample = typeRows.Where(x => x.SubjectID == subjectId).ToList();
                if (sample.Count == 0)
                    continue;

                var attendance = oldRows
                    .Where(x => x.ExamTypeID == examTypeId)
                    .Select(x => x.AttendanceRatio)
                    .FirstOrDefault(x => !string.IsNullOrWhiteSpace(x));

                context.Exams.Add(new Exam
                {
                    ExamTypeID = examTypeId,
                    StudentID = studentId,
                    SubjectID = subjectId,
                    ClassID = toClassId,
                    TotalMarks = sample.Select(x => x.TotalMarks ?? 0).Where(x => x > 0).DefaultIfEmpty(0).Max(),
                    PassingMarks = sample.Select(x => x.PassingMarks ?? 0).Where(x => x >= 0).DefaultIfEmpty(0).Max(),
                    MaxMarks = sample.Select(x => x.MaxMarks ?? 0).Where(x => x > 0).DefaultIfEmpty(0).Max(),
                    ObtainedMarks = 0,
                    AttendanceRatio = string.IsNullOrWhiteSpace(attendance) ? "-/-" : attendance
                });
            }
        }
    }

    public static async Task AdoptSavedRowsForNewExamAsync(
        AppDbContext context,
        int sectionId,
        int examTypeId,
        IReadOnlyList<int> studentIds,
        IReadOnlyList<int> subjectIds,
        CancellationToken cancellationToken = default)
    {
        if (sectionId <= 0 || examTypeId <= 0 || studentIds.Count == 0 || subjectIds.Count == 0)
            return;

        var priorRows = await context.Exams
            .Where(x =>
                x.ExamTypeID == examTypeId &&
                x.StudentID != null &&
                studentIds.Contains(x.StudentID.Value) &&
                x.SubjectID != null &&
                x.ClassID != sectionId)
            .ToListAsync(cancellationToken);

        var withComponentMarks = await LoadExamIdsWithComponentMarksAsync(
            context,
            priorRows.Select(x => x.ID).ToList(),
            cancellationToken);

        foreach (var studentId in studentIds)
        {
            var studentPrior = priorRows.Where(x => x.StudentID == studentId).ToList();
            foreach (var subjectId in subjectIds)
            {
                var chosen = studentPrior
                    .Where(x => x.SubjectID == subjectId)
                    .OrderByDescending(x => IsSavedMark(x, withComponentMarks))
                    .ThenByDescending(x => x.ID)
                    .FirstOrDefault();

                if (chosen != null)
                {
                    chosen.ClassID = sectionId;
                    await RemapComponentHeadersAsync(context, chosen, sectionId, cancellationToken);
                    continue;
                }

                context.Exams.Add(new Exam
                {
                    ExamTypeID = examTypeId,
                    SubjectID = subjectId,
                    TotalMarks = 0,
                    PassingMarks = 0,
                    ObtainedMarks = 0,
                    MaxMarks = 0,
                    StudentID = studentId,
                    ClassID = sectionId,
                    AttendanceRatio = "-/-"
                });
            }
        }
    }

    private static async Task RemapComponentHeadersAsync(
        AppDbContext context,
        Exam exam,
        int toClassId,
        CancellationToken cancellationToken)
    {
        if (exam.ID <= 0 || exam.ExamTypeID == null || exam.SubjectID == null)
            return;

        var marks = await context.ExamSubjectComponentMarks
            .Where(x => x.ExamID == exam.ID)
            .ToListAsync(cancellationToken);

        if (marks.Count == 0)
            return;

        var headerIds = marks.Select(x => x.HeaderID).Distinct().ToList();
        var currentHeaders = await context.ExamSubjectComponentHeaders
            .Where(x => headerIds.Contains(x.ID))
            .ToListAsync(cancellationToken);

        var destinationHeaders = await context.ExamSubjectComponentHeaders
            .Where(x =>
                x.ClassID == toClassId &&
                x.ExamTypeID == exam.ExamTypeID &&
                x.SubjectID == exam.SubjectID &&
                x.IsActive)
            .ToListAsync(cancellationToken);

        foreach (var mark in marks)
        {
            var current = currentHeaders.FirstOrDefault(x => x.ID == mark.HeaderID);
            if (current == null)
                continue;

            var match = destinationHeaders.FirstOrDefault(x =>
                string.Equals(x.HeaderName.Trim(), current.HeaderName.Trim(), StringComparison.OrdinalIgnoreCase));

            if (match == null || match.ID == mark.HeaderID)
                continue;

            if (marks.Any(x => x.HeaderID == match.ID))
                continue;

            mark.HeaderID = match.ID;
        }
    }

    private static async Task<HashSet<int>> LoadExamIdsWithComponentMarksAsync(
        AppDbContext context,
        IReadOnlyCollection<int> examIds,
        CancellationToken cancellationToken)
    {
        if (examIds.Count == 0)
            return [];

        var ids = await context.ExamSubjectComponentMarks
            .AsNoTracking()
            .Where(x => examIds.Contains(x.ExamID))
            .Select(x => x.ExamID)
            .Distinct()
            .ToListAsync(cancellationToken);

        return ids.ToHashSet();
    }

    private static bool IsEmptyPlaceholder(Exam row, HashSet<int> rowsWithComponentMarks)
    {
        var obtained = row.ObtainedMarks ?? 0;
        return obtained == 0 && !rowsWithComponentMarks.Contains(row.ID);
    }

    private static bool IsSavedMark(Exam row, HashSet<int> rowsWithComponentMarks)
    {
        return !IsEmptyPlaceholder(row, rowsWithComponentMarks);
    }
}
