using System.Globalization;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using School.Application.Common;
using School.Application.DTOs;
using School.Application.Interfaces;
using School.Infrastructure.Data;
using School.Infrastructure.Entities;

namespace School.Application.Services
{
    public class DashboardService : IDashboardService
    {
        private readonly AppDbContext _context;
        private readonly IConfiguration _configuration;

        public DashboardService(AppDbContext context, IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
        }

        public async Task<DashboardDto> GetDashboardAsync(int studentId)
        {
            var dashboard = new DashboardDto();

            // -------------------------
            // 1️⃣ Student Info
            // -------------------------
            var student = await _context.Students
                .Where(x => x.Reg_Id == studentId)
                .Select(x => new
                {
                    x.FullName,
                    x.Reg_Id,
                    ClassName = x.Section != null
                        ? x.Section.SectionName
                        : null
                })
                .FirstOrDefaultAsync();

            if (student != null)
            {
                dashboard.Student = new StudentInfoDto
                {
                    Name = student.FullName,
                    AdmissionNo = student.Reg_Id.ToString(),
                    ClassName = student.ClassName
                };
            }

            // -------------------------
            // 2️⃣ Attendance Summary (Current Month)
            // -------------------------
            var now = DateTime.Now;

            var attendanceQuery = _context.Attendances
                .Where(x =>
                    x.StudentID == studentId &&
                    x.Month == now.Month &&
                    x.Year == now.Year);

            var totalDays = await attendanceQuery.CountAsync();
            var presentDays = await attendanceQuery
                .CountAsync(x => x.IsPresent == true);

            decimal percentage = 0;
            if (totalDays > 0)
                percentage = Math.Round((decimal)presentDays / totalDays * 100, 2);

            dashboard.Attendance = new AttendanceSummaryDto
            {
                TotalDays = totalDays,
                PresentDays = presentDays,
                Percentage = percentage
            };

            // -------------------------
            // 3️⃣ Fee Balance (Running Calculation)
            // -------------------------
            var ledgerEntries = await _context.FeeAndFundCollections
                .Where(x => x.StudentID == studentId)
                .Select(x => new
                {
                    Payment = x.Payment ?? 0,
                    Credit = (x.Recieved ?? 0) + (x.Discount ?? 0)
                })
                .ToListAsync();

            decimal balance = 0;
            foreach (var e in ledgerEntries)
            {
                balance += e.Payment;
                balance -= e.Credit;
            }

            dashboard.Fee = new FeeSummaryDto
            {
                Balance = balance
            };

            // -------------------------
            // 4️⃣ Announcements (Home Only)
            // -------------------------
            dashboard.Announcements = await _context.NewsAndEvents
                .Where(x => x.IsActive == true && x.ShowOnHome == true)
                .OrderByDescending(x => x.Date)
                .Take(3)
                .Select(x => new AnnouncementDto
                {
                    Id = x.ID,
                    Title = x.Title,
                    Description = x.Description,
                    Date = x.Date
                })
                .ToListAsync();

            return dashboard;
        }

        public async Task<AllCampusDashboardDto> GetAllCampusesDashboardAsync()
        {
            var today = DateTime.Today;
            var details = new List<CampusDashboardDetailDto>();

            foreach (var campusConfig in GetCampusConnections())
            {
                await using var campusContext = CreateCampusContext(campusConfig.ConnectionString);
                details.Add(await BuildCampusDashboardAsync(campusContext, campusConfig.Campus, campusConfig.Campus));
            }

            var result = new AllCampusDashboardDto
            {
                Date = today,
                GeneratedAt = DateTime.Now,
                Campuses = details.Select(x => new DashboardCampusComparisonDto
                {
                    Campus = x.Campus,
                    CampusLabel = x.CampusLabel,
                    TotalStudents = x.TotalStudents,
                    ActiveStudentCount = x.ActiveStudentCount,
                    InactiveStudentCount = x.InactiveStudentCount,
                    NewAdmissionsToday = x.NewAdmissionsToday,
                    NewAdmissionsLast30Days = x.NewAdmissionsLast30Days,
                    FeeCollectionToday = x.FeeCollectionToday,
                    FeeCollectionLast30Days = x.FeeCollectionLast30Days,
                    TotalGenerated = x.TotalGenerated,
                    TotalReceived = x.TotalReceived,
                    TotalDiscount = x.TotalDiscount,
                    TotalReceivable = x.TotalReceivable,
                    TuitionGenerated = x.TuitionGenerated,
                    TuitionReceived = x.TuitionReceived,
                    TuitionDiscount = x.TuitionDiscount,
                    TuitionReceivable = x.TuitionReceivable,
                    AverageTuitionFee = x.AverageTuitionFee,
                    FundsGenerated = x.FundsGenerated,
                    FundsReceived = x.FundsReceived,
                    FundsDiscount = x.FundsDiscount,
                    FundsReceivable = x.FundsReceivable,
                    FeeDefaulterCount = x.FeeDefaulterCount,
                    TodayExpense = x.TodayExpense,
                    ExpenseLast30Days = x.ExpenseLast30Days
                }).ToList()
            };

            result.TotalStudentCount = result.Campuses.Sum(x => x.TotalStudents);
            result.TotalActiveStudentCount = result.Campuses.Sum(x => x.ActiveStudentCount);
            result.TotalInactiveStudentCount = result.Campuses.Sum(x => x.InactiveStudentCount);
            result.TotalNewAdmissionsToday = result.Campuses.Sum(x => x.NewAdmissionsToday);
            result.TotalNewAdmissionsLast30Days = result.Campuses.Sum(x => x.NewAdmissionsLast30Days);
            result.TotalFeeCollectionToday = result.Campuses.Sum(x => x.FeeCollectionToday);
            result.TotalFeeCollectionLast30Days = result.Campuses.Sum(x => x.FeeCollectionLast30Days);
            result.TotalGenerated = result.Campuses.Sum(x => x.TotalGenerated);
            result.TotalReceived = result.Campuses.Sum(x => x.TotalReceived);
            result.TotalDiscount = result.Campuses.Sum(x => x.TotalDiscount);
            result.TotalReceivable = result.Campuses.Sum(x => x.TotalReceivable);
            result.TotalTuitionGenerated = result.Campuses.Sum(x => x.TuitionGenerated);
            result.TotalTuitionReceived = result.Campuses.Sum(x => x.TuitionReceived);
            result.TotalTuitionDiscount = result.Campuses.Sum(x => x.TuitionDiscount);
            result.TotalTuitionReceivable = result.Campuses.Sum(x => x.TuitionReceivable);
            result.TotalFundsGenerated = result.Campuses.Sum(x => x.FundsGenerated);
            result.TotalFundsReceived = result.Campuses.Sum(x => x.FundsReceived);
            result.TotalFundsDiscount = result.Campuses.Sum(x => x.FundsDiscount);
            result.TotalFundsReceivable = result.Campuses.Sum(x => x.FundsReceivable);
            result.TotalFeeDefaulterCount = result.Campuses.Sum(x => x.FeeDefaulterCount);
            result.TotalTodayExpense = result.Campuses.Sum(x => x.TodayExpense);
            result.TotalExpenseLast30Days = result.Campuses.Sum(x => x.ExpenseLast30Days);

            result.StudentGenderDistribution = BuildCountDistribution(
                details.SelectMany(x => x.StudentGenderDistribution)
                    .GroupBy(x => x.Key)
                    .Select(g => new CountBucket(g.Key, g.Max(x => x.Label) ?? g.Key, g.Sum(x => x.Count)))
                    .ToList());

            result.FeeCollectionTrendLast30Days = details
                .SelectMany(x => x.FeeCollectionTrendLast30Days)
                .GroupBy(x => x.Date)
                .OrderBy(g => g.Key)
                .Select(g => new DashboardMoneyPointDto
                {
                    Date = g.Key,
                    Label = g.Key?.ToString("dd MMM") ?? string.Empty,
                    Amount = g.Sum(x => x.Amount)
                })
                .ToList();

            result.AdmissionsTrendLast30Days = details
                .SelectMany(x => x.NewAdmissionsTrendLast30Days)
                .GroupBy(x => x.Date)
                .OrderBy(g => g.Key)
                .Select(g => new DashboardCountPointDto
                {
                    Date = g.Key,
                    Label = g.Key?.ToString("dd MMM") ?? string.Empty,
                    Count = g.Sum(x => x.Count)
                })
                .ToList();

            result.ExpenseHeadsLast30Days = BuildExpenseHeadDistribution(
                details.SelectMany(x => x.ExpenseHeadsLast30Days)
                    .GroupBy(x => new { x.HeadCode, x.HeadName })
                    .Select(g => new ExpenseBucket(g.Key.HeadCode, g.Key.HeadName, g.Sum(x => x.Amount)))
                    .ToList());

            result.FeeCollectionByCampusLast30Days = BuildAmountDistribution(
                result.Campuses.Select(x => new AmountBucket(x.Campus, x.CampusLabel, x.FeeCollectionLast30Days)).ToList());

            result.ExpenseByCampusLast30Days = BuildAmountDistribution(
                result.Campuses.Select(x => new AmountBucket(x.Campus, x.CampusLabel, x.ExpenseLast30Days)).ToList());

            return result;
        }

