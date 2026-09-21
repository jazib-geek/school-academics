using Microsoft.EntityFrameworkCore;
using School.Application.Common;
using School.Application.DTOs;
using School.Application.Interfaces;
using School.Infrastructure.Data;
using School.Infrastructure.Entities;
using System.Data;
using System.Globalization;

namespace School.Application.Services;

public class StudentService : IStudentService
{
    private readonly AppDbContext _context;
    private readonly TenantContext _tenantContext;
    private readonly IActivityLogService _activityLogService;
    private readonly ICampusNotificationService _notificationService;

    public StudentService(
        AppDbContext context,
        TenantContext tenantContext,
        IActivityLogService activityLogService,
        ICampusNotificationService notificationService)
    {
        _context = context;
        _tenantContext = tenantContext;
        _activityLogService = activityLogService;
        _notificationService = notificationService;
    }

    public async Task<PagedResultDto<StudentListItemDto>> GetStudentsAsync(StudentListFilterDto filter)
    {
        var pageNumber = filter.PageNumber < 1 ? 1 : filter.PageNumber;
        var pageSize = filter.PageSize switch
        {
            < 1 => 10,
            > 100 => 100,
            _ => filter.PageSize
        };

        var query = _context.Students
            .AsNoTracking()
            .Include(x => x.Section)
            .Include(x => x.Family)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var term = filter.Search.Trim();
            var lower = term.ToLower();
            query = query.Where(x =>
                (x.FullName != null && x.FullName.ToLower().Contains(lower)) ||
                (x.Family != null && x.Family.FatherName != null &&
                 x.Family.FatherName.ToLower().Contains(lower)) ||
                (x.Family != null && x.Family.FatherMobileNo != null &&
                 x.Family.FatherMobileNo.ToLower().Contains(lower)) ||
                (x.Family != null && x.Family.MotherPhoneNo != null &&
                 x.Family.MotherPhoneNo.ToLower().Contains(lower)) ||
                x.Reg_Id.ToString().Contains(term));
        }
        else
        {
            if (!string.IsNullOrWhiteSpace(filter.Name))
            {
                var nameFilter = filter.Name.Trim().ToLower();
                query = query.Where(x =>
                    (x.FullName != null && x.FullName.ToLower().Contains(nameFilter)) ||
                    (x.Family != null && x.Family.FatherName != null &&
                     x.Family.FatherName.ToLower().Contains(nameFilter)) ||
                    (x.Family != null && x.Family.FatherMobileNo != null &&
                     x.Family.FatherMobileNo.ToLower().Contains(nameFilter)) ||
                    (x.Family != null && x.Family.MotherPhoneNo != null &&
                     x.Family.MotherPhoneNo.ToLower().Contains(nameFilter)));
            }

            if (filter.Reg_Id.HasValue)
            {
                query = query.Where(x => x.Reg_Id == filter.Reg_Id.Value);
            }
        }

        if (!string.IsNullOrWhiteSpace(filter.Class))
        {
            var classFilter = filter.Class.Trim().ToLower();
            query = query.Where(x => x.Section != null &&
                                     x.Section.ClassName != null &&
                                     x.Section.ClassName.ToLower().Contains(classFilter));
        }

        // Omit = all statuses (listing "All"); callers that want active-only must pass true.
        if (filter.IsActive.HasValue)
        {
            query = query.Where(x => x.IsActive == filter.IsActive.Value);
        }

        if (!string.IsNullOrWhiteSpace(filter.Gender))
        {
            var genderFilter = filter.Gender.Trim().ToLower();
            query = query.Where(x => x.Gender != null && x.Gender.ToLower() == genderFilter);
        }

        if (filter.IsCreditStudent.HasValue)
        {
            query = query.Where(x => x.IsCreditStudent == filter.IsCreditStudent.Value);
        }

        var totalCount = await query.CountAsync();

        var sortBy = filter.SortBy?.Trim();
        var sortDescending = string.Equals(filter.SortDirection, "desc", StringComparison.OrdinalIgnoreCase) ||
                             string.Equals(filter.SortDirection, "descending", StringComparison.OrdinalIgnoreCase);

        query = sortBy?.ToLowerInvariant() switch
        {
            "reg_id" or "regid" or "reg-id" => sortDescending
                ? query.OrderByDescending(x => x.Reg_Id)
                : query.OrderBy(x => x.Reg_Id),
            "name" or "fullname" => sortDescending
                ? query.OrderByDescending(x => x.FullName)
                : query.OrderBy(x => x.FullName),
            // Default: newest registrations first (highest Reg_Id).
            _ => query.OrderByDescending(x => x.Reg_Id)
        };

        var items = await query
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .Select(x => new StudentListItemDto
            {
                Reg_Id = x.Reg_Id,
                FullName = x.FullName,
                ClassName = x.Section != null ? x.Section.ClassName : null,
                FamilyID = x.Family != null ? x.Family.FamilyID : null,
                FatherName = x.Family != null ? x.Family.FatherName : null,
                MotherName = x.Family != null ? x.Family.MotherName : null,
                FatherContact = x.Family != null ? x.Family.FatherMobileNo : null,
                MotherContact = x.Family != null ? x.Family.MotherPhoneNo : null,
                Gender = x.Gender,
                IsActive = x.IsActive,
                RegDate = x.RegDate,
                IsCreditStudent = x.IsCreditStudent
            })
            .ToListAsync();

        var totalPages = totalCount == 0 ? 0 : (int)Math.Ceiling(totalCount / (double)pageSize);

