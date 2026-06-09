using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using School.Application.DTOs;
using School.Application.Interfaces;
using School.Infrastructure.Data;

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
            var campusConnections = _configuration
                .GetSection("CampusSettings:Campuses")
                .GetChildren()
                .Where(x => !string.IsNullOrWhiteSpace(x.Key) && !string.IsNullOrWhiteSpace(x.Value))
                .Select(x => new { Campus = x.Key, ConnectionString = x.Value! })
                .ToList();

            var result = new AllCampusDashboardDto
            {
                Date = today
            };

            foreach (var campusConfig in campusConnections)
            {
                var options = new DbContextOptionsBuilder<AppDbContext>()
                    .UseSqlServer(campusConfig.ConnectionString)
                    .Options;

                await using var campusContext = new AppDbContext(options);

                var activeStudentCount = await campusContext.Students
                    .CountAsync(x => x.IsActive == true);

                var feeCollectionToday = await campusContext.FeeAndFundCollections
                    .Where(x => x.Date.HasValue && x.Date.Value.Date == today)
                    .SumAsync(x => x.Recieved ?? 0);

                result.Campuses.Add(new CampusDashboardItemDto
                {
                    Campus = campusConfig.Campus,
                    ActiveStudentCount = activeStudentCount,
                    FeeCollectionToday = feeCollectionToday
                });
            }

            result.TotalActiveStudentCount = result.Campuses.Sum(x => x.ActiveStudentCount);
            result.TotalFeeCollectionToday = result.Campuses.Sum(x => x.FeeCollectionToday);

            return result;
        }
    }
}