        public async Task<CampusFeeCollectionByDateDto> GetAllCampusesFeeCollectionByDateAsync(DateTime date)
        {
            var selectedDate = date.Date;
            var rows = new List<AmountBucket>();

            foreach (var campusConfig in GetCampusConnections())
            {
                await using var campusContext = CreateCampusContext(campusConfig.ConnectionString);
                var amount = await campusContext.FeeAndFundCollections
                    .Where(x => x.Student != null &&
                                x.Student.IsActive == true &&
                                x.Date.HasValue &&
                                x.Date.Value.Date == selectedDate)
                    .SumAsync(x => x.Recieved ?? 0);

                rows.Add(new AmountBucket(campusConfig.Campus, campusConfig.Campus, amount));
            }

            return new CampusFeeCollectionByDateDto
            {
                Date = selectedDate,
                Campuses = BuildAmountDistribution(rows)
            };
        }

        public async Task<CampusExpenseByIntervalDto> GetAllCampusesExpenseByIntervalAsync(int days)
        {
            var today = DateTime.Today;
            var from = days <= 1 ? today : today.AddDays(-(days - 1));
            var rows = new List<AmountBucket>();

            foreach (var campusConfig in GetCampusConnections())
            {
                await using var campusContext = CreateCampusContext(campusConfig.ConnectionString);
                var amount = await campusContext.TransactionDetails
                    .Where(x => x.Date.HasValue &&
                                x.Date.Value.Date >= from &&
                                x.Date.Value.Date <= today)
                    .SumAsync(x => x.Debit ?? 0);

                rows.Add(new AmountBucket(campusConfig.Campus, campusConfig.Campus, amount));
            }

            return new CampusExpenseByIntervalDto
            {
                Days = days,
                From = from,
                To = today,
                Campuses = BuildAmountDistribution(rows)
            };
        }

        public async Task<CampusFeeBalanceByMonthDto> GetAllCampusesFeeBalanceByMonthAsync(int month, int year)
        {
            var rows = new List<AmountBucket>();

            foreach (var campusConfig in GetCampusConnections())
            {
                await using var campusContext = CreateCampusContext(campusConfig.ConnectionString);
                var amount = await campusContext.FeeAndFundCollections
                    .Where(x => x.Student != null &&
                                x.Student.IsActive == true &&
                                x.FundTypeID == 1 &&
                                x.Month == month &&
                                x.Year == year)
                    .SumAsync(x => (x.Payment ?? 0) - ((x.Recieved ?? 0) + (x.Discount ?? 0)));

                if (amount < 0) amount = 0;
                rows.Add(new AmountBucket(campusConfig.Campus, campusConfig.Campus, amount));
            }

            return new CampusFeeBalanceByMonthDto
            {
                Month = month,
                Year = year,
                Campuses = BuildAmountDistribution(rows)
            };
        }

        public async Task<CampusAdmissionsByMonthDto> GetAllCampusesAdmissionsByMonthAsync(int month, int year)
        {
            var rows = new List<CampusAdmissionsByMonthItemDto>();

            foreach (var campusConfig in GetCampusConnections())
            {
                await using var campusContext = CreateCampusContext(campusConfig.ConnectionString);

                var newAdmissions = await campusContext.Students
                    .CountAsync(x => x.RegDate.HasValue &&
                                     x.RegDate.Value.Month == month &&
                                     x.RegDate.Value.Year == year);

                var leftStudents = await campusContext.Students
                    .CountAsync(x => x.Leave_Date.HasValue &&
                                     x.Leave_Date.Value.Month == month &&
                                     x.Leave_Date.Value.Year == year);

                rows.Add(new CampusAdmissionsByMonthItemDto
                {
                    Campus = campusConfig.Campus,
                    CampusLabel = campusConfig.Campus,
                    NewAdmissions = newAdmissions,
                    LeftStudents = leftStudents
                });
            }

            return new CampusAdmissionsByMonthDto
            {
                Month = month,
                Year = year,
                Campuses = rows
            };
        }

        public async Task<CampusLeftStudentsByMonthDto> GetCampusLeftStudentsByMonthAsync(string campus, int month, int year)
        {
            var campusConfig = GetCampusConnections()
                .FirstOrDefault(x => string.Equals(x.Campus, campus, StringComparison.OrdinalIgnoreCase))
                ?? throw new KeyNotFoundException($"Campus '{campus}' is not configured.");

            await using var campusContext = CreateCampusContext(campusConfig.ConnectionString);

            var students = await campusContext.Students
                .AsNoTracking()
                .Where(x => x.Leave_Date.HasValue &&
                            x.Leave_Date.Value.Month == month &&
                            x.Leave_Date.Value.Year == year)
                .OrderByDescending(x => x.Leave_Date)
                .ThenBy(x => x.FullName)
                .Select(x => new
                {
                    x.Reg_Id,
                    x.FullName,
                    x.RegDate,
                    x.Leave_Date
                })
                .ToListAsync();

            var regIds = students.Select(x => x.Reg_Id).ToList();
            var deactivateLogs = regIds.Count == 0
                ? []
                : await campusContext.ActivityLogs
                    .AsNoTracking()
                    .Where(x => x.EntityType == ActivityLogEntityTypes.Student &&
                                x.ActivityType == ActivityLogTypes.StudentDeactivate &&
                                x.EntityId != null &&
                                regIds.Contains(x.EntityId.Value))
                    .Select(x => new
                    {
                        x.EntityId,
                        x.DetailsJson,
                        x.OccurredAtPkt
                    })
                    .ToListAsync();

            var outstandingByStudent = regIds.Count == 0
                ? new Dictionary<int, decimal>()
                : await campusContext.FeeAndFundCollections
                    .AsNoTracking()
                    .Where(x => x.StudentID.HasValue && regIds.Contains(x.StudentID.Value))
                    .GroupBy(x => x.StudentID!.Value)
                    .Select(g => new
                    {
                        StudentId = g.Key,
                        Outstanding = g.Sum(x => (x.Payment ?? 0) - ((x.Recieved ?? 0) + (x.Discount ?? 0)))
                    })
                    .ToDictionaryAsync(x => x.StudentId, x => Math.Max(0m, x.Outstanding));

            var items = students.Select(student =>
            {
                var leaveDate = student.Leave_Date?.Date;
                var reason = deactivateLogs
                    .Where(x => x.EntityId == student.Reg_Id)
                    .OrderBy(x => leaveDate.HasValue
                        ? Math.Abs((x.OccurredAtPkt.Date - leaveDate.Value).TotalDays)
                        : 0)
                    .ThenByDescending(x => x.OccurredAtPkt)
                    .Select(x => ExtractActivityLogDescription(x.DetailsJson))
                    .FirstOrDefault(x => !string.IsNullOrWhiteSpace(x));

                outstandingByStudent.TryGetValue(student.Reg_Id, out var outstandingBalance);

                return new CampusLeftStudentItemDto
                {
                    RegId = student.Reg_Id,
                    FullName = student.FullName?.Trim() ?? $"Student {student.Reg_Id}",
                    RegDate = student.RegDate,
                    LeaveDate = student.Leave_Date,
                    StudyDurationLabel = FormatStudyDuration(student.RegDate, student.Leave_Date),
                    StudyDurationDays = GetStudyDurationDays(student.RegDate, student.Leave_Date),
                    OutstandingBalance = outstandingBalance,
                    Reason = reason
                };
            }).ToList();

            return new CampusLeftStudentsByMonthDto
            {
                Campus = campusConfig.Campus,
                CampusLabel = campusConfig.Campus,
                Month = month,
                Year = year,
                TotalOutstandingBalance = items.Sum(x => x.OutstandingBalance),
                Items = items
            };
        }