        return new PagedResultDto<StudentListItemDto>
        {
            Items = items,
            TotalCount = totalCount,
            PageNumber = pageNumber,
            PageSize = pageSize,
            TotalPages = totalPages
        };
    }

    public async Task<IReadOnlyList<StudentFamilyMemberDto>> GetFamilyMembersAsync(int familyId)
    {
        var rows = await _context.Students
            .AsNoTracking()
            .Include(x => x.Section)
            .Include(x => x.Family)
            .Where(x => x.Family != null && x.Family.FamilyID == familyId)
            .OrderBy(x => x.Reg_Id)
            .Select(x => new
            {
                x.Reg_Id,
                StudentName = x.FullName,
                ClassName = x.Section != null ? x.Section.ClassName : null,
                FatherName = x.Family != null ? x.Family.FatherName : null,
                FatherContact = x.Family != null ? x.Family.FatherMobileNo : null,
                RegDate = x.RegDate,
                Fee = x.Fee ?? 0,
                Concession = x.FeeConcession ?? 0m,
                TutionFee = x.TutionFee
            })
            .ToListAsync();

        return rows
            .Select(x =>
            {
                var fee = x.Fee;
                var concession = x.Concession;
                var actualFee = x.TutionFee ?? Math.Max(0, fee - concession);
                return new StudentFamilyMemberDto
                {
                    Reg_Id = x.Reg_Id,
                    StudentName = x.StudentName,
                    ClassName = x.ClassName,
                    FatherName = x.FatherName,
                    FatherContact = x.FatherContact,
                    RegDate = x.RegDate,
                    Fee = fee,
                    Concession = concession,
                    ActualFee = actualFee
                };
            })
            .ToList();
    }

    public async Task<StudentFeeBalanceDto> GetFeeBalanceAsync(int studentId, bool singleStudent = false)
    {
        var selectedStudent = await _context.Students
            .AsNoTracking()
            .Where(x => x.Reg_Id == studentId)
            .Select(x => new
            {
                x.Reg_Id,
                x.Family_Code
            })
            .FirstOrDefaultAsync();

        if (selectedStudent is null)
        {
            throw new KeyNotFoundException($"Student '{studentId}' was not found.");
        }

        var students = await _context.Students
            .AsNoTracking()
            .Include(x => x.Section)
            .Where(x => (singleStudent || !selectedStudent.Family_Code.HasValue)
                ? x.Reg_Id == studentId
                : x.Family_Code == selectedStudent.Family_Code)
            .Select(x => new
            {
                x.Reg_Id,
                x.FullName,
                x.Family_Code,
                ClassName = x.Section != null ? x.Section.ClassName : null,
                SectionName = x.Section != null ? x.Section.SectionName : null
            })
            .ToListAsync();

        var studentIds = students.Select(x => x.Reg_Id).ToList();
        var studentLookup = students.ToDictionary(x => x.Reg_Id);

        var ledgerRows = await _context.FeeAndFundCollections
            .AsNoTracking()
            .Where(x => x.StudentID.HasValue && studentIds.Contains(x.StudentID.Value))
            .Select(x => new
            {
                StudentId = x.StudentID ?? 0,
                FundTypeId = x.FundTypeID ?? 0,
                FundTypeName = x.FundType != null ? x.FundType.FundTypeName : null,
                Month = x.Month ?? 0,
                Year = x.Year ?? 0,
                Payment = x.Payment ?? 0,
                Credit = (x.Recieved ?? 0) + (x.Discount ?? 0)
            })
            .ToListAsync();

        var items = ledgerRows
            .GroupBy(x => new
            {
                x.StudentId,
                x.FundTypeId,
                FundTypeName = string.IsNullOrWhiteSpace(x.FundTypeName) ? $"Fund {x.FundTypeId}" : x.FundTypeName,
                x.Month,
                x.Year
            })
            .Select(g =>
            {
                var generated = g.Sum(x => x.Payment);
                var received = g.Sum(x => x.Credit);
                var due = generated - received;
                studentLookup.TryGetValue(g.Key.StudentId, out var student);

                return new StudentFeeBalanceItemDto
                {
                    StudentId = g.Key.StudentId,
                    StudentName = student?.FullName ?? $"Student {g.Key.StudentId}",
                    ClassName = FormatClassName(student?.ClassName, student?.SectionName, null),
                    FamilyCode = student?.Family_Code,
                    FundTypeId = g.Key.FundTypeId,
                    FundTypeName = g.Key.FundTypeName!,
                    Month = g.Key.Month,
                    Year = g.Key.Year,
                    PeriodLabel = FormatFeePeriod(g.Key.FundTypeId, g.Key.Month, g.Key.Year),
                    Generated = generated,
                    Received = received,
                    Due = due
                };
            })
            .Where(x => x.Due > 0)
            .OrderBy(x => x.StudentId)
            .ThenBy(x => x.FundTypeId == 1 ? 0 : 1)
            .ThenBy(x => x.Year == 0 ? int.MaxValue : x.Year)
            .ThenBy(x => x.Month == 0 ? int.MaxValue : x.Month)
            .ThenBy(x => x.FundTypeName)
            .ToList();

        return new StudentFeeBalanceDto
        {
            StudentId = studentId,
            FamilyCode = selectedStudent.Family_Code,
            AsOfDate = PakistanTime.Today.ToDateTime(TimeOnly.MinValue),
            TotalGenerated = items.Sum(x => x.Generated),
            TotalReceived = items.Sum(x => x.Received),
            TotalDue = items.Sum(x => x.Due),
            Items = items
        };
    }

    public async Task<ReceiveStudentFeeResponseDto> ReceiveFeeAsync(ReceiveStudentFeeRequestDto request, int? userId)
    {
        var submittedItems = request.Items
            .Where(x => x.Amount > 0)
            .Select(x => new ReceiveStudentFeeItemDto
            {
                StudentId = x.StudentId,
                FundTypeId = x.FundTypeId,
                Month = x.Month,
                Year = x.Year,
                Amount = Math.Floor(x.Amount)
            })
            .ToList();

        if (submittedItems.Count == 0)
        {
            throw new InvalidOperationException("At least one receiving amount is required.");
        }

        var manualRcptNo = string.IsNullOrWhiteSpace(request.ManualRcptNo)
            ? null
            : request.ManualRcptNo.Trim();

        var duplicate = submittedItems
            .GroupBy(x => new { x.StudentId, x.FundTypeId, x.Month, x.Year })
            .FirstOrDefault(g => g.Count() > 1);
        if (duplicate is not null)
        {
            throw new InvalidOperationException("Duplicate fee rows are not allowed in one submission.");
        }

        var studentIds = submittedItems.Select(x => x.StudentId).Distinct().ToList();
        if (manualRcptNo is not null && studentIds.Count > 1)
        {
            throw new InvalidOperationException("Manual receipt receiving is allowed for one student only.");
        }

        // Always resolve "today" and the receipt clock in Pakistan time (Plesk/server TZ can drift).
        var pakistanNow = PakistanTime.Now;
        var pakistanToday = PakistanTime.Today.ToDateTime(TimeOnly.MinValue);
        var date = request.Date == default
            ? pakistanToday
            : new DateTime(request.Date.Year, request.Date.Month, request.Date.Day);
        // Never store a future calendar day relative to Pakistan (bad client/server clocks).
        if (date > pakistanToday)
        {
            date = pakistanToday;
        }
        var time = pakistanNow.ToString("h:mm tt", CultureInfo.InvariantCulture);
        var receivedBy = await ResolveReceivedByAsync(userId);

        await using var transaction = await _context.Database.BeginTransactionAsync(IsolationLevel.Serializable);

        var students = await _context.Students
            .Include(x => x.Section)
            .Where(x => studentIds.Contains(x.Reg_Id))
            .Select(x => new
            {
                x.Reg_Id,
                x.FullName,
                x.Family_Code,
                x.ClassCompositeID,
                x.Fee,
                x.FeeConcession,
                ClassName = x.Section != null ? x.Section.ClassName : null,
                SectionName = x.Section != null ? x.Section.SectionName : null
            })
            .ToListAsync();

        if (students.Count != studentIds.Count)
        {
            throw new KeyNotFoundException("One or more students were not found.");
        }

        var studentLookup = students.ToDictionary(x => x.Reg_Id);
        var fundTypeIds = submittedItems.Select(x => x.FundTypeId).Distinct().ToList();
        var fundTypeNames = await _context.FundTypes
            .Where(x => fundTypeIds.Contains(x.ID))
            .ToDictionaryAsync(x => x.ID, x => x.FundTypeName);

        var ledgerRows = await _context.FeeAndFundCollections
            .Where(x => x.StudentID.HasValue && studentIds.Contains(x.StudentID.Value))
            .Select(x => new
            {
                StudentId = x.StudentID ?? 0,
                FundTypeId = x.FundTypeID ?? 0,
                Month = x.Month ?? 0,
                Year = x.Year ?? 0,
                Payment = x.Payment ?? 0,
                Credit = (x.Recieved ?? 0) + (x.Discount ?? 0)
            })
            .Select(x => new FeeLedgerSnapshot(x.StudentId, x.FundTypeId, x.Month, x.Year, x.Payment, x.Credit))
            .ToListAsync();

        var balanceLookup = ledgerRows
            .GroupBy(x => new { x.StudentId, x.FundTypeId, x.Month, x.Year })
            .ToDictionary(
                g => g.Key,
                g => new
                {
                    Generated = g.Sum(x => x.Payment),
                    Received = g.Sum(x => x.Credit),
                    Due = g.Sum(x => x.Payment) - g.Sum(x => x.Credit)
                });

        foreach (var item in submittedItems)
        {
            var key = new { item.StudentId, item.FundTypeId, item.Month, item.Year };
            if (!balanceLookup.TryGetValue(key, out var balance) || balance.Due <= 0)
            {
                throw new InvalidOperationException($"No pending balance found for student {item.StudentId}.");
            }

            if (item.Amount > balance.Due)
            {
                throw new InvalidOperationException($"Amount for student {item.StudentId} cannot be greater than balance.");
            }
        }

        var transactionId = (await _context.FeeAndFundCollections.MaxAsync(x => (int?)x.TransactionID) ?? 0) + 1;
        var receiptIds = await AllocateReceiptIdsAsync(studentIds.Count);
        var receiptIdByStudent = new Dictionary<int, int>();
        for (var i = 0; i < studentIds.Count; i++)
            receiptIdByStudent[studentIds[i]] = receiptIds[i];

        var insertedRows = submittedItems.Select(item =>
        {
            var student = studentLookup[item.StudentId];
            return new FeeAndFundCollection
            {
                TransactionID = transactionId,
                StudentID = item.StudentId,
                FundTypeID = item.FundTypeId,
                ClassID = student.ClassCompositeID,
                Date = date,
                Month = item.Month,
                Year = item.Year,
                Payment = 0,
                Recieved = item.Amount,
                ReceivedBy = receivedBy,
                Time = time,
                RcptID = receiptIdByStudent[item.StudentId],
                ManualRcptNo = manualRcptNo,
                VoidAmount = 0,
                Discount = 0,
                SessionYear = null
            };
        }).ToList();

        _context.FeeAndFundCollections.AddRange(insertedRows);
        await _context.SaveChangesAsync();
        await transaction.CommitAsync();

        var response = new ReceiveStudentFeeResponseDto
        {
            TransactionId = transactionId,
            Date = date,
            ReceivedBy = receivedBy,
            Campus = _tenantContext.Campus
        };

        foreach (var studentGroup in submittedItems.GroupBy(x => x.StudentId).OrderBy(g => g.Key))
        {
            var student = studentLookup[studentGroup.Key];
            var receipt = new StudentFeeReceiptDto
            {
                TransactionId = transactionId,
                ReceiptId = receiptIdByStudent[studentGroup.Key],
                StudentId = studentGroup.Key,
                FamilyCode = student.Family_Code,
                StudentName = student.FullName ?? $"Student {studentGroup.Key}",
                ClassName = FormatClassName(student.ClassName, student.SectionName, null),
                Date = date,
                Time = time,
                ReceivedBy = receivedBy,
                Campus = _tenantContext.Campus,
                ManualRcptNo = manualRcptNo
            };

            foreach (var item in studentGroup)
            {
                var key = new { item.StudentId, item.FundTypeId, item.Month, item.Year };
                var balance = balanceLookup[key];
                var isMonthlyFee = item.Month > 0;
                var inserted = insertedRows.First(x =>
                    x.StudentID == item.StudentId
                    && x.FundTypeID == item.FundTypeId
                    && x.Month == item.Month
                    && x.Year == item.Year);
                receipt.Lines.Add(new StudentFeeReceiptLineDto
                {
                    Id = inserted.ID,
                    FundTypeId = item.FundTypeId,
                    Description = FormatReceiptDescription(item.FundTypeId, item.Month, item.Year, ResolveFundTypeName(item.FundTypeId, fundTypeNames)),
                    Month = item.Month,
                    Year = item.Year,
                    // Legacy Receipt.cshtml: Actual = student TotalFee, Concession = FeeConcession for monthly fee rows.
                    ActualAmount = isMonthlyFee ? (student.Fee ?? 0) : balance.Generated,
                    Concession = isMonthlyFee ? (student.FeeConcession ?? 0) : 0,
                    PreviousReceived = balance.Received,
                    Amount = item.Amount
                });
            }

            receipt.TotalReceived = receipt.Lines.Sum(x => x.Amount);
            receipt.TotalRemaining = Math.Max(0, GetStudentTotalDueAfterReceipt(ledgerRows, studentGroup.Key, studentGroup));
            response.Receipts.Add(receipt);
        }

        var totalAmount = response.Receipts.Sum(x => x.TotalReceived);
        var receiptCount = response.Receipts.Count;
        var firstName = response.Receipts.FirstOrDefault()?.StudentName ?? "Student";
        var feeMessage = receiptCount == 1
            ? $"{receivedBy} received fee for {firstName} (Rs {totalAmount:0})."
            : $"{receivedBy} received fee for {receiptCount} students (Rs {totalAmount:0}).";

        var feeDate = response.Date.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
        var feeLink =
            $"/campus/fee/transactions?autoSearch=1&txn={response.TransactionId}&date={feeDate}";

        await _notificationService.PublishAsync(
            CampusNotificationFactory.Create(
                CampusNotificationTypes.FeeReceived,
                "Fee received",
                feeMessage,
                feeLink,
                CampusNotificationSeverities.Success,
                ["submit_fee", "trx"],
                actorUserKey: receivedBy));

        return response;
    }

    private static string FormatClassName(string? className, string? sectionName, int? fallbackId)
    {
        var parts = new[] { className, sectionName }
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .Select(x => x!.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase);
        var name = string.Join("-", parts).Trim();
        return string.IsNullOrWhiteSpace(name) ? (fallbackId.HasValue ? $"Class {fallbackId}" : "-") : name;
    }

    private static string FormatFeePeriod(int fundTypeId, int month, int year)
    {
        if (fundTypeId == 1 && month is >= 1 and <= 12 && year > 0)
        {
            return new DateTime(year, month, 1).ToString("MMM yyyy", CultureInfo.InvariantCulture);
        }

        return year > 0 ? year.ToString(CultureInfo.InvariantCulture) : "-";
    }

    private static string FormatReceiptDescription(int fundTypeId, int month, int year, string fundTypeName)
    {
        if (fundTypeId == 1 && month is >= 1 and <= 12 && year > 0)
        {
            return $"{new DateTime(year, month, 1).ToString("MMMM yyyy", CultureInfo.InvariantCulture)} Fee";
        }

        return year > 0 ? $"{fundTypeName} {year}" : fundTypeName;
    }

    private static string ResolveFundTypeName(int fundTypeId, Dictionary<int, string?> names)
    {
        return names.TryGetValue(fundTypeId, out var name) && !string.IsNullOrWhiteSpace(name)
            ? name.Trim()
            : fundTypeId == 1 ? "Tuition Fee" : $"Fund {fundTypeId}";
    }

    private static decimal GetStudentTotalDueAfterReceipt(
        List<FeeLedgerSnapshot> ledgerRows,
        int studentId,
        IEnumerable<ReceiveStudentFeeItemDto> receiptItems)
    {
        var receiptLookup = receiptItems.ToDictionary(
            x => new { x.StudentId, x.FundTypeId, x.Month, x.Year },
            x => x.Amount);

        return ledgerRows
            .Where(x => x.StudentId == studentId)
            .GroupBy(x => new { x.StudentId, x.FundTypeId, x.Month, x.Year })
            .Sum(g =>
            {
                var before = g.Sum(x => x.Payment) - g.Sum(x => x.Credit);
                receiptLookup.TryGetValue(g.Key, out var paidNow);
                return Math.Max(0, before - paidNow);
            });
    }

    private async Task<string> ResolveReceivedByAsync(int? userId)
    {
        if (userId.HasValue)
        {
            var username = await _context.Users
                .Where(x => x.ID == userId.Value)
                .Select(x => x.Username)
                .FirstOrDefaultAsync();

            if (!string.IsNullOrWhiteSpace(username))
            {
                return username.Trim();
            }
        }

        return userId.HasValue ? userId.Value.ToString(CultureInfo.InvariantCulture) : "system";
    }

    /// <summary>
    /// Issues sequential RcptIDs from tblFeeReceiptSequence, never below Max(collections.RcptID),
    /// so hard-deleted receipt numbers are never reused.
    /// Must run inside the caller's Serializable transaction.
    /// </summary>
    private async Task<List<int>> AllocateReceiptIdsAsync(int count)
    {
        if (count <= 0)
            return [];

        var sequence = await _context.FeeReceiptSequences.FirstOrDefaultAsync();
        if (sequence is null)
        {
            var maxExisting = await _context.FeeAndFundCollections.MaxAsync(x => (int?)x.RcptID) ?? 0;
            sequence = new FeeReceiptSequence { LastIssuedRcptId = maxExisting };
            _context.FeeReceiptSequences.Add(sequence);
            await _context.SaveChangesAsync();
        }

        var maxFromCollections = await _context.FeeAndFundCollections.MaxAsync(x => (int?)x.RcptID) ?? 0;
        var next = Math.Max(sequence.LastIssuedRcptId, maxFromCollections) + 1;
        var issued = new List<int>(count);
        for (var i = 0; i < count; i++)
            issued.Add(next++);

        sequence.LastIssuedRcptId = issued[^1];
        return issued;
    }

    private sealed record FeeLedgerSnapshot(int StudentId, int FundTypeId, int Month, int Year, decimal Payment, decimal Credit);

    public async Task<StudentAdmissionLookupsDto> GetAdmissionLookupsAsync(CancellationToken cancellationToken = default)
    {
        var localities = await _context.Localities.AsNoTracking()
            .Where(x => x.IsActive == true && x.Town != null && x.Town != "")
            .OrderBy(x => x.Town)
            .Select(x => new IdNameDto { Id = x.ID, Name = x.Town! })
            .ToListAsync(cancellationToken);

        var occupations = await _context.Occupations.AsNoTracking()
            .Where(x => x.IsActive != false && x.OccupationName != null && x.OccupationName != "")
            .OrderBy(x => x.OccupationName)
            .Select(x => new IdNameDto { Id = x.ID, Name = x.OccupationName! })
            .ToListAsync(cancellationToken);

        var qualifications = await _context.DegreeParameters.AsNoTracking()
            .Where(x => x.IsActive != false && x.DegreeTitle != null && x.DegreeTitle != "")
            .OrderBy(x => x.DegreeTitle)
            .Select(x => new IdNameDto { Id = x.ID, Name = x.DegreeTitle! })
            .ToListAsync(cancellationToken);

        var subjectGroups = await _context.SubjectGroups.AsNoTracking()
            .Where(x => x.IsActive != false && x.subject_group_name != null && x.subject_group_name != "")
            .OrderBy(x => x.subject_group_name)
            .Select(x => new IdNameDto { Id = x.subject_group_id, Name = x.subject_group_name! })
            .ToListAsync(cancellationToken);

        var fundTypes = await _context.FundTypes.AsNoTracking()
            .Where(x => x.ID >= 2 && x.ID <= 5 && x.FundTypeName != null)
            .OrderBy(x => x.ID)
            .Select(x => new IdNameDto { Id = x.ID, Name = x.FundTypeName! })
            .ToListAsync(cancellationToken);

        return new StudentAdmissionLookupsDto
        {
            Localities = localities,
            Occupations = occupations,
            Qualifications = qualifications,
            SubjectGroups = subjectGroups,
            FundTypes = fundTypes
        };
    }

    public async Task<int> GetNextFamilyCodeAsync(CancellationToken cancellationToken = default)
    {
        var max = await _context.StudentFamilyDetails.AsNoTracking()
            .Where(x => x.FamilyID != null)
            .MaxAsync(x => (int?)x.FamilyID, cancellationToken) ?? 0;
        return max + 1;
    }

    public async Task<IReadOnlyList<FamilySearchResultDto>> SearchFamiliesAsync(
        string? query,
        CancellationToken cancellationToken = default)
    {
        var term = (query ?? string.Empty).Trim();
        if (term.Length == 0)
            return [];

        var q = _context.StudentFamilyDetails.AsNoTracking().AsQueryable();

        if (int.TryParse(term, out var familyCode))
        {
            q = q.Where(x => x.FamilyID == familyCode
                || (x.FatherName != null && x.FatherName.Contains(term))
                || (x.MotherName != null && x.MotherName.Contains(term)));
        }
        else
        {
            var lower = term.ToLower();
            q = q.Where(x =>
                (x.FatherName != null && x.FatherName.ToLower().Contains(lower))
                || (x.MotherName != null && x.MotherName.ToLower().Contains(lower)));
        }

        var families = await q
            .Where(x => x.FamilyID != null)
            .OrderByDescending(x => x.FamilyID)
            .Take(30)
            .ToListAsync(cancellationToken);

        if (families.Count == 0)
            return [];

        var codes = families.Select(x => x.FamilyID!.Value).Distinct().ToList();
        var siblingCounts = await _context.Students.AsNoTracking()
            .Where(x => x.Family_Code != null && codes.Contains(x.Family_Code.Value))
            .GroupBy(x => x.Family_Code!.Value)
            .Select(g => new { FamilyId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.FamilyId, x => x.Count, cancellationToken);

        var addresses = await _context.Students.AsNoTracking()
            .Where(x => x.Family_Code != null && codes.Contains(x.Family_Code.Value) && x.Home_Address != null)
            .GroupBy(x => x.Family_Code!.Value)
            .Select(g => new { FamilyId = g.Key, Address = g.Select(s => s.Home_Address).FirstOrDefault() })
            .ToDictionaryAsync(x => x.FamilyId, x => x.Address, cancellationToken);

        return families.Select(f => MapFamily(f, siblingCounts, addresses)).ToList();
    }

    public async Task<FamilySearchResultDto> GetFamilyAsync(int familyId, CancellationToken cancellationToken = default)
    {
        var family = await _context.StudentFamilyDetails.AsNoTracking()
            .FirstOrDefaultAsync(x => x.FamilyID == familyId, cancellationToken)
            ?? throw new KeyNotFoundException("Family not found.");

        var siblingCount = await _context.Students.AsNoTracking()
            .CountAsync(x => x.Family_Code == familyId, cancellationToken);

        var address = await _context.Students.AsNoTracking()
            .Where(x => x.Family_Code == familyId && x.Home_Address != null && x.Home_Address != "")
            .Select(x => x.Home_Address)
            .FirstOrDefaultAsync(cancellationToken);

        return MapFamily(
            family,
            new Dictionary<int, int> { [familyId] = siblingCount },
            new Dictionary<int, string?> { [familyId] = address ?? family.HomeAddress });
    }

    public async Task<StudentRegisterResultDto> RegisterStudentAsync(
        StudentRegisterRequestDto request,
        int? userId = null,
        CancellationToken cancellationToken = default)
    {
        var fullName = (request.FullName ?? string.Empty).Trim();
        if (fullName.Length == 0)
            throw new ArgumentException("Student name is required.");
        if (request.FamilyCode <= 0)
            throw new ArgumentException("Family code is required.");
        if (request.ClassCompositeId <= 0)
            throw new ArgumentException("Class is required.");

        var section = await _context.Sections
            .FirstOrDefaultAsync(x => x.ID == request.ClassCompositeId, cancellationToken)
            ?? throw new ArgumentException("Selected class was not found.");

        var classFee = request.ClassFee ?? section.Fee ?? 0;
        var tuition = request.TuitionFee;
        if (tuition < 0)
            throw new ArgumentException("Tuition fee cannot be negative.");

        var concession = request.FeeConcession;
        if (concession < 0)
            concession = 0;

        await using var tx = await _context.Database.BeginTransactionAsync(cancellationToken);

        var nextRegId = (await _context.Students.MaxAsync(x => (int?)x.Reg_Id, cancellationToken) ?? 0) + 1;
        var now = PakistanTime.Now;
        var regDate = (request.RegDate ?? now).Date;
        var password = GenerateRandomPassword(6);
        var showCreditStudent = await GetShowCreditStudentAsync(cancellationToken);

        var student = new Student
        {
            Reg_Id = nextRegId,
            FullName = fullName,
            NameInUrdu = Clean(request.NameInUrdu),
            Home_Address = Clean(request.HomeAddress),
            Date_of_Brith = request.DateOfBirth?.Date,
            RegDate = regDate,
            Family_Code = request.FamilyCode,
            Gender = Clean(request.Gender),
            Caste = Clean(request.Caste),
            isOrphan = request.IsOrphan,
            isHafiz = request.IsHafiz,
            LocalityID = request.LocalityId,
            SpecialNotes = Clean(request.SpecialNotes),
            B_FormNum = Clean(request.BFormNum),
            Religion = Clean(request.Religion),
            Medium = Clean(request.Medium) ?? "English",
            Class_ID = section.Class_ID,
            Section_ID = section.SectionID,
            ClassCompositeID = section.ID,
            Fee = classFee,
            TutionFee = tuition,
            FeeConcession = concession,
            PrevSchoolName = Clean(request.PrevSchoolName),
            PrevSchoolClass = Clean(request.PrevSchoolClass),
            SMS_Contact = Clean(request.FatherMobileNo),
            SubjectGroupID = request.SubjectGroupId,
            BranchID = section.BranchID,
            Password = password,
            SessionSpan = Clean(request.SessionSpan),
            Home_Phone = Clean(request.HomePhone),
            IsActive = true,
            IsCreditStudent = showCreditStudent && request.IsCreditStudent
        };

        _context.Students.Add(student);

        _context.StudentFamilies.Add(new StudentFamily
        {
            StudentID = nextRegId,
            FamilyID = request.FamilyCode
        });

        var familyExists = await _context.StudentFamilyDetails
            .AnyAsync(x => x.FamilyID == request.FamilyCode, cancellationToken);

        var familyDetailCreated = false;
        if (!familyExists)
        {
            _context.StudentFamilyDetails.Add(new StudentFamilyDetail
            {
                FamilyID = request.FamilyCode,
                FatherName = Clean(request.FatherName),
                FatherCNIC = Clean(request.FatherCNIC),
                FatherOccupationID = request.FatherOccupationId,
                FatherQualificationID = request.FatherQualificationId,
                FatherMobileNo = Clean(request.FatherMobileNo),
                MotherName = Clean(request.MotherName),
                MotherCNIC = Clean(request.MotherCNIC),
                MotherPhoneNo = Clean(request.MotherPhoneNo),
                MotherQualificationID = request.MotherQualificationId,
                MotherOccupationID = request.MotherOccupationId,
                HomePhone = Clean(request.HomePhone),
                HomeAddress = Clean(request.HomeAddress),
                Password = GenerateRandomPassword(6),
                IsActive = true
            });
            familyDetailCreated = true;
        }

        await _context.SaveChangesAsync(cancellationToken);

        var fundTypes = await _context.FundTypes
            .AsNoTracking()
            .Where(x => x.ID >= 1 && x.ID <= 5)
            .ToDictionaryAsync(x => x.ID, x => x.FundTypeName ?? $"Fund {x.ID}", cancellationToken);

        var fundsGenerated = false;
        if (request.GenerateFunds)
        {
            var fundYear = request.FundYear ?? now.Year;
            await UpsertGeneratedFundAsync(
                nextRegId, section.ID, section.BranchID ?? 1, 2, 0, fundYear,
                request.AdmissionFee, fundTypes.GetValueOrDefault(2, "Admission Fee"), now, cancellationToken);
            await UpsertGeneratedFundAsync(
                nextRegId, section.ID, section.BranchID ?? 1, 3, 0, fundYear,
                request.MiscCharges, fundTypes.GetValueOrDefault(3, "Misc Charges"), now, cancellationToken);
            await UpsertGeneratedFundAsync(
                nextRegId, section.ID, section.BranchID ?? 1, 4, 0, fundYear,
                request.PrevBalance, fundTypes.GetValueOrDefault(4, "Prev Balance"), now, cancellationToken);
            await UpsertGeneratedFundAsync(
                nextRegId, section.ID, section.BranchID ?? 1, 5, 0, fundYear,
                request.TransportCharges, fundTypes.GetValueOrDefault(5, "Transport Charges"), now, cancellationToken);
            fundsGenerated = true;
        }

        var tuitionGenerated = false;
        if (request.GenerateTuitionFee)
        {
            var month = request.TuitionMonth ?? now.Month;
            var year = request.TuitionYear ?? now.Year;
            var amount = request.TuitionGenerateAmount ?? tuition;
            await UpsertGeneratedFundAsync(
                nextRegId, section.ID, section.BranchID ?? 1, 1, month, year,
                amount, fundTypes.GetValueOrDefault(1, "Tution Fee"), now, cancellationToken);
            tuitionGenerated = true;
        }

        if (fundsGenerated || tuitionGenerated)
            await _context.SaveChangesAsync(cancellationToken);

        await tx.CommitAsync(cancellationToken);

        var actorUserKey = await ResolveReceivedByAsync(userId);
        if (string.Equals(actorUserKey, "system", StringComparison.OrdinalIgnoreCase))
            actorUserKey = null;

        await _notificationService.PublishAsync(
            CampusNotificationFactory.Create(
                CampusNotificationTypes.StudentRegistered,
                "New student registered",
                $"{fullName} (#{nextRegId}) was registered.",
                $"/campus/students?profile={nextRegId}",
                CampusNotificationSeverities.Success,
                ["list_std", "add_std"],
                actorUserKey: actorUserKey),
            cancellationToken);

        return new StudentRegisterResultDto
        {
            RegId = nextRegId,
            FamilyCode = request.FamilyCode,
            FullName = fullName,
            FamilyDetailCreated = familyDetailCreated,
            TuitionGenerated = tuitionGenerated,
            FundsGenerated = fundsGenerated
        };
    }

    public async Task<StudentAdmissionDetailDto> GetAdmissionDetailAsync(
        int studentId,
        CancellationToken cancellationToken = default)
    {
        var student = await _context.Students
            .AsNoTracking()
            .Include(x => x.Section)
            .Include(x => x.Family)
            .FirstOrDefaultAsync(x => x.Reg_Id == studentId, cancellationToken)
            ?? throw new KeyNotFoundException("Student not found.");

        var family = student.Family;
        var fundRows = await _context.FeeAndFundCollections
            .AsNoTracking()
            .Where(x => x.StudentID == studentId
                        && x.FundTypeID != null
                        && x.FundTypeID >= 2
                        && x.FundTypeID <= 5
                        && x.Payment > 0)
            .Select(x => new { FundTypeId = x.FundTypeID!.Value, x.Year, x.Month, x.Payment })
            .ToListAsync(cancellationToken);

        decimal FundAmount(int fundTypeId) =>
            fundRows
                .Where(x => x.FundTypeId == fundTypeId)
                .OrderByDescending(x => x.Year)
                .ThenByDescending(x => x.Month)
                .Select(x => x.Payment ?? 0m)
                .FirstOrDefault();

        var classFee = student.Fee ?? student.Section?.Fee ?? 0;
        var tuition = student.TutionFee ?? 0m;
        var concession = student.FeeConcession ?? Math.Max(0m, classFee - tuition);

        string? localityName = null;
        if (student.LocalityID is int localityId)
        {
            localityName = await _context.Localities.AsNoTracking()
                .Where(x => x.ID == localityId)
                .Select(x => x.Town)
                .FirstOrDefaultAsync(cancellationToken);
        }

        string? subjectGroupName = null;
        if (student.SubjectGroupID is int subjectGroupId)
        {
            subjectGroupName = await _context.SubjectGroups.AsNoTracking()
                .Where(x => x.subject_group_id == subjectGroupId)
                .Select(x => x.subject_group_name)
                .FirstOrDefaultAsync(cancellationToken);
        }

        async Task<string?> OccupationName(int? id) =>
            id is null
                ? null
                : await _context.Occupations.AsNoTracking()
                    .Where(x => x.ID == id)
                    .Select(x => x.OccupationName)
                    .FirstOrDefaultAsync(cancellationToken);

        async Task<string?> QualificationName(int? id) =>
            id is null
                ? null
                : await _context.DegreeParameters.AsNoTracking()
                    .Where(x => x.ID == id)
                    .Select(x => x.DegreeTitle)
                    .FirstOrDefaultAsync(cancellationToken);

        return new StudentAdmissionDetailDto
        {
            RegId = student.Reg_Id,
            FullName = student.FullName ?? string.Empty,
            NameInUrdu = student.NameInUrdu,
            HomeAddress = student.Home_Address ?? family?.HomeAddress,
            LocalityId = student.LocalityID,
            LocalityName = localityName,
            Caste = student.Caste,
            Gender = student.Gender,
            IsOrphan = student.isOrphan == true,
            IsHafiz = student.isHafiz == true,
            IsCreditStudent = student.IsCreditStudent,
            Religion = student.Religion,
            DateOfBirth = student.Date_of_Brith,
            BFormNum = student.B_FormNum,
            SubjectGroupId = student.SubjectGroupID,
            SubjectGroupName = subjectGroupName,
            Medium = student.Medium,
            PrevSchoolName = student.PrevSchoolName,
            PrevSchoolClass = student.PrevSchoolClass,
            FatherName = family?.FatherName,
            MotherName = family?.MotherName,
            FatherCNIC = family?.FatherCNIC,
            MotherCNIC = family?.MotherCNIC,
            FatherQualificationId = family?.FatherQualificationID,
            MotherQualificationId = family?.MotherQualificationID,
            FatherQualificationName = await QualificationName(family?.FatherQualificationID),
            MotherQualificationName = await QualificationName(family?.MotherQualificationID),
            FatherMobileNo = family?.FatherMobileNo ?? student.SMS_Contact,
            MotherPhoneNo = family?.MotherPhoneNo,
            FatherOccupationId = family?.FatherOccupationID,
            MotherOccupationId = family?.MotherOccupationID,
            FatherOccupationName = await OccupationName(family?.FatherOccupationID),
            MotherOccupationName = await OccupationName(family?.MotherOccupationID),
            HomePhone = student.Home_Phone ?? family?.HomePhone,
            SpecialNotes = student.SpecialNotes,
            FamilyCode = student.Family_Code,
            ClassCompositeId = student.ClassCompositeID,
            ClassName = student.Section?.ClassName,
            SessionSpan = student.SessionSpan,
            RegDate = student.RegDate,
            BranchLabel = student.Section?.Branch,
            IsActive = student.IsActive,
            ClassFee = classFee,
            TuitionFee = tuition,
            FeeConcession = concession,
            AdmissionFee = FundAmount(2),
            MiscCharges = FundAmount(3),
            PrevBalance = FundAmount(4),
            TransportCharges = FundAmount(5)
        };
    }

    public async Task<StudentUpdateResultDto> UpdateStudentAsync(
        int studentId,
        StudentUpdateRequestDto request,
        int? userId = null,
        CancellationToken cancellationToken = default)
    {
        var fullName = (request.FullName ?? string.Empty).Trim();
        if (fullName.Length == 0)
            throw new ArgumentException("Student name is required.");

        var student = await _context.Students
            .FirstOrDefaultAsync(x => x.Reg_Id == studentId, cancellationToken)
            ?? throw new KeyNotFoundException("Student not found.");

        StudentFamilyDetail? family = null;
        if (student.Family_Code is int familyCodeLookup and > 0)
        {
            family = await _context.StudentFamilyDetails
                .FirstOrDefaultAsync(x => x.FamilyID == familyCodeLookup, cancellationToken);
        }

        var before = SnapshotStudentProfile(student, family);

        // Basic student profile only — never touch Fee / TutionFee / FeeConcession /
        // ClassCompositeID / Family_Code / SessionSpan / BranchID or fee ledger rows.
        student.FullName = fullName;
        student.NameInUrdu = Clean(request.NameInUrdu);
        student.Home_Address = Clean(request.HomeAddress);
        student.LocalityID = request.LocalityId;
        student.Caste = Clean(request.Caste);
        student.Gender = Clean(request.Gender);
        student.isOrphan = request.IsOrphan;
        student.isHafiz = request.IsHafiz;
        var showCreditStudent = await GetShowCreditStudentAsync(cancellationToken);
        student.IsCreditStudent = showCreditStudent && request.IsCreditStudent;
        student.Religion = Clean(request.Religion);
        student.Date_of_Brith = request.DateOfBirth?.Date;
        student.B_FormNum = Clean(request.BFormNum);
        student.SubjectGroupID = request.SubjectGroupId;
        student.Medium = Clean(request.Medium) ?? student.Medium;
        student.PrevSchoolName = Clean(request.PrevSchoolName);
        student.PrevSchoolClass = Clean(request.PrevSchoolClass);
        student.SpecialNotes = Clean(request.SpecialNotes);
        student.Home_Phone = Clean(request.HomePhone);
        student.SMS_Contact = Clean(request.FatherMobileNo);
        if (request.RegDate.HasValue)
            student.RegDate = request.RegDate.Value.Date;

        if (student.Family_Code is int familyCode and > 0)
        {
            if (family is null)
            {
                family = new StudentFamilyDetail
                {
                    FamilyID = familyCode,
                    Password = GenerateRandomPassword(6),
                    IsActive = true
                };
                _context.StudentFamilyDetails.Add(family);
            }

            family.FatherName = Clean(request.FatherName);
            family.FatherCNIC = Clean(request.FatherCNIC);
            family.FatherOccupationID = request.FatherOccupationId;
            family.FatherQualificationID = request.FatherQualificationId;
            family.FatherMobileNo = Clean(request.FatherMobileNo);
            family.MotherName = Clean(request.MotherName);
            family.MotherCNIC = Clean(request.MotherCNIC);
            family.MotherPhoneNo = Clean(request.MotherPhoneNo);
            family.MotherQualificationID = request.MotherQualificationId;
            family.MotherOccupationID = request.MotherOccupationId;
            family.HomePhone = Clean(request.HomePhone);
            family.HomeAddress = Clean(request.HomeAddress);
        }

        var after = SnapshotStudentProfile(student, family);
        var changes = DiffSnapshots(before, after);
        if (changes.Count > 0)
        {
            await _activityLogService.WriteAsync(
                ActivityLogTypes.StudentEdit,
                ActivityLogEntityTypes.Student,
                student.Reg_Id,
                fullName,
                userId,
                new { source = "edit-form", changes },
                cancellationToken);
        }

        await _context.SaveChangesAsync(cancellationToken);

        return new StudentUpdateResultDto
        {
            RegId = student.Reg_Id,
            FullName = fullName
        };
    }

    public async Task<IReadOnlyList<StudentBulkEditRowDto>> GetBulkEditStudentsAsync(
        int classCompositeId,
        CancellationToken cancellationToken = default)
    {
        if (classCompositeId <= 0)
            throw new ArgumentException("Class is required.");

        var rows = await _context.Students
            .AsNoTracking()
            .Include(x => x.Section)
            .Include(x => x.Family)
            .Where(x => x.IsActive == true && x.ClassCompositeID == classCompositeId)
            .OrderBy(x => x.FullName)
            .ThenBy(x => x.Reg_Id)
            .ToListAsync(cancellationToken);

        return rows.Select(student =>
        {
            var classFee = student.Fee ?? student.Section?.Fee ?? 0;
            var tuition = student.TutionFee ?? 0m;
            var concession = student.FeeConcession ?? Math.Max(0m, classFee - tuition);

            return new StudentBulkEditRowDto
            {
                RegId = student.Reg_Id,
                FullName = student.FullName ?? string.Empty,
                FatherName = student.Family?.FatherName,
                FatherContact = student.Family?.FatherMobileNo ?? student.SMS_Contact,
                HomeAddress = student.Home_Address,
                FamilyCode = student.Family_Code,
                ClassCompositeId = student.ClassCompositeID,
                ClassName = student.Section?.ClassName,
                ClassFee = classFee,
                TuitionFee = tuition,
                FeeConcession = concession
            };
        }).ToList();
    }

    public async Task<StudentBulkUpdateResultDto> BulkUpdateStudentAsync(
        int studentId,
        StudentBulkUpdateRequestDto request,
        int? userId = null,
        CancellationToken cancellationToken = default)
    {
        var fullName = (request.FullName ?? string.Empty).Trim();
        if (fullName.Length == 0)
            throw new ArgumentException("Student name is required.");
        if (request.ClassCompositeId <= 0)
            throw new ArgumentException("Class is required.");
        if (request.TuitionFee < 0)
            throw new ArgumentException("Tuition fee cannot be negative.");

        var student = await _context.Students
            .FirstOrDefaultAsync(x => x.Reg_Id == studentId, cancellationToken)
            ?? throw new KeyNotFoundException("Student not found.");

        var section = await _context.Sections
            .FirstOrDefaultAsync(x => x.ID == request.ClassCompositeId, cancellationToken)
            ?? throw new ArgumentException("Selected class was not found.");

        StudentFamilyDetail? family = null;
        if (student.Family_Code is int familyCodeLookup and > 0)
        {
            family = await _context.StudentFamilyDetails
                .FirstOrDefaultAsync(x => x.FamilyID == familyCodeLookup, cancellationToken);
        }

        var previousClassName = await _context.Sections
            .AsNoTracking()
            .Where(x => x.ID == student.ClassCompositeID)
            .Select(x => x.ClassName)
            .FirstOrDefaultAsync(cancellationToken);

        var before = SnapshotBulkEdit(student, family, previousClassName);

        var previousAddress = student.Home_Address?.Trim() ?? string.Empty;
        var nextAddress = Clean(request.HomeAddress) ?? string.Empty;
        var addressChanged = !string.Equals(previousAddress, nextAddress, StringComparison.Ordinal);

        student.FullName = fullName;
        student.ClassCompositeID = section.ID;
        student.Class_ID = section.Class_ID;
        student.Section_ID = section.SectionID;
        student.BranchID = section.BranchID;

        var classFee = section.Fee ?? student.Fee ?? 0;
        student.Fee = classFee;
        student.TutionFee = request.TuitionFee;
        // Keep class fee / tuition / concession in equilibrium (same as admission form).
        student.FeeConcession = Math.Max(0m, classFee - request.TuitionFee);

        student.SMS_Contact = Clean(request.FatherContact);
        student.Home_Address = string.IsNullOrEmpty(nextAddress) ? null : nextAddress;

        var familyAddressUpdatedCount = 0;
        if (addressChanged && student.Family_Code is int familyCodeForAddress and > 0)
        {
            var siblings = await _context.Students
                .Where(x => x.Family_Code == familyCodeForAddress && x.Reg_Id != student.Reg_Id)
                .ToListAsync(cancellationToken);

            foreach (var sibling in siblings)
            {
                sibling.Home_Address = student.Home_Address;
                familyAddressUpdatedCount++;
            }
        }

        if (student.Family_Code is int familyCode and > 0)
        {
            if (family is null)
            {
                family = new StudentFamilyDetail
                {
                    FamilyID = familyCode,
                    Password = GenerateRandomPassword(6),
                    IsActive = true
                };
                _context.StudentFamilyDetails.Add(family);
            }

            family.FatherName = Clean(request.FatherName);
            family.FatherMobileNo = Clean(request.FatherContact);
            if (addressChanged)
                family.HomeAddress = student.Home_Address;
        }

        var after = SnapshotBulkEdit(student, family, section.ClassName);
        var changes = DiffSnapshots(before, after);
        if (changes.Count > 0 || familyAddressUpdatedCount > 0)
        {
            await _activityLogService.WriteAsync(
                ActivityLogTypes.StudentBulkEdit,
                ActivityLogEntityTypes.Student,
                student.Reg_Id,
                fullName,
                userId,
                new
                {
                    source = "bulk-edit",
                    changes,
                    familyAddressUpdatedCount
                },
                cancellationToken);
        }

        await _context.SaveChangesAsync(cancellationToken);

        return new StudentBulkUpdateResultDto
        {
            RegId = student.Reg_Id,
            FullName = fullName,
            ClassFee = classFee,
            TuitionFee = request.TuitionFee,
            FeeConcession = student.FeeConcession ?? 0m,
            ClassCompositeId = section.ID,
            ClassName = section.ClassName,
            FamilyAddressUpdatedCount = familyAddressUpdatedCount
        };
    }

    public async Task<StudentTransferResultDto> TransferStudentAsync(
        int studentId,
        StudentTransferRequestDto request,
        int? userId = null,
        CancellationToken cancellationToken = default)
    {
        var description = (request.Description ?? string.Empty).Trim();
        if (description.Length < 3)
            throw new ArgumentException("Please enter a short reason for the transfer.");
        if (request.ClassCompositeId <= 0)
            throw new ArgumentException("New class is required.");
        if (request.UpdateTuitionFee && request.TuitionFee is null)
            throw new ArgumentException("Tuition fee is required when updating tuition.");
        if (request.UpdateTuitionFee && request.TuitionFee < 0)
            throw new ArgumentException("Tuition fee cannot be negative.");

        var student = await _context.Students
            .FirstOrDefaultAsync(x => x.Reg_Id == studentId, cancellationToken)
            ?? throw new KeyNotFoundException("Student not found.");

        var targetSection = await _context.Sections
            .FirstOrDefaultAsync(x => x.ID == request.ClassCompositeId, cancellationToken)
            ?? throw new ArgumentException("Selected class was not found.");

        if (student.ClassCompositeID == targetSection.ID)
            throw new ArgumentException("Student is already in the selected class.");

        var previousClassName = await _context.Sections
            .AsNoTracking()
            .Where(x => x.ID == student.ClassCompositeID)
            .Select(x => x.ClassName)
            .FirstOrDefaultAsync(cancellationToken);

        var previousClassCompositeId = student.ClassCompositeID;
        var previousClassFee = student.Fee ?? 0;
        var previousTuition = student.TutionFee ?? 0m;
        var previousConcession = student.FeeConcession ?? Math.Max(0m, previousClassFee - previousTuition);
        var newClassFee = targetSection.Fee ?? 0;

        var before = new Dictionary<string, string?>(StringComparer.Ordinal)
        {
            ["classCompositeId"] = FormatInt(previousClassCompositeId),
            ["className"] = previousClassName
        };

        // Class move only — never generate fee ledger / fund rows.
        student.ClassCompositeID = targetSection.ID;
        student.Class_ID = targetSection.Class_ID;
        student.Section_ID = targetSection.SectionID;
        student.BranchID = targetSection.BranchID;

        decimal? nextTuition = null;
        decimal? nextConcession = null;
        if (request.UpdateTuitionFee)
        {
            nextTuition = request.TuitionFee!.Value;
            nextConcession = Math.Max(0m, newClassFee - nextTuition.Value);
            student.Fee = newClassFee;
            student.TutionFee = nextTuition;
            student.FeeConcession = nextConcession;

            before["classFee"] = FormatDecimal(previousClassFee);
            before["tuitionFee"] = FormatDecimal(previousTuition);
            before["feeConcession"] = FormatDecimal(previousConcession);
        }

        var after = new Dictionary<string, string?>(StringComparer.Ordinal)
        {
            ["classCompositeId"] = FormatInt(student.ClassCompositeID),
            ["className"] = targetSection.ClassName
        };
        if (request.UpdateTuitionFee)
        {
            after["classFee"] = FormatDecimal(newClassFee);
            after["tuitionFee"] = FormatDecimal(nextTuition);
            after["feeConcession"] = FormatDecimal(nextConcession);
        }

        await _activityLogService.WriteAsync(
            ActivityLogTypes.StudentTransfer,
            ActivityLogEntityTypes.Student,
            student.Reg_Id,
            student.FullName,
            userId,
            new
            {
                source = "transfer",
                description,
                updateTuitionFee = request.UpdateTuitionFee,
                changes = DiffSnapshots(before, after),
                before = new
                {
                    classCompositeId = previousClassCompositeId,
                    className = previousClassName,
                    classFee = request.UpdateTuitionFee ? previousClassFee : (int?)null,
                    tuitionFee = request.UpdateTuitionFee ? previousTuition : (decimal?)null,
                    feeConcession = request.UpdateTuitionFee ? previousConcession : (decimal?)null
                },
                after = new
                {
                    classCompositeId = student.ClassCompositeID,
                    className = targetSection.ClassName,
                    classFee = request.UpdateTuitionFee ? newClassFee : (int?)null,
                    tuitionFee = nextTuition,
                    feeConcession = nextConcession
                }
            },
            cancellationToken);

        await _context.SaveChangesAsync(cancellationToken);

        return new StudentTransferResultDto
        {
            RegId = student.Reg_Id,
            FullName = student.FullName ?? string.Empty,
            PreviousClassCompositeId = previousClassCompositeId,
            PreviousClassName = previousClassName,
            ClassCompositeId = student.ClassCompositeID,
            ClassName = targetSection.ClassName,
            TuitionFeeUpdated = request.UpdateTuitionFee,
            ClassFee = request.UpdateTuitionFee ? newClassFee : previousClassFee,
            PreviousTuitionFee = request.UpdateTuitionFee ? previousTuition : null,
            TuitionFee = nextTuition,
            PreviousFeeConcession = request.UpdateTuitionFee ? previousConcession : null,
            FeeConcession = nextConcession,
            Description = description
        };
    }

    public async Task<StudentTuitionFeeUpdateResultDto> UpdateStudentTuitionFeeAsync(
        int studentId,
        StudentTuitionFeeUpdateRequestDto request,
        int? userId = null,
        CancellationToken cancellationToken = default)
    {
        if (request.TuitionFee < 0)
            throw new ArgumentException("Tuition fee cannot be negative.");

        var student = await _context.Students
            .FirstOrDefaultAsync(x => x.Reg_Id == studentId, cancellationToken)
            ?? throw new KeyNotFoundException("Student not found.");

        var className = await _context.Sections
            .AsNoTracking()
            .Where(x => x.ID == student.ClassCompositeID)
            .Select(x => x.ClassName)
            .FirstOrDefaultAsync(cancellationToken);

        var classFee = student.Fee ?? 0;
        var previousTuition = student.TutionFee ?? 0m;
        var previousConcession = student.FeeConcession ?? Math.Max(0m, classFee - previousTuition);
        var nextTuition = request.TuitionFee;
        var nextConcession = Math.Max(0m, classFee - nextTuition);
        var description = string.IsNullOrWhiteSpace(request.Description)
            ? null
            : request.Description.Trim();

        if (previousTuition == nextTuition && previousConcession == nextConcession)
            throw new ArgumentException("Tuition fee is already set to this amount.");

        var before = new Dictionary<string, string?>(StringComparer.Ordinal)
        {
            ["tuitionFee"] = FormatDecimal(previousTuition),
            ["feeConcession"] = FormatDecimal(previousConcession),
            ["classFee"] = FormatDecimal(classFee)
        };

        student.TutionFee = nextTuition;
        student.FeeConcession = nextConcession;

        var after = new Dictionary<string, string?>(StringComparer.Ordinal)
        {
            ["tuitionFee"] = FormatDecimal(nextTuition),
            ["feeConcession"] = FormatDecimal(nextConcession),
            ["classFee"] = FormatDecimal(classFee)
        };

        await _activityLogService.WriteAsync(
            ActivityLogTypes.StudentFeeUpdate,
            ActivityLogEntityTypes.Student,
            student.Reg_Id,
            student.FullName,
            userId,
            new
            {
                source = "fee-update",
                description,
                changes = DiffSnapshots(before, after),
                before = new
                {
                    tuitionFee = previousTuition,
                    feeConcession = previousConcession,
                    classFee
                },
                after = new
                {
                    tuitionFee = nextTuition,
                    feeConcession = nextConcession,
                    classFee
                }
            },
            cancellationToken);

        await _context.SaveChangesAsync(cancellationToken);

        return new StudentTuitionFeeUpdateResultDto
        {
            RegId = student.Reg_Id,
            FullName = student.FullName ?? string.Empty,
            ClassName = className,
            ClassFee = classFee,
            PreviousTuitionFee = previousTuition,
            TuitionFee = nextTuition,
            PreviousFeeConcession = previousConcession,
            FeeConcession = nextConcession,
            Description = description
        };
    }

    public async Task<StudentActivationResultDto> ActivateStudentAsync(
        int studentId,
        StudentActivationRequestDto request,
        int? userId = null,
        CancellationToken cancellationToken = default)
    {
        var description = (request.Description ?? string.Empty).Trim();
        if (description.Length < 3)
            throw new ArgumentException("Please enter a short reason.");

        var student = await _context.Students
            .FirstOrDefaultAsync(x => x.Reg_Id == studentId, cancellationToken)
            ?? throw new KeyNotFoundException("Student not found.");

        if (student.IsActive == true)
            throw new ArgumentException("Student is already active.");

        var before = new Dictionary<string, string?>(StringComparer.Ordinal)
        {
            ["isActive"] = FormatBool(student.IsActive == true),
            ["leaveDate"] = FormatDate(student.Leave_Date)
        };

        student.IsActive = true;
        student.Leave_Date = null;

        var after = new Dictionary<string, string?>(StringComparer.Ordinal)
        {
            ["isActive"] = FormatBool(true),
            ["leaveDate"] = null
        };

        await _activityLogService.WriteAsync(
            ActivityLogTypes.StudentActivate,
            ActivityLogEntityTypes.Student,
            student.Reg_Id,
            student.FullName,
            userId,
            new
            {
                source = "activate",
                description,
                changes = DiffSnapshots(before, after)
            },
            cancellationToken);

        await _context.SaveChangesAsync(cancellationToken);

        return new StudentActivationResultDto
        {
            RegId = student.Reg_Id,
            FullName = student.FullName ?? string.Empty,
            IsActive = true,
            LeaveDate = null,
            Description = description
        };
    }

    public async Task<StudentActivationResultDto> DeactivateStudentAsync(
        int studentId,
        StudentActivationRequestDto request,
        int? userId = null,
        CancellationToken cancellationToken = default)
    {
        var description = (request.Description ?? string.Empty).Trim();
        if (description.Length < 3)
            throw new ArgumentException("Please enter a short reason.");

        var student = await _context.Students
            .FirstOrDefaultAsync(x => x.Reg_Id == studentId, cancellationToken)
            ?? throw new KeyNotFoundException("Student not found.");

        if (student.IsActive == false)
            throw new ArgumentException("Student is already inactive.");

        var before = new Dictionary<string, string?>(StringComparer.Ordinal)
        {
            ["isActive"] = FormatBool(student.IsActive == true),
            ["leaveDate"] = FormatDate(student.Leave_Date)
        };

        var leaveDate = PakistanTime.Today.ToDateTime(TimeOnly.MinValue);

        student.IsActive = false;
        student.Leave_Date = leaveDate;

        var after = new Dictionary<string, string?>(StringComparer.Ordinal)
        {
            ["isActive"] = FormatBool(false),
            ["leaveDate"] = FormatDate(leaveDate)
        };

        await _activityLogService.WriteAsync(
            ActivityLogTypes.StudentDeactivate,
            ActivityLogEntityTypes.Student,
            student.Reg_Id,
            student.FullName,
            userId,
            new
            {
                source = "deactivate",
                description,
                changes = DiffSnapshots(before, after)
            },
            cancellationToken);

        await _context.SaveChangesAsync(cancellationToken);

        return new StudentActivationResultDto
        {
            RegId = student.Reg_Id,
            FullName = student.FullName ?? string.Empty,
            IsActive = false,
            LeaveDate = leaveDate,
            Description = description
        };
    }

    private static Dictionary<string, string?> SnapshotStudentProfile(Student student, StudentFamilyDetail? family)
    {
        return new Dictionary<string, string?>(StringComparer.Ordinal)
        {
            ["fullName"] = student.FullName,
            ["nameInUrdu"] = student.NameInUrdu,
            ["homeAddress"] = student.Home_Address,
            ["localityId"] = FormatInt(student.LocalityID),
            ["caste"] = student.Caste,
            ["gender"] = student.Gender,
            ["isOrphan"] = FormatBool(student.isOrphan),
            ["isHafiz"] = FormatBool(student.isHafiz),
            ["isCreditStudent"] = FormatBool(student.IsCreditStudent),
            ["religion"] = student.Religion,
            ["dateOfBirth"] = FormatDate(student.Date_of_Brith),
            ["bFormNum"] = student.B_FormNum,
            ["subjectGroupId"] = FormatInt(student.SubjectGroupID),
            ["medium"] = student.Medium,
            ["prevSchoolName"] = student.PrevSchoolName,
            ["prevSchoolClass"] = student.PrevSchoolClass,
            ["specialNotes"] = student.SpecialNotes,
            ["homePhone"] = student.Home_Phone,
            ["smsContact"] = student.SMS_Contact,
            ["regDate"] = FormatDate(student.RegDate),
            ["fatherName"] = family?.FatherName,
            ["fatherCnic"] = family?.FatherCNIC,
            ["fatherOccupationId"] = FormatInt(family?.FatherOccupationID),
            ["fatherQualificationId"] = FormatInt(family?.FatherQualificationID),
            ["fatherMobileNo"] = family?.FatherMobileNo,
            ["motherName"] = family?.MotherName,
            ["motherCnic"] = family?.MotherCNIC,
            ["motherPhoneNo"] = family?.MotherPhoneNo,
            ["motherQualificationId"] = FormatInt(family?.MotherQualificationID),
            ["motherOccupationId"] = FormatInt(family?.MotherOccupationID),
            ["familyHomePhone"] = family?.HomePhone,
            ["familyHomeAddress"] = family?.HomeAddress
        };
    }

    private static Dictionary<string, string?> SnapshotBulkEdit(
        Student student,
        StudentFamilyDetail? family,
        string? className)
    {
        return new Dictionary<string, string?>(StringComparer.Ordinal)
        {
            ["fullName"] = student.FullName,
            ["classCompositeId"] = FormatInt(student.ClassCompositeID),
            ["className"] = className,
            ["classFee"] = FormatDecimal(student.Fee),
            ["tuitionFee"] = FormatDecimal(student.TutionFee),
            ["feeConcession"] = FormatDecimal(student.FeeConcession),
            ["smsContact"] = student.SMS_Contact,
            ["homeAddress"] = student.Home_Address,
            ["fatherName"] = family?.FatherName,
            ["fatherMobileNo"] = family?.FatherMobileNo,
            ["familyHomeAddress"] = family?.HomeAddress
        };
    }

    private static List<ActivityLogChangeDto> DiffSnapshots(
        Dictionary<string, string?> before,
        Dictionary<string, string?> after)
    {
        var changes = new List<ActivityLogChangeDto>();
        foreach (var key in before.Keys)
        {
            var oldVal = NormalizeSnapshotValue(before.GetValueOrDefault(key));
            var newVal = NormalizeSnapshotValue(after.GetValueOrDefault(key));
            if (string.Equals(oldVal, newVal, StringComparison.Ordinal))
                continue;

            changes.Add(new ActivityLogChangeDto
            {
                Field = key,
                Old = oldVal,
                New = newVal
            });
        }

        return changes;
    }

    private static string? NormalizeSnapshotValue(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return null;
        return value.Trim();
    }

    private static string? FormatInt(int? value) => value?.ToString(CultureInfo.InvariantCulture);

    private static string? FormatBool(bool? value) => value switch
    {
        true => "true",
        false => "false",
        _ => null
    };

    private static string? FormatDate(DateTime? value) =>
        value?.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);

    private static string? FormatDecimal(decimal? value) =>
        value?.ToString(CultureInfo.InvariantCulture);

    private async Task UpsertGeneratedFundAsync(
        int studentId,
        int classCompositeId,
        int branchId,
        int fundTypeId,
        int month,
        int year,
        decimal amount,
        string typeName,
        DateTime now,
        CancellationToken cancellationToken)
    {
        if (amount <= 0)
            return;

        var existing = await _context.FeeAndFundCollections
            .FirstOrDefaultAsync(
                x => x.StudentID == studentId
                     && x.FundTypeID == fundTypeId
                     && x.Month == month
                     && x.Year == year
                     && x.Payment > 0,
                cancellationToken);

        if (existing is null)
        {
            _context.FeeAndFundCollections.Add(new FeeAndFundCollection
            {
                StudentID = studentId,
                ClassID = classCompositeId,
                FundTypeID = fundTypeId,
                Type = typeName,
                Month = month,
                Year = year,
                Date = now.Date,
                Payment = amount,
                Recieved = 0,
                Discount = 0,
                VoidAmount = 0,
                BranchID = branchId,
                SessionYear = year.ToString(CultureInfo.InvariantCulture)
            });
        }
        else
        {
            existing.Payment = amount;
            existing.Type = typeName;
            existing.ClassID = classCompositeId;
        }
    }

    private static FamilySearchResultDto MapFamily(
        StudentFamilyDetail f,
        IReadOnlyDictionary<int, int> siblingCounts,
        IReadOnlyDictionary<int, string?> addresses)
    {
        var familyId = f.FamilyID ?? 0;
        addresses.TryGetValue(familyId, out var address);
        siblingCounts.TryGetValue(familyId, out var siblings);

        return new FamilySearchResultDto
        {
            FamilyId = familyId,
            FatherName = f.FatherName,
            MotherName = f.MotherName,
            FatherCNIC = f.FatherCNIC,
            MotherCNIC = f.MotherCNIC,
            FatherMobileNo = f.FatherMobileNo,
            MotherPhoneNo = f.MotherPhoneNo,
            FatherOccupationID = f.FatherOccupationID,
            MotherOccupationID = f.MotherOccupationID,
            FatherQualificationID = f.FatherQualificationID,
            MotherQualificationID = f.MotherQualificationID,
            HomePhone = f.HomePhone,
            HomeAddress = !string.IsNullOrWhiteSpace(f.HomeAddress) ? f.HomeAddress : address,
            SiblingCount = siblings
        };
    }

    private static string? Clean(string? value)
    {
        var trimmed = value?.Trim();
        return string.IsNullOrWhiteSpace(trimmed) ? null : trimmed;
    }

    private async Task<bool> GetShowCreditStudentAsync(CancellationToken cancellationToken = default)
    {
        var row = await _context.CampusProfiles
            .AsNoTracking()
            .OrderBy(x => x.ID)
            .FirstOrDefaultAsync(cancellationToken);
        return row?.ShowCreditStudent == true;
    }

    private static string GenerateRandomPassword(int length)
    {
        const string chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
        var buffer = new char[length];
        for (var i = 0; i < length; i++)
            buffer[i] = chars[Random.Shared.Next(chars.Length)];
        return new string(buffer);
    }
}