        public async Task<CampusExpenseDetailDto> GetCampusExpenseDetailsAsync(string campus, int days)
        {
            var campusConfig = GetCampusConnections()
                .FirstOrDefault(x => string.Equals(x.Campus, campus, StringComparison.OrdinalIgnoreCase));

            if (campusConfig is null)
            {
                throw new KeyNotFoundException($"Campus '{campus}' is not configured.");
            }

            var today = DateTime.Today;
            var fromDate = days <= 1 ? today : today.AddDays(-(days - 1));

            await using var campusContext = CreateCampusContext(campusConfig.ConnectionString);

            var rows = await (
                from transaction in campusContext.TransactionDetails
                where transaction.Date.HasValue &&
                      transaction.Date.Value.Date >= fromDate &&
                      transaction.Date.Value.Date <= today &&
                      (transaction.Debit ?? 0) > 0
                join account in campusContext.Accounts
                    on transaction.AccountID equals account.AccountID into accountJoin
                from account in accountJoin.DefaultIfEmpty()
                orderby transaction.Date descending, transaction.ID descending
                select new CampusExpenseDetailItemDto
                {
                    Id = transaction.ID,
                    VoucherNumber = transaction.VoucherNumber ?? string.Empty,
                    VoucherType = transaction.VoucherType ?? string.Empty,
                    Date = transaction.Date,
                    Month = transaction.Month,
                    Year = transaction.Year,
                    MasterId = transaction.MasterID,
                    GroupId = transaction.GroupID ?? string.Empty,
                    SubGroupId = transaction.SubGroupID ?? string.Empty,
                    AccountId = transaction.AccountID ?? string.Empty,
                    AccountTitle = account != null && account.AccountTitle != null ? account.AccountTitle : string.Empty,
                    Narration = transaction.Narration ?? string.Empty,
                    Debit = transaction.Debit ?? 0,
                    Credit = transaction.Credit ?? 0,
                    SerialNo = transaction.SerialNo
                })
                .ToListAsync();

            return new CampusExpenseDetailDto
            {
                Campus = campusConfig.Campus,
                CampusLabel = campusConfig.Campus,
                Days = days,
                From = fromDate,
                To = today,
                TotalDebit = rows.Sum(x => x.Debit),
                TotalRecords = rows.Count,
                Items = rows
            };
        }

        public async Task<CampusDashboardDetailDto> GetCampusDashboardAsync(string campus)
        {
            var campusConfig = GetCampusConnections()
                .FirstOrDefault(x => string.Equals(x.Campus, campus, StringComparison.OrdinalIgnoreCase));

            if (campusConfig is null)
            {
                throw new KeyNotFoundException($"Campus '{campus}' is not configured.");
            }

            await using var campusContext = CreateCampusContext(campusConfig.ConnectionString);
            return await BuildCampusDashboardAsync(campusContext, campusConfig.Campus, campusConfig.Campus);
        }

        public async Task<CampusFeeBreakdownByMonthDto> GetCampusFeeBreakdownByMonthAsync(string campus, int month, int year)
        {
            var campusConfig = GetCampusConnections()
                .FirstOrDefault(x => string.Equals(x.Campus, campus, StringComparison.OrdinalIgnoreCase));

            if (campusConfig is null)
            {
                throw new KeyNotFoundException($"Campus '{campus}' is not configured.");
            }

            await using var campusContext = CreateCampusContext(campusConfig.ConnectionString);
            return new CampusFeeBreakdownByMonthDto
            {
                Campus = campusConfig.Campus,
                Month = month,
                Year = year,
                Breakdown = await BuildFeeBreakdownByMonthAsync(campusContext, month, year)
            };
        }

        public async Task<CampusAdmissionsVsLeftTrendDto> GetCampusAdmissionsVsLeftTrendAsync(string campus, int days)
        {
            var campusConfig = GetCampusConnections()
                .FirstOrDefault(x => string.Equals(x.Campus, campus, StringComparison.OrdinalIgnoreCase));

            if (campusConfig is null)
            {
                throw new KeyNotFoundException($"Campus '{campus}' is not configured.");
            }

            var today = DateTime.Today;
            var from = today.AddDays(-(days - 1));

            await using var campusContext = CreateCampusContext(campusConfig.ConnectionString);
            return new CampusAdmissionsVsLeftTrendDto
            {
                Campus = campusConfig.Campus,
                Days = days,
                From = from,
                To = today,
                Points = await BuildAdmissionsVsLeftTrendAsync(campusContext, from, today)
            };
        }

        private async Task<CampusDashboardDetailDto> BuildCampusDashboardAsync(AppDbContext campusContext, string campus, string campusLabel)
        {
            var today = PakistanTime.Today.ToDateTime(TimeOnly.MinValue);
            var yesterday = today.AddDays(-1);
            var last30From = today.AddDays(-29);
            var last7From = today.AddDays(-6);

            var totalStudents = await campusContext.Students.CountAsync();
            var activeStudents = await campusContext.Students.CountAsync(x => x.IsActive == true);
            var inactiveStudents = Math.Max(0, totalStudents - activeStudents);
            var activeTuitionFeeTotal = await campusContext.Students
                .Where(x => x.IsActive == true)
                .SumAsync(x => x.TutionFee ?? 0);
            var averageTuitionFee = activeStudents > 0
                ? Math.Round(activeTuitionFeeTotal / activeStudents, 2)
                : 0;
            var newAdmissionsToday = await campusContext.Students
                .CountAsync(x => x.IsActive == true && x.RegDate.HasValue && x.RegDate.Value.Date == today);
            var newAdmissionsLast30Days = await campusContext.Students
                .CountAsync(x => x.IsActive == true && x.RegDate.HasValue && x.RegDate.Value.Date >= last30From && x.RegDate.Value.Date <= today);

            var genderRows = await campusContext.Students
                .Where(x => x.IsActive == true)
                .GroupBy(x => x.Gender ?? string.Empty)
                .Select(g => new { Key = g.Key, Count = g.Count() })
                .ToListAsync();
            var genderBuckets = genderRows
                .Select(x => new CountBucket(x.Key, x.Key, x.Count))
                .ToList();

            var feeCollectionToday = await campusContext.FeeAndFundCollections
                .Where(x => x.Student != null && x.Student.IsActive == true && x.Date.HasValue && x.Date.Value.Date == today)
                .SumAsync(x => x.Recieved ?? 0);

            var feeCollectionYesterday = await campusContext.FeeAndFundCollections
                .Where(x => x.Student != null && x.Student.IsActive == true && x.Date.HasValue && x.Date.Value.Date == yesterday)
                .SumAsync(x => x.Recieved ?? 0);

            var feeCollectionLast30Days = await campusContext.FeeAndFundCollections
                .Where(x => x.Student != null && x.Student.IsActive == true && x.Date.HasValue && x.Date.Value.Date >= last30From && x.Date.Value.Date <= today)
                .SumAsync(x => x.Recieved ?? 0);

            var feeBalanceRows = await campusContext.FeeAndFundCollections
                .Where(x => x.StudentID.HasValue && x.Student != null && x.Student.IsActive == true)
                .GroupBy(x => new { x.StudentID, FundTypeId = x.FundTypeID ?? 0 })
                .Select(g => new
                {
                    StudentId = g.Key.StudentID,
                    FundTypeId = g.Key.FundTypeId,
                    Payment = g.Sum(x => x.Payment ?? 0),
                    Received = g.Sum(x => x.Recieved ?? 0),
                    Discount = g.Sum(x => x.Discount ?? 0)
                })
                .ToListAsync();

            var totalGenerated = feeBalanceRows.Sum(x => x.Payment);
            var totalReceived = feeBalanceRows.Sum(x => x.Received);
            var totalDiscount = feeBalanceRows.Sum(x => x.Discount);
            var totalReceivable = totalGenerated - totalReceived - totalDiscount;
            if (totalReceivable < 0) totalReceivable = 0;

            var tuitionRows = feeBalanceRows.Where(x => x.FundTypeId == 1).ToList();
            var fundsRows = feeBalanceRows.Where(x => x.FundTypeId > 1).ToList();
            var tuitionGenerated = tuitionRows.Sum(x => x.Payment);
            var tuitionReceived = tuitionRows.Sum(x => x.Received);
            var tuitionDiscount = tuitionRows.Sum(x => x.Discount);
            var tuitionReceivable = Math.Max(0, tuitionGenerated - tuitionReceived - tuitionDiscount);
            var fundsGenerated = fundsRows.Sum(x => x.Payment);
            var fundsReceived = fundsRows.Sum(x => x.Received);
            var fundsDiscount = fundsRows.Sum(x => x.Discount);
            var fundsReceivable = Math.Max(0, fundsGenerated - fundsReceived - fundsDiscount);

            var feeDefaulterCount = feeBalanceRows
                .GroupBy(x => x.StudentId)
                .Count(g => g.Sum(x => x.Payment - x.Received - x.Discount) > 0);

            var todayExpense = await campusContext.TransactionDetails
                .Where(x => x.Date.HasValue && x.Date.Value.Date == today)
                .SumAsync(x => x.Debit ?? 0);

            var expenseLast30Days = await campusContext.TransactionDetails
                .Where(x => x.Date.HasValue && x.Date.Value.Date >= last30From && x.Date.Value.Date <= today)
                .SumAsync(x => x.Debit ?? 0);

            var admissionsTrend = await BuildAdmissionsTrendAsync(campusContext, last30From, today);
            var admissionsVsLeftTrend = await BuildAdmissionsVsLeftTrendAsync(campusContext, last30From, today);
            var feeTrend = await BuildFeeTrendAsync(campusContext, last30From, today);
            var admissionsByClass = await BuildAdmissionsByClassAsync(campusContext, last30From, today);
            var classStrength = await BuildClassStrengthAsync(campusContext);
            var feeBreakdown = await BuildFeeBreakdownAsync(campusContext, last30From, today);
            var expenseHeads = await BuildExpenseHeadsAsync(campusContext, last30From, today);
            var expenseSubheads = await BuildExpenseSubheadsAsync(campusContext, last30From, today);

            var netChangeYesterday = await campusContext.Students
                .CountAsync(x => x.RegDate.HasValue && x.RegDate.Value.Date == yesterday)
                - await campusContext.Students
                .CountAsync(x => x.Leave_Date.HasValue && x.Leave_Date.Value.Date == yesterday);

            var feeSparkline = feeTrend
                .Where(x => x.Date.HasValue && x.Date.Value.Date >= last7From)
                .Select(x => x.Amount)
                .ToList();
            while (feeSparkline.Count < 7) feeSparkline.Insert(0, 0);

            var admissionSparkline = admissionsVsLeftTrend
                .Where(x => x.Date.HasValue && x.Date.Value.Date >= last7From)
                .Select(x => (decimal)Math.Max(0, x.NewAdmissions - x.LeftStudents))
                .ToList();
            while (admissionSparkline.Count < 7) admissionSparkline.Insert(0, 0);

            var attendanceOverview = await BuildAttendanceOverviewAsync(campusContext, today, activeStudents);
            var attendanceYesterday = await BuildAttendanceOverviewAsync(campusContext, yesterday, activeStudents);
            var attendanceSparkline = await BuildAttendanceRateSparklineAsync(campusContext, last7From, today, activeStudents);

            var feeActivityLast7 = await campusContext.FeeAndFundCollections
                .Where(x => x.Student != null && x.Student.IsActive == true && x.Date.HasValue && x.Date.Value.Date >= last7From && x.Date.Value.Date <= today)
                .GroupBy(_ => 1)
                .Select(g => new
                {
                    Payment = g.Sum(x => x.Payment ?? 0),
                    Received = g.Sum(x => x.Recieved ?? 0),
                    Discount = g.Sum(x => x.Discount ?? 0)
                })
                .FirstOrDefaultAsync();
            var netReceivableIncreaseLast7 =
                (feeActivityLast7?.Payment ?? 0) - (feeActivityLast7?.Received ?? 0) - (feeActivityLast7?.Discount ?? 0);
            var receivableLastWeekApprox = Math.Max(0, totalReceivable - netReceivableIncreaseLast7);

            var receivableSparkline = new List<decimal>();
            var running = totalReceivable;
            for (var i = 6; i >= 0; i--)
            {
                receivableSparkline.Insert(0, Math.Max(0, running));
                var day = today.AddDays(-i);
                var dayPoint = feeTrend.FirstOrDefault(x => x.Date.HasValue && x.Date.Value.Date == day);
                // Approximate backward: reverse daily received as a soft sparkline shape
                if (dayPoint != null) running += dayPoint.Amount * 0.15m;
            }

            var birthdays = await BuildBirthdaysTodayAsync(campusContext, today);
            var lateTeachers = await BuildLateCheckInsAsync(campusContext, today);
            var recentAdmissions = await BuildRecentAdmissionsAsync(campusContext, 8);
            var topDefaulters = await BuildTopFeeDefaultersAsync(campusContext, 8);
            var alerts = BuildDashboardAlerts(attendanceOverview, lateTeachers.Count, feeDefaulterCount, totalReceivable);

            return new CampusDashboardDetailDto
            {
                Campus = campus,
                CampusLabel = campusLabel,
                GeneratedAt = PakistanTime.Now,
                Today = today,
                TotalStudents = activeStudents,
                ActiveStudentCount = activeStudents,
                InactiveStudentCount = inactiveStudents,
                NewAdmissionsToday = newAdmissionsToday,
                NewAdmissionsLast30Days = newAdmissionsLast30Days,
                FeeCollectionToday = feeCollectionToday,
                FeeCollectionLast30Days = feeCollectionLast30Days,
                TotalGenerated = totalGenerated,
                TotalReceived = totalReceived,
                TotalDiscount = totalDiscount,
                TotalReceivable = totalReceivable,
                TuitionGenerated = tuitionGenerated,
                TuitionReceived = tuitionReceived,
                TuitionDiscount = tuitionDiscount,
                TuitionReceivable = tuitionReceivable,
                AverageTuitionFee = averageTuitionFee,
                FundsGenerated = fundsGenerated,
                FundsReceived = fundsReceived,
                FundsDiscount = fundsDiscount,
                FundsReceivable = fundsReceivable,
                FeeDefaulterCount = feeDefaulterCount,
                TodayExpense = todayExpense,
                ExpenseLast30Days = expenseLast30Days,
                StudentGenderDistribution = BuildCountDistribution(NormalizeGenderBuckets(genderBuckets)),
                NewAdmissionsTrendLast30Days = admissionsTrend,
                AdmissionsVsLeftTrendLast30Days = admissionsVsLeftTrend,
                AdmissionsByClassLast30Days = admissionsByClass,
                ClassStrength = classStrength,
                FeeCollectionTrendLast30Days = feeTrend,
                FeeCollectionBreakdownLast30Days = feeBreakdown,
                ExpenseHeadsLast30Days = expenseHeads,
                ExpenseSubheadsLast30Days = expenseSubheads,
                ActiveStudentsTrend = BuildKpiTrend(
                    activeStudents,
                    activeStudents - netChangeYesterday,
                    "from yesterday",
                    admissionSparkline),
                FeeCollectionTodayTrend = BuildKpiTrend(
                    feeCollectionToday,
                    feeCollectionYesterday,
                    "from yesterday",
                    feeSparkline),
                OutstandingReceivableTrend = BuildKpiTrend(
                    totalReceivable,
                    receivableLastWeekApprox,
                    "from last week",
                    receivableSparkline),
                AttendanceTodayTrend = BuildKpiTrend(
                    attendanceOverview.PresentPercent,
                    attendanceYesterday.PresentPercent,
                    "from yesterday",
                    attendanceSparkline),
                AttendanceOverview = attendanceOverview,
                BirthdaysToday = birthdays,
                TeachersCheckedInLate = lateTeachers,
                Alerts = alerts,
                RecentAdmissions = recentAdmissions,
                TopFeeDefaulters = topDefaulters
            };
        }

        private static DashboardKpiTrendDto BuildKpiTrend(
            decimal value,
            decimal previousValue,
            string comparisonLabel,
            List<decimal> sparkline)
        {
            var changeAbsolute = value - previousValue;
            var changePercent = previousValue == 0
                ? (value == 0 ? 0 : 100)
                : Math.Round(changeAbsolute / Math.Abs(previousValue) * 100, 1);

            return new DashboardKpiTrendDto
            {
                Value = value,
                PreviousValue = previousValue,
                ChangeAbsolute = changeAbsolute,
                ChangePercent = changePercent,
                IsUp = changeAbsolute >= 0,
                ComparisonLabel = comparisonLabel,
                Sparkline = sparkline.Count > 0 ? sparkline : [value]
            };
        }

        private static async Task<DashboardAttendanceOverviewDto> BuildAttendanceOverviewAsync(
            AppDbContext context,
            DateTime date,
            int activeStudents)
        {
            var dayRows = context.Attendances
                .AsNoTracking()
                .Where(x => x.Date.HasValue && x.Date.Value.Date == date);

            var presentCount = await dayRows.CountAsync(x =>
                x.Status != null && (x.Status.ToUpper() == "P" || x.Status.ToUpper() == "LT"));
            var absentCount = await dayRows.CountAsync(x => x.Status != null && x.Status.ToUpper() == "A");
            var onLeaveCount = await dayRows.CountAsync(x =>
                x.Status != null && (x.Status.ToUpper() == "H" || x.Status.ToUpper() == "LV"));
            var markedCount = presentCount + absentCount + onLeaveCount;
            var denominator = markedCount > 0 ? markedCount : Math.Max(activeStudents, 1);

            return new DashboardAttendanceOverviewDto
            {
                TotalStudents = activeStudents,
                PresentCount = presentCount,
                AbsentCount = absentCount,
                OnLeaveCount = onLeaveCount,
                MarkedCount = markedCount,
                PresentPercent = Math.Round((decimal)presentCount / denominator * 100, 1),
                AbsentPercent = Math.Round((decimal)absentCount / denominator * 100, 1),
                OnLeavePercent = Math.Round((decimal)onLeaveCount / denominator * 100, 1)
            };
        }

        private static async Task<List<decimal>> BuildAttendanceRateSparklineAsync(
            AppDbContext context,
            DateTime from,
            DateTime to,
            int activeStudents)
        {
            var rows = await context.Attendances
                .AsNoTracking()
                .Where(x => x.Date.HasValue && x.Date.Value.Date >= from && x.Date.Value.Date <= to)
                .GroupBy(x => x.Date!.Value.Date)
                .Select(g => new
                {
                    Date = g.Key,
                    Present = g.Count(x => x.Status != null && (x.Status.ToUpper() == "P" || x.Status.ToUpper() == "LT")),
                    Marked = g.Count(x => x.Status != null && (
                        x.Status.ToUpper() == "P" ||
                        x.Status.ToUpper() == "A" ||
                        x.Status.ToUpper() == "H" ||
                        x.Status.ToUpper() == "LT" ||
                        x.Status.ToUpper() == "LV"))
                })
                .ToListAsync();

            var map = rows.ToDictionary(x => x.Date, x => x);
            return EachDate(from, to)
                .Select(date =>
                {
                    if (!map.TryGetValue(date, out var row) || row.Marked == 0)
                        return 0m;
                    return Math.Round((decimal)row.Present / row.Marked * 100, 1);
                })
                .ToList();
        }

        private static async Task<List<DashboardBirthdayPersonDto>> BuildBirthdaysTodayAsync(
            AppDbContext context,
            DateTime today)
        {
            var month = today.Month;
            var day = today.Day;

            var students = await context.Students
                .AsNoTracking()
                .Where(x =>
                    x.IsActive == true &&
                    x.Date_of_Brith.HasValue &&
                    x.Date_of_Brith.Value.Month == month &&
                    x.Date_of_Brith.Value.Day == day)
                .OrderBy(x => x.FullName)
                .Take(10)
                .Select(x => new DashboardBirthdayPersonDto
                {
                    Id = x.Reg_Id,
                    Name = x.FullName ?? "Student",
                    Role = "Student",
                    ClassOrDesignation = x.Section != null ? x.Section.ClassName : null
                })
                .ToListAsync();

            var employees = await context.Employees
                .AsNoTracking()
                .Where(x =>
                    x.IsActive == true &&
                    x.DoB.HasValue &&
                    x.DoB.Value.Month == month &&
                    x.DoB.Value.Day == day)
                .OrderBy(x => x.EmployeeName)
                .Take(10)
                .Select(x => new DashboardBirthdayPersonDto
                {
                    Id = x.ID,
                    Name = x.EmployeeName ?? "Employee",
                    Role = "Teacher",
                    ClassOrDesignation = x.Designation != null ? x.Designation.DesignationName : null
                })
                .ToListAsync();

            return students
                .Concat(employees)
                .OrderBy(x => x.Name)
                .Take(12)
                .ToList();
        }

        private static async Task<List<DashboardLateCheckInDto>> BuildLateCheckInsAsync(
            AppDbContext context,
            DateTime today)
        {
            var rows = await (
                from attendance in context.EmployeeAttendances.AsNoTracking()
                join employee in context.Employees.AsNoTracking()
                    on attendance.EmpID equals employee.ID
                join designation in context.Designations.AsNoTracking()
                    on employee.DesignationID equals designation.ID into designationJoin
                from designation in designationJoin.DefaultIfEmpty()
                where attendance.Date.HasValue &&
                      attendance.Date.Value.Date == today &&
                      attendance.EmpID != null &&
                      employee.IsActive == true &&
                      !string.IsNullOrWhiteSpace(attendance.Time) &&
                      (attendance.LateComings ?? 0) > 0
                orderby attendance.ID descending
                select new
                {
                    employee.ID,
                    employee.EmployeeName,
                    DesignationName = designation != null ? designation.DesignationName : null,
                    CheckInTime = attendance.Time,
                    LateComings = attendance.LateComings ?? 0,
                    MustCheckinTime = designation != null ? designation.MustCheckinTime : null,
                    GraceMinutes = designation != null ? designation.MustCheckinMinutesDifference : null,
                    ChangeJson = attendance.ChangeJson
                })
                .Take(20)
                .ToListAsync();

            return rows
                .Select(row =>
                {
                    var lateMinutes = TryReadChangeJsonLateMinutes(row.ChangeJson, out var stored)
                        ? stored
                        : CalculateLateMinutesFromStoredCheckIn(
                            today,
                            row.CheckInTime,
                            DesignationTimeHelper.ToTimeOfDay(row.MustCheckinTime),
                            row.GraceMinutes);
                    return new DashboardLateCheckInDto
                    {
                        EmployeeId = row.ID,
                        EmployeeName = row.EmployeeName ?? "Employee",
                        DesignationName = row.DesignationName,
                        CheckInTime = row.CheckInTime,
                        LateMinutes = lateMinutes > 0 ? lateMinutes : Math.Max(row.LateComings * 30, 1)
                    };
                })
                .OrderByDescending(x => x.LateMinutes)
                .Take(8)
                .ToList();
        }

        private static async Task<List<DashboardRecentAdmissionDto>> BuildRecentAdmissionsAsync(
            AppDbContext context,
            int take)
        {
            return await context.Students
                .AsNoTracking()
                .Where(x => x.IsActive == true)
                .OrderByDescending(x => x.Reg_Id)
                .Take(take)
                .Select(x => new DashboardRecentAdmissionDto
                {
                    StudentId = x.Reg_Id,
                    StudentName = x.FullName ?? "Student",
                    ClassName = x.Section != null ? x.Section.ClassName : null,
                    AdmissionDate = x.RegDate
                })
                .ToListAsync();
        }

        private static async Task<List<DashboardTopDefaulterDto>> BuildTopFeeDefaultersAsync(
            AppDbContext context,
            int take)
        {
            // Same basis as Fee Reports → Top Defaulters (all funds, overall ledger balance).
            return await context.FeeAndFundCollections
                .AsNoTracking()
                .Where(x =>
                    x.Student != null &&
                    x.Student.IsActive == true)
                .GroupBy(x => new
                {
                    StudentId = x.StudentID ?? 0,
                    StudentName = x.Student != null ? x.Student.FullName : null,
                    ClassName = x.Student != null && x.Student.Section != null ? x.Student.Section.ClassName : null
                })
                .Select(g => new DashboardTopDefaulterDto
                {
                    StudentId = g.Key.StudentId,
                    StudentName = g.Key.StudentName ?? "N/A",
                    ClassName = g.Key.ClassName,
                    OutstandingAmount = g.Sum(x => (x.Payment ?? 0) - ((x.Recieved ?? 0) + (x.Discount ?? 0)))
                })
                .Where(x => x.OutstandingAmount > 0)
                .OrderByDescending(x => x.OutstandingAmount)
                .Take(take)
                .ToListAsync();
        }

        private static List<DashboardAlertDto> BuildDashboardAlerts(
            DashboardAttendanceOverviewDto attendance,
            int lateTeacherCount,
            int feeDefaulterCount,
            decimal totalReceivable)
        {
            var alerts = new List<DashboardAlertDto>();

            if (lateTeacherCount > 0)
            {
                alerts.Add(new DashboardAlertDto
                {
                    Severity = "warning",
                    Title = "Late check-ins",
                    Message = $"{lateTeacherCount} teacher{(lateTeacherCount == 1 ? "" : "s")} checked in late today"
                });
            }

            if (attendance.AbsentCount > 0)
            {
                alerts.Add(new DashboardAlertDto
                {
                    Severity = "danger",
                    Title = "Student absences",
                    Message = $"{attendance.AbsentCount} student{(attendance.AbsentCount == 1 ? "" : "s")} {(attendance.AbsentCount == 1 ? "is" : "are")} absent today"
                });
            }

            if (attendance.OnLeaveCount > 0)
            {
                alerts.Add(new DashboardAlertDto
                {
                    Severity = "info",
                    Title = "On leave",
                    Message = $"{attendance.OnLeaveCount} student{(attendance.OnLeaveCount == 1 ? "" : "s")} marked on leave/holiday today"
                });
            }

            if (feeDefaulterCount > 0)
            {
                alerts.Add(new DashboardAlertDto
                {
                    Severity = "warning",
                    Title = "Fee defaulters",
                    Message = $"{feeDefaulterCount} active student{(feeDefaulterCount == 1 ? "" : "s")} with outstanding balance"
                });
            }

            if (totalReceivable > 0)
            {
                alerts.Add(new DashboardAlertDto
                {
                    Severity = "info",
                    Title = "Outstanding receivable",
                    Message = $"Overall receivable stands at Rs {totalReceivable:N0}"
                });
            }

            if (alerts.Count == 0)
            {
                alerts.Add(new DashboardAlertDto
                {
                    Severity = "success",
                    Title = "All clear",
                    Message = "No urgent alerts for today"
                });
            }

            return alerts.Take(6).ToList();
        }

        private static int CalculateLateMinutesFromStoredCheckIn(
            DateTime date,
            string? checkInText,
            TimeSpan? expectedCheckIn,
            int? graceMinutes)
        {
            if (!expectedCheckIn.HasValue || string.IsNullOrWhiteSpace(checkInText))
                return 0;

            if (!TryParseAttendanceTime(date, checkInText, out var actualCheckIn))
                return 0;

            return DesignationTimeHelper.CalculateLateMinutes(actualCheckIn.TimeOfDay, expectedCheckIn, graceMinutes);
        }

        private static bool TryReadChangeJsonLateMinutes(string? changeJson, out int lateMinutes)
        {
            lateMinutes = 0;
            if (string.IsNullOrWhiteSpace(changeJson))
                return false;

            try
            {
                using var doc = JsonDocument.Parse(changeJson);
                if (!doc.RootElement.TryGetProperty("Calculation", out var calc) ||
                    calc.ValueKind != JsonValueKind.Object)
                {
                    return false;
                }

                if (calc.TryGetProperty("LateMinutes", out var lateProp) &&
                    lateProp.TryGetInt32(out lateMinutes))
                {
                    return true;
                }

                if (calc.TryGetProperty("lateMinutes", out lateProp) &&
                    lateProp.TryGetInt32(out lateMinutes))
                {
                    return true;
                }
            }
            catch (JsonException)
            {
                // Ignore malformed legacy JSON.
            }

            return false;
        }

        private static bool TryParseAttendanceTime(DateTime date, string timeText, out DateTime result)
        {
            if (TimeSpan.TryParse(timeText, CultureInfo.InvariantCulture, out var ts) ||
                TimeSpan.TryParse(timeText, out ts))
            {
                result = date.Date.Add(ts);
                return true;
            }

            if (DateTime.TryParse($"{date:yyyy-MM-dd} {timeText}", CultureInfo.InvariantCulture, DateTimeStyles.None, out result))
                return true;

            return DateTime.TryParse($"{date:yyyy-MM-dd} {timeText}", out result);
        }

        private async Task<List<DashboardCountPointDto>> BuildAdmissionsTrendAsync(AppDbContext context, DateTime from, DateTime to)
        {
            var rows = await context.Students
                .Where(x => x.IsActive == true && x.RegDate.HasValue && x.RegDate.Value.Date >= from && x.RegDate.Value.Date <= to)
                .GroupBy(x => x.RegDate!.Value.Date)
                .Select(g => new { Date = g.Key, Count = g.Count() })
                .ToListAsync();

            var map = rows.ToDictionary(x => x.Date, x => x.Count);
            return EachDate(from, to)
                .Select(date => new DashboardCountPointDto
                {
                    Date = date,
                    Label = date.ToString("dd MMM"),
                    Count = map.TryGetValue(date, out var count) ? count : 0
                })
                .ToList();
        }

        private async Task<List<DashboardAdmissionLeftPointDto>> BuildAdmissionsVsLeftTrendAsync(AppDbContext context, DateTime from, DateTime to)
        {
            var newRows = await context.Students
                .Where(x => x.RegDate.HasValue && x.RegDate.Value.Date >= from && x.RegDate.Value.Date <= to)
                .GroupBy(x => x.RegDate!.Value.Date)
                .Select(g => new { Date = g.Key, Count = g.Count() })
                .ToListAsync();

            var leftRows = await context.Students
                .Where(x => x.Leave_Date.HasValue && x.Leave_Date.Value.Date >= from && x.Leave_Date.Value.Date <= to)
                .GroupBy(x => x.Leave_Date!.Value.Date)
                .Select(g => new { Date = g.Key, Count = g.Count() })
                .ToListAsync();

            var newMap = newRows.ToDictionary(x => x.Date, x => x.Count);
            var leftMap = leftRows.ToDictionary(x => x.Date, x => x.Count);

            return EachDate(from, to)
                .Select(date => new DashboardAdmissionLeftPointDto
                {
                    Date = date,
                    Label = date.ToString("dd MMM"),
                    NewAdmissions = newMap.TryGetValue(date, out var newCount) ? newCount : 0,
                    LeftStudents = leftMap.TryGetValue(date, out var leftCount) ? leftCount : 0
                })
                .ToList();
        }

        private async Task<List<DashboardMoneyPointDto>> BuildFeeTrendAsync(AppDbContext context, DateTime from, DateTime to)
        {
            var rows = await context.FeeAndFundCollections
                .Where(x => x.Student != null && x.Student.IsActive == true && x.Date.HasValue && x.Date.Value.Date >= from && x.Date.Value.Date <= to)
                .GroupBy(x => x.Date!.Value.Date)
                .Select(g => new { Date = g.Key, Amount = g.Sum(x => x.Recieved ?? 0) })
                .ToListAsync();

            var map = rows.ToDictionary(x => x.Date, x => x.Amount);
            return EachDate(from, to)
                .Select(date => new DashboardMoneyPointDto
                {
                    Date = date,
                    Label = date.ToString("dd MMM"),
                    Amount = map.TryGetValue(date, out var amount) ? amount : 0
                })
                .ToList();
        }

        private async Task<List<DashboardClassAdmissionDto>> BuildAdmissionsByClassAsync(AppDbContext context, DateTime from, DateTime to)
        {
            var rows = await context.Students
                .Where(x => x.IsActive == true && x.RegDate.HasValue && x.RegDate.Value.Date >= from && x.RegDate.Value.Date <= to)
                .Select(x => new
                {
                    x.ClassCompositeID,
                    ClassName = x.Section != null ? x.Section.ClassName : null,
                    SectionName = x.Section != null ? x.Section.SectionName : null
                })
                .ToListAsync();

            return rows
                .GroupBy(x => new
                {
                    Key = x.ClassCompositeID?.ToString() ?? "unassigned",
                    Name = FormatClassName(x.ClassName, x.SectionName, x.ClassCompositeID)
                })
                .Select(g => new DashboardClassAdmissionDto
                {
                    ClassKey = g.Key.Key,
                    ClassName = g.Key.Name,
                    Count = g.Count()
                })
                .OrderByDescending(x => x.Count)
                .ThenBy(x => x.ClassName)
                .Take(8)
                .ToList();
        }

        private async Task<List<DashboardClassStrengthDto>> BuildClassStrengthAsync(AppDbContext context)
        {
            var rows = await context.Students
                .Where(x => x.IsActive == true)
                .Select(x => new
                {
                    x.ClassCompositeID,
                    ClassName = x.Section != null ? x.Section.ClassName : null,
                    SectionName = x.Section != null ? x.Section.SectionName : null
                })
                .ToListAsync();

            return rows
                .GroupBy(x => new
                {
                    Key = x.ClassCompositeID?.ToString() ?? "unassigned",
                    Name = FormatClassName(x.ClassName, x.SectionName, x.ClassCompositeID)
                })
                .Select(g => new DashboardClassStrengthDto
                {
                    ClassKey = g.Key.Key,
                    ClassName = g.Key.Name,
                    ActiveStudentCount = g.Count()
                })
                .OrderByDescending(x => x.ActiveStudentCount)
                .ThenBy(x => x.ClassName)
                .ToList();
        }

        private async Task<List<DashboardCategoryAmountDto>> BuildFeeBreakdownAsync(AppDbContext context, DateTime from, DateTime to)
        {
            var rows = await context.FeeAndFundCollections
                .Where(x => x.Student != null && x.Student.IsActive == true && x.Date.HasValue && x.Date.Value.Date >= from && x.Date.Value.Date <= to)
                .GroupBy(x => x.FundTypeID ?? 0)
                .Select(g => new
                {
                    FundTypeId = g.Key,
                    Amount = g.Sum(x => x.Recieved ?? 0)
                })
                .Where(x => x.Amount > 0)
                .ToListAsync();

            var fundTypeIds = rows.Select(x => x.FundTypeId).Distinct().ToList();
            var fundTypeNames = await context.FundTypes
                .Where(x => fundTypeIds.Contains(x.ID))
                .ToDictionaryAsync(x => x.ID, x => x.FundTypeName);

            return BuildAmountDistribution(rows
                .Select(x => new AmountBucket(
                    x.FundTypeId.ToString(),
                    fundTypeNames.TryGetValue(x.FundTypeId, out var name) && !string.IsNullOrWhiteSpace(name) ? name! : $"Fund {x.FundTypeId}",
                    x.Amount))
                .ToList());
        }

        private async Task<List<DashboardCategoryAmountDto>> BuildFeeBreakdownByMonthAsync(AppDbContext context, int month, int year)
        {
            var from = new DateTime(year, month, 1);
            var to = from.AddMonths(1);

            var rows = await context.FeeAndFundCollections
                .Where(x => x.Student != null &&
                            x.Student.IsActive == true &&
                            x.Date.HasValue &&
                            x.Date.Value >= from &&
                            x.Date.Value < to)
                .GroupBy(x => x.FundTypeID ?? 0)
                .Select(g => new
                {
                    FundTypeId = g.Key,
                    Amount = g.Sum(x => x.Recieved ?? 0)
                })
                .Where(x => x.Amount > 0)
                .ToListAsync();

            var fundTypeIds = rows.Select(x => x.FundTypeId).Distinct().ToList();
            var fundTypeNames = await context.FundTypes
                .Where(x => fundTypeIds.Contains(x.ID))
                .ToDictionaryAsync(x => x.ID, x => x.FundTypeName);

            return BuildAmountDistribution(rows
                .Select(x => new AmountBucket(
                    x.FundTypeId.ToString(),
                    fundTypeNames.TryGetValue(x.FundTypeId, out var name) && !string.IsNullOrWhiteSpace(name) ? name! : $"Fund {x.FundTypeId}",
                    x.Amount))
                .ToList());
        }

        private async Task<List<DashboardExpenseHeadDto>> BuildExpenseHeadsAsync(AppDbContext context, DateTime from, DateTime to)
        {
            var rows = await context.TransactionDetails
                .Where(x => x.Date.HasValue && x.Date.Value.Date >= from && x.Date.Value.Date <= to && (x.Debit ?? 0) > 0)
                .GroupBy(x => x.AccountID ?? string.Empty)
                .Select(g => new
                {
                    Code = g.Key,
                    Amount = g.Sum(x => x.Debit ?? 0)
                })
                .Where(x => x.Amount > 0)
                .ToListAsync();

            var buckets = rows.Select(x => new ExpenseBucket(x.Code, x.Code, x.Amount)).ToList();
            var codes = buckets.Select(x => x.Code).Where(x => !string.IsNullOrWhiteSpace(x)).Distinct().ToList();
            var names = await context.AccountSubtypes
                .Where(x => x.LID4 != null && codes.Contains(x.LID4))
                .GroupBy(x => x.LID4!)
                .Select(g => new { Code = g.Key, Name = g.Max(x => x.Title4) })
                .ToDictionaryAsync(x => x.Code, x => x.Name);

            buckets = buckets
                .Select(x => x with
                {
                    Name = !string.IsNullOrWhiteSpace(x.Code) && names.TryGetValue(x.Code, out var name) && !string.IsNullOrWhiteSpace(name)
                        ? name.Trim()
                        : string.IsNullOrWhiteSpace(x.Code) ? "Unclassified" : x.Code
                })
                .ToList();

            return BuildExpenseHeadDistribution(buckets);
        }

        private async Task<List<DashboardExpenseSubheadDto>> BuildExpenseSubheadsAsync(AppDbContext context, DateTime from, DateTime to)
        {
            var rows = await context.TransactionDetails
                .Where(x => x.Date.HasValue && x.Date.Value.Date >= from && x.Date.Value.Date <= to && (x.Debit ?? 0) > 0)
                .GroupBy(x => new
                {
                    AccountCode = x.AccountID ?? string.Empty
                })
                .Select(g => new
                {
                    g.Key.AccountCode,
                    Amount = g.Sum(x => x.Debit ?? 0)
                })
                .Where(x => x.Amount > 0)
                .OrderByDescending(x => x.Amount)
                .Take(12)
                .ToListAsync();

            var accountCodes = rows.Select(x => x.AccountCode).Where(x => !string.IsNullOrWhiteSpace(x)).Distinct().ToList();

            var accountNames = await context.AccountSubtypes
                .Where(x => x.LID4 != null && accountCodes.Contains(x.LID4))
                .GroupBy(x => x.LID4!)
                .Select(g => new { Code = g.Key, Name = g.Max(x => x.Title4) })
                .ToDictionaryAsync(x => x.Code, x => x.Name);

            return rows
                .Select(x => new DashboardExpenseSubheadDto
                {
                    HeadCode = x.AccountCode,
                    HeadName = ResolveName(x.AccountCode, accountNames, string.IsNullOrWhiteSpace(x.AccountCode) ? "Unclassified" : x.AccountCode),
                    SubheadCode = x.AccountCode,
                    SubheadName = ResolveName(x.AccountCode, accountNames, string.IsNullOrWhiteSpace(x.AccountCode) ? "Unclassified" : x.AccountCode),
                    Amount = x.Amount
                })
                .ToList();
        }

        private List<CampusConnection> GetCampusConnections()
        {
            var campuses = _configuration
                .GetSection("CampusSettings:Campuses")
                .GetChildren()
                .Where(x => !string.IsNullOrWhiteSpace(x.Key) && !string.IsNullOrWhiteSpace(x.Value))
                .Select(x => new CampusConnection(x.Key, x.Value!))
                .ToList();

            if (IsProductionEnvironment())
            {
                campuses = campuses
                    .Where(x => !string.Equals(x.Campus, "local", StringComparison.OrdinalIgnoreCase))
                    .ToList();
            }

            return campuses;
        }

        private bool IsProductionEnvironment()
        {
            var environment = _configuration["ASPNETCORE_ENVIRONMENT"] ?? _configuration["DOTNET_ENVIRONMENT"];
            return string.Equals(environment, "Production", StringComparison.OrdinalIgnoreCase);
        }

        private static AppDbContext CreateCampusContext(string connectionString)
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseSqlServer(connectionString)
                .Options;

            return new AppDbContext(options);
        }

        private static IEnumerable<DateTime> EachDate(DateTime from, DateTime to)
        {
            for (var date = from.Date; date <= to.Date; date = date.AddDays(1))
            {
                yield return date;
            }
        }

        private static string FormatClassName(string? className, string? sectionName, int? fallbackId)
        {
            var parts = new[] { className, sectionName }
                .Where(x => !string.IsNullOrWhiteSpace(x))
                .Select(x => x!.Trim())
                .Distinct(StringComparer.OrdinalIgnoreCase);
            var name = string.Join(" ", parts).Trim();
            return string.IsNullOrWhiteSpace(name) ? (fallbackId.HasValue ? $"Class {fallbackId}" : "Unassigned") : name;
        }

        private static List<CountBucket> NormalizeGenderBuckets(List<CountBucket> rows)
        {
            return rows
                .GroupBy(x => NormalizeGenderKey(x.Key))
                .Select(g => new CountBucket(g.Key, NormalizeGenderLabel(g.Key), g.Sum(x => x.Count)))
                .ToList();
        }

        private static string NormalizeGenderKey(string? gender)
        {
            var value = (gender ?? string.Empty).Trim().ToLowerInvariant();
            if (value is "m" or "male" or "boy" or "boys") return "boys";
            if (value is "f" or "female" or "girl" or "girls") return "girls";
            return string.IsNullOrWhiteSpace(value) ? "unspecified" : value;
        }

        private static string NormalizeGenderLabel(string key)
        {
            return key switch
            {
                "boys" => "Boys",
                "girls" => "Girls",
                "unspecified" => "Unspecified",
                _ => key.ToUpperInvariant()
            };
        }

        private static List<DashboardCategoryCountDto> BuildCountDistribution(List<CountBucket> rows)
        {
            var total = rows.Sum(x => x.Count);
            return rows
                .Where(x => x.Count > 0)
                .OrderByDescending(x => x.Count)
                .Select(x => new DashboardCategoryCountDto
                {
                    Key = x.Key,
                    Label = x.Label,
                    Count = x.Count,
                    Percentage = total > 0 ? Math.Round((decimal)x.Count / total * 100, 1) : 0
                })
                .ToList();
        }

        private static List<DashboardCategoryAmountDto> BuildAmountDistribution(List<AmountBucket> rows)
        {
            var total = rows.Sum(x => x.Amount);
            return rows
                .Where(x => x.Amount > 0)
                .OrderByDescending(x => x.Amount)
                .Select(x => new DashboardCategoryAmountDto
                {
                    Key = x.Key,
                    Label = x.Label,
                    Amount = x.Amount,
                    Percentage = total > 0 ? Math.Round(x.Amount / total * 100, 1) : 0
                })
                .ToList();
        }

        private static List<DashboardExpenseHeadDto> BuildExpenseHeadDistribution(List<ExpenseBucket> rows)
        {
            var total = rows.Sum(x => x.Amount);
            return rows
                .Where(x => x.Amount > 0)
                .OrderByDescending(x => x.Amount)
                .Take(8)
                .Select(x => new DashboardExpenseHeadDto
                {
                    HeadCode = x.Code,
                    HeadName = x.Name,
                    Amount = x.Amount,
                    Percentage = total > 0 ? Math.Round(x.Amount / total * 100, 1) : 0
                })
                .ToList();
        }

        private static string ResolveName(string code, Dictionary<string, string?> names, string fallback)
        {
            return !string.IsNullOrWhiteSpace(code) &&
                   names.TryGetValue(code, out var name) &&
                   !string.IsNullOrWhiteSpace(name)
                ? name.Trim()
                : fallback;
        }

        private static string? ExtractActivityLogDescription(string? detailsJson)
        {
            if (string.IsNullOrWhiteSpace(detailsJson))
                return null;

            try
            {
                using var document = JsonDocument.Parse(detailsJson);
                if (document.RootElement.TryGetProperty("description", out var descriptionElement) &&
                    descriptionElement.ValueKind == JsonValueKind.String)
                {
                    var value = descriptionElement.GetString()?.Trim();
                    return string.IsNullOrWhiteSpace(value) ? null : value;
                }
            }
            catch (JsonException)
            {
                return null;
            }

            return null;
        }

        private static int? GetStudyDurationDays(DateTime? regDate, DateTime? leaveDate)
        {
            if (!regDate.HasValue || !leaveDate.HasValue)
                return null;

            var from = regDate.Value.Date;
            var to = leaveDate.Value.Date;
            if (to < from)
                return null;

            return Math.Max(0, (to - from).Days);
        }

        private static string FormatStudyDuration(DateTime? regDate, DateTime? leaveDate)
        {
            if (!regDate.HasValue || !leaveDate.HasValue)
                return "—";

            var from = regDate.Value.Date;
            var to = leaveDate.Value.Date;
            if (to < from)
                return "—";

            var totalDays = (to - from).Days;
            if (totalDays <= 0)
                return "Less than 1 day";

            var years = totalDays / 365;
            var remainingAfterYears = totalDays % 365;
            var months = remainingAfterYears / 30;
            var days = remainingAfterYears % 30;

            var parts = new List<string>();
            if (years > 0)
                parts.Add($"{years} year{(years == 1 ? "" : "s")}");
            if (months > 0)
                parts.Add($"{months} month{(months == 1 ? "" : "s")}");
            if (days > 0 && years == 0)
                parts.Add($"{days} day{(days == 1 ? "" : "s")}");

            return parts.Count > 0 ? string.Join(" ", parts) : "Less than 1 month";
        }

        private sealed record CampusConnection(string Campus, string ConnectionString);
        private sealed record CountBucket(string Key, string Label, int Count);
        private sealed record AmountBucket(string Key, string Label, decimal Amount);
        private sealed record ExpenseBucket(string Code, string Name, decimal Amount);
    }
}
