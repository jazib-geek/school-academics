using System;
using System.Collections.Generic;
using System.Data.Entity;
using System.Linq;
using System.Security.Cryptography.X509Certificates;
using System.Text;
using System.Threading.Tasks;
using Data.DAL;
using Data.Viewmodel;
using Data.Viewmodel.Employee;
using static Data.Helper.Constants;

namespace Data.BLL.Employee
{
    public class Salary
    {
        public static List<EmployeeSalaryViewModel> GetEmployeeSalaryByMonth(int month, int year)
        {
            using (var db = new dbSchoolEntities())
            {
                int daysInMonth = DateTime.DaysInMonth(year, month);

                // Step 1: Calculate working days excluding Sundays and 'H' status holidays
                var attendanceList = db.tblEmployeeAttendances
                    .Where(x => x.Date.HasValue && x.Date.Value.Month == month && x.Date.Value.Year == year)
                    .Select(x => new { x.EmpID, x.LateDeduction, x.Status, x.LateComings, x.Date })
                    .ToList();

                var holidayDates = attendanceList
                    .Where(x => x.Status == "H" && x.Date.HasValue)
                    .Select(x => x.Date.Value.Date)
                    .ToHashSet();

                int workingDaysInMonth = Enumerable.Range(1, daysInMonth)
                    .Select(day => new DateTime(year, month, day))
                    .Count(date => date.DayOfWeek != DayOfWeek.Sunday && !holidayDates.Contains(date));

                var attendanceGrouped = attendanceList
                    .GroupBy(a => a.EmpID)
                    .ToDictionary(g => g.Key, g => g.ToList());

                var salaryGroups = db.tblEmployeeSalaryComponents
                    .Where(x => x.Month == month && x.Year == year)
                    .AsEnumerable()
                    .GroupBy(x => x.EmpID)
                    .ToList();

                var employeeDict = db.tblEmployees
                    .Select(e => new { e.ID, e.EmployeeName, e.Salary })
                    .ToDictionary(e => e.ID, e => new { e.EmployeeName, e.Salary });

                var result = new List<EmployeeSalaryViewModel>();

                // Step 3: Process each employee's salary
                foreach (var g in salaryGroups)
                {
                    int empId = g.Key;

                    employeeDict.TryGetValue(empId, out var employee);
                    attendanceGrouped.TryGetValue(empId, out var empAttendance);

                    int presentDays = attendanceList?.Count(x =>
                       x.EmpID == empId && x.Status == "P") ?? 0;

                    decimal lateDeduction = empAttendance?.Sum(x => x.LateDeduction ?? 0) ?? 0;
                    int lateComings = empAttendance?.Sum(x => x.LateComings ?? 0) ?? 0;
                    decimal absentDeduction = GetAbsentDeduction(employee?.Salary ?? 0, presentDays, workingDaysInMonth);

                    decimal GetComponentSum(string type) =>
                        Math.Round(g.Where(x => x.ComponentType == type)
                                    .Sum(x => (decimal?)x.Amount ?? 0), 2);

                    var salaryVM = new EmployeeSalaryViewModel
                    {
                        EmpID = empId,
                        EmployeeName = employee?.EmployeeName + "." ?? "Unknown",
                        BasicSalary = GetComponentSum(SalaryComponentTypes.BasicSalary),
                        WorkingDaysCount = workingDaysInMonth,
                        PresentDaysCount = 99,
                        LateComingsCount = lateComings,
                        LateDeduction = lateDeduction,
                        AbsentDeduction = absentDeduction,
                        TeaAllowance = GetComponentSum(SalaryComponentTypes.TeaAllowance),
                        WorkingDaysSalary = GetComponentSum(SalaryComponentTypes.WorkingDaySalary),
                        SecurityCharges = GetComponentSum(SalaryComponentTypes.SecurityCharges),
                        Loan = GetComponentSum(SalaryComponentTypes.Loan),
                        Bonus = GetComponentSum(SalaryComponentTypes.Bonus),
                    };

                    salaryVM.NetSalary =
                        salaryVM.WorkingDaysSalary
                      + salaryVM.Bonus
                      + salaryVM.TeaAllowance
                      - salaryVM.SecurityCharges
                      - salaryVM.Loan;

                    result.Add(salaryVM);
                }

                return result;
            }
        }
        public static EmployeeSalaryViewModel GetSingleEmployeeSalary(List<EmployeeAttendanceViewModel> empAttendance, int empId, int month, int year)
        {
            using (var db = new dbSchoolEntities())
            {
                int daysInMonth = DateTime.DaysInMonth(year, month);

                // Step 1: Get all attendance entries for the given employee in the specified month/year
                //var empAttendance = db.tblEmployeeAttendances
                //    .Where(x => x.EmpID == empId && x.Date.HasValue && x.Date.Value.Month == month && x.Date.Value.Year == year)
                //    .Select(x => new { x.EmpID, x.LateDeduction, x.Status, x.LateComings, x.Date })
                //    .ToList();

                var holidayDates = empAttendance
                    .Where(x => x.Status == "H" && x.Date.HasValue)
                    .Select(x => x.Date.Value.Date)
                    .ToHashSet();

                int workingDaysInMonth = Enumerable.Range(1, daysInMonth)
                    .Select(day => new DateTime(year, month, day))
                    .Count(date => date.DayOfWeek != DayOfWeek.Sunday && !holidayDates.Contains(date));

                int holidayCount = empAttendance.Where(x => x.Status == "H" && x.Date.HasValue).Select(x => x.Date.Value.Date).Distinct().Count();

                int sundayCount = Enumerable.Range(1, daysInMonth).Count(d => new DateTime(year, month, d).DayOfWeek == DayOfWeek.Sunday);    

                int totalNonWorkingDays = holidayCount + sundayCount;

                int presentDays = empAttendance.Count(x => x.Status == "P");
                decimal lateDeduction = empAttendance.Sum(x => x.LateDeduction ?? 0);
                int lateComings = empAttendance.Sum(x => x.LateComings ?? 0);

                var employee = db.tblEmployees
                    .Where(e => e.ID == empId)
                    .Select(e => new { e.ID, e.EmployeeName, e.Salary })
                    .FirstOrDefault();

                decimal absentDeduction = GetAbsentDeduction(employee?.Salary ?? 0, presentDays, workingDaysInMonth);

                var components = db.tblEmployeeSalaryComponents
                    .Where(x => x.EmpID == empId && x.Month == month && x.Year == year)
                    .ToList();

                decimal GetComponentSum(string type) =>
                    Math.Round(components
                        .Where(x => x.ComponentType == type)
                        .Sum(x => (decimal?)x.Amount ?? 0), 2);


                var salaryVM = new EmployeeSalaryViewModel
                {
                    EmpID = empId,
                    EmployeeName = employee?.EmployeeName ?? "Unknown",
                    BasicSalary = GetComponentSum(SalaryComponentTypes.BasicSalary),
                    WorkingDaysCount = workingDaysInMonth,
                    PresentDaysCount = presentDays > 0 ? (presentDays + totalNonWorkingDays) : 0,
                    LateComingsCount = lateComings,
                    LateDeduction = lateDeduction,
                    AbsentDeduction = absentDeduction,
                    TeaAllowance = GetComponentSum(SalaryComponentTypes.TeaAllowance),
                    WorkingDaysSalary = presentDays > 0 ? GetComponentSum(SalaryComponentTypes.WorkingDaySalary) : 0,
                    SecurityCharges = GetComponentSum(SalaryComponentTypes.SecurityCharges),
                    Loan = GetComponentSum(SalaryComponentTypes.Loan),
                    Fine = GetComponentSum(SalaryComponentTypes.Fine),
                    Advance = GetComponentSum(SalaryComponentTypes.Advance),
                    Bonus = GetComponentSum(SalaryComponentTypes.Bonus),
                };

                salaryVM.NetSalary =
                    salaryVM.WorkingDaysSalary +
                    salaryVM.Bonus +
                    salaryVM.TeaAllowance -
                    salaryVM.Loan -
                    salaryVM.Fine -
                    salaryVM.Advance -
                    salaryVM.SecurityCharges;

                return salaryVM;
            }
        }

        public static List<EmployeeAttendanceViewModel> GetEmployeeAttendanceList(int month, int year)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                var attendanceList = db.tblEmployeeAttendances
              .Where(x => x.Date.HasValue && x.Date.Value.Month == month && x.Date.Value.Year == year)
              .Select(x => new EmployeeAttendanceViewModel
              {
                  EmpID = x.EmpID,
                  LateDeduction = x.LateDeduction,
                  Status = x.Status,
                  Date = x.Date,
                  LateComings = x.LateComings
              });

                return attendanceList.ToList();
            }
        }

        //public static List<EmployeeSalaryViewModel> GetEmployeeSalaryByMonth(int month, int year)
        //{
        //    using (var db = new dbSchoolEntities())
        //    {
        //        int daysInMonth = DateTime.DaysInMonth(year, month);

        //        var attendanceList = db.tblEmployeeAttendances
        //                            .Where(x => x.Date.HasValue && x.Date.Value.Month == month && x.Date.Value.Year == year)
        //                            .Select(x => new { x.EmpID, x.LateDeduction , x.Status , x.LateComings , x.Date })
        //                            .ToList();


        //        var groupedSalaries = db.tblEmployeeSalaryComponents
        //            .Where(x => x.Month == month && x.Year == year)
        //            .GroupBy(x => x.EmpID)
        //            .ToList(); 

        //        var employeeList = db.tblEmployees.ToList();

        //        var result = new List<EmployeeSalaryViewModel>();

        //        foreach (var g in groupedSalaries)
        //        {
        //            int empId = g.Key;

        //            var employee = employeeList.FirstOrDefault(e => e.ID == empId);

        //            int presentDays = attendanceList.Where(x => x.EmpID == empId &&
        //                x.Date.HasValue && x.Date.Value.Month == month &&
        //                x.Date.Value.Year == year &&
        //                (x.Status == "P" || x.Status == "H"))
        //                .Count();

        //           // var presentDays = NoOfDaysPresent(empId, month, year);
        //            var lateDeduction = attendanceList.Where(x => x.EmpID == empId).Sum(x => x.LateDeduction ?? 0);
        //            var lateComingsCount = attendanceList.Where(x => x.EmpID == empId).Sum(x => x.LateComings ?? 0);
        //            var absentDeduction = GetAbsentDeduction(employee.Salary,presentDays, daysInMonth);

        //            var salaryVM = new EmployeeSalaryViewModel
        //            {
        //                EmpID = empId,
        //                EmployeeName = employee?.EmployeeName ?? "Unknown",
        //                BasicSalary = Math.Round(g.Where(x => x.ComponentType == SalaryComponentTypes.BasicSalary).Sum(x => (decimal?)x.Amount ?? 0), 2),
        //                WorkingDaysCount = daysInMonth,
        //                LateComingsCount = lateComingsCount,
        //                PresentDaysCount = presentDays,
        //                LateDeduction = Math.Round(lateDeduction, 2),
        //                AbsentDeduction = Math.Round(absentDeduction, 2),
        //                TeaAllowance = Math.Round(g.Where(x => x.ComponentType == SalaryComponentTypes.TeaAllowance).Sum(x => (decimal?)x.Amount ?? 0), 2),
        //                WorkingDaysSalary = Math.Round(g.Where(x => x.ComponentType == SalaryComponentTypes.WorkingDaySalary).Sum(x => (decimal?)x.Amount ?? 0), 2),
        //                SecurityCharges = Math.Round(g.Where(x => x.ComponentType == SalaryComponentTypes.SecurityCharges).Sum(x => (decimal?)x.Amount ?? 0), 2),
        //                Loan = Math.Round(g.Where(x => x.ComponentType == SalaryComponentTypes.Loan).Sum(x => (decimal?)x.Amount ?? 0), 2),
        //                Bonus = Math.Round(g.Where(x => x.ComponentType == SalaryComponentTypes.Bonus).Sum(x => (decimal?)x.Amount ?? 0), 2),
        //            };


        //            // NetSalary calculation
        //            salaryVM.NetSalary = Math.Round(
        //                                            (decimal)(salaryVM.WorkingDaysSalary
        //                                          + salaryVM.Bonus
        //                                          + salaryVM.TeaAllowance
        //                                          - salaryVM.SecurityCharges), 2);


        //            result.Add(salaryVM);
        //        }

        //        return result;
        //    }
        //}

       

        //public static List<SalaryViewModel> ThisMonth(int? Month, int? Year)
        //{
        //    using (dbSchoolEntities db = new dbSchoolEntities())
        //    {
        //        var lst = new List<SalaryViewModel>();
        //        var query = db.v_EmployeeAttendance.Where(x => x.Month == Month && x.Year == Year).ToList();

        //        foreach (var item in query)
        //        {
        //            int sDay = item.AttendanceDate.Value.Day;
        //            int sMonth = item.AttendanceDate.Value.Month;
        //            int sYear = item.AttendanceDate.Value.Year;

        //            int sHour = item.DefaultCheckinTime.Value.Hour;
        //            int sMinute = item.DefaultCheckinTime.Value.Minute;

        //            var StartDate = new DateTime(sYear, sMonth, sDay, sHour, sMinute, 0);
        //            var EndDate = item.AttendanceDate;

        //            var SPAN = EndDate - StartDate;
        //            var MinutesDiff = SPAN.Value.TotalMinutes;

        //            lst.Add(new SalaryViewModel()
        //            {
        //                ThumbID = item.Thumb_ID,
        //                Date = item.AttendanceDate,
        //                DefaultTime = item.DefaultCheckinTime.Value.ToShortTimeString(),
        //                CheckinTime = item.AttendanceTime,
        //                EmployeeName = item.Name,
        //                DesignationID = item.DesignationID,
        //                Designation = item.Designation,
        //                MinutesLate = Math.Round(MinutesDiff, 2),
        //                LateComings = CountLateComings(Convert.ToInt32(MinutesDiff))
        //            });
        //        }

        //        return lst;
        //    }
        //}

        public static decimal? ThisEmployee(int EmployeeID, int Month, int Year)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                var Emp = db.v_Employee.Where(x => x.ID == EmployeeID).FirstOrDefault();
                int NoOfSundays = SundaysInMonth(Month, Year);
                decimal? TotalSalary = 0;

                if (Emp != null)
                {
                    int? DaysInMonth = DateTime.DaysInMonth(Year, Month);
                    int DaysPresent = NoOfDaysPresent(EmployeeID, Month, Year);
                    int PublicHolidaysCount = NoOfPublicHolidays(Month, Year);

                    DaysPresent += NoOfSundays;

                    TotalSalary = DaysPresent * Emp.SalaryPerDay;


                }

                return TotalSalary;
            }
        }

        public static int NoOfDaysPresent(int employeeID, int month, int year)
        {
            using (var db = new dbSchoolEntities())
            {
                return db.tblEmployeeAttendances
                    .Where(x => x.EmpID == employeeID &&
                                x.Date.HasValue &&
                                x.Date.Value.Month == month &&
                                x.Date.Value.Year == year &&
                                (x.Status == "P" || x.Status == "H"))
                    .Count();
            }
        }

        public static int NoOfPublicHolidays(int month, int year)
        {
            using (var db = new dbSchoolEntities())
            {
                return db.tblEmployeeAttendances
                    .Where(x => x.Date.HasValue &&
                                x.Date.Value.Month == month &&
                                x.Date.Value.Year == year &&
                                x.Status == "H")
                    .Count();
            }
        }


        public static decimal GetLateDeduction(int? EmployeeID, int Month, int Year, int? DaysInMonth)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                var employee = db.tblEmployees.FirstOrDefault(e => e.ID == EmployeeID);
                if (employee == null || employee.Salary == null)
                    return 0;

                var attendance = db.v_EmployeeAttendance
                                   .Where(x => x.EmployeeID == EmployeeID && x.Month == Month && x.Year == Year)
                                   .ToList();

                DaysInMonth = DaysInMonth != null ? DaysInMonth.Value : 30;

                if (attendance.Count > 0)
                {
                    int totalLateComings = attendance.Sum(x => x.LateComings ?? 0);

                    // 30 working days per month, 6 hours per day => 480 minutes per day
                    // => 30-minute salary = MonthlySalary / (30 * 12)
                    decimal salaryPer30Min = employee.Salary.Value / 360;
                    return totalLateComings * salaryPer30Min;
                }

                return 0;
            }
        }
        public static decimal GetAbsentDeduction(int employeeID, int month, int year, int DaysInMonth)
        {
            using (var db = new dbSchoolEntities())
            {
                var employee = db.tblEmployees.FirstOrDefault(e => e.ID == employeeID);
                if (employee == null || employee.Salary == null)
                    return 0;


                // Safe LINQ query — no .NET method inside
                int presentDays = db.tblEmployeeAttendances
                    .Where(x => x.EmpID == employeeID &&
                                x.Date.HasValue &&
                                x.Date.Value.Month == month &&
                                x.Date.Value.Year == year &&
                                (x.Status == "P" || x.Status == "H"))
                    .Count();

                int absentDays = DaysInMonth - presentDays;

                if (absentDays <= 0)
                    return 0;

                decimal perDaySalary = employee.Salary.Value / DaysInMonth;
                return absentDays * perDaySalary;
            }
        }

        public static decimal GetAbsentDeduction(decimal? Salary, int presentDays, int DaysInMonth)
        {
            using (var db = new dbSchoolEntities())
            {
                if (!Salary.HasValue)
                    return 0;
                                
                decimal perDaySalary = Salary.Value / DaysInMonth;
                int absentDays = DaysInMonth - presentDays;

                if (presentDays == 0)
                    absentDays = DaysInMonth;

                return Math.Round(absentDays * perDaySalary, 2);
            }
        }


        public static decimal? GetLateDeductionOnThisDay(DateTime Date, decimal? MonthlySalary, int? nLateComings)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                int Month = Date.Month;
                int Year = Date.Year;

                int DaysThisMonth = DateTime.DaysInMonth(Year, Month);
                decimal? SalaryPerDay = MonthlySalary / DaysThisMonth;
                decimal? SalaryPer30Min = (SalaryPerDay / 6) / 2;
                decimal? Deduction = 0;

                if (nLateComings > 0)
                {
                    Deduction = nLateComings * SalaryPer30Min;
                }

                // round to 2 decimal places
                return Math.Round(Deduction ?? 0, 2);
            }
        }

        public static decimal? CalculateEmpSalaryOnThisDay(DateTime Date, decimal? MonthlySalary, int? nLateComings)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                int Month = Date.Month;
                int Year = Date.Year;

                int DaysThisMonth = DateTime.DaysInMonth(Year, Month);
                decimal? SalaryPerDay = MonthlySalary / DaysThisMonth;
                decimal? SalaryPer30Min = (SalaryPerDay / 6) / 2;
                decimal? Deduction = 0;

                if (nLateComings > 0)
                {
                    Deduction = nLateComings * SalaryPer30Min;
                }

                // round to 2 decimal places
                return Math.Round(SalaryPerDay - Deduction ?? 0, 2);
            }
        }

        public static int SundaysInMonth(int month, int year)
        {
            DateTime firstDay = new DateTime(year, month, 1);
            int firstSundayOffset = ((int)DayOfWeek.Sunday - (int)firstDay.DayOfWeek + 7) % 7;
            int daysInMonth = DateTime.DaysInMonth(year, month);

            return ((daysInMonth - firstSundayOffset - 1) / 7) + 1;
        }


        public static int? GetMinutesDifference()
        {

            return 0;
        }

        public static int? CountLateComings(int? MinutesDifference)
        {
            if (MinutesDifference <= 0) return 0;

            return Math.Min((MinutesDifference.Value - 1) / 30 + 1, 7);
        }


        //public static int? CountLateComings(int? MinutesDifference)
        //{
        //    using (dbSchoolEntities db = new dbSchoolEntities())
        //    {
        //        if (MinutesDifference <= 0)
        //        {
        //            return 0;
        //        }
        //        if (MinutesDifference > 0 && MinutesDifference <= 30)
        //        {
        //            return 1;
        //        }
        //        else if (MinutesDifference > 30 && MinutesDifference <= 60)
        //        {
        //            return 2;
        //        }
        //        else if (MinutesDifference > 60 && MinutesDifference <= 90)
        //        {
        //            return 3;
        //        }
        //        else if (MinutesDifference > 90 && MinutesDifference <= 120)
        //        {
        //            return 4;
        //        }
        //        else if (MinutesDifference > 120 && MinutesDifference <= 150)
        //        {
        //            return 5;
        //        }
        //        else if (MinutesDifference > 150 && MinutesDifference <= 180)
        //        {
        //            return 6;
        //        }
        //        else if (MinutesDifference > 180 && MinutesDifference <= 210)
        //        {
        //            return 7;
        //        }
        //        else if (MinutesDifference > 210 && MinutesDifference <= 240)
        //        {
        //            return 7;
        //        }
        //        else if (MinutesDifference > 240 && MinutesDifference <= 270)
        //        {
        //            return 7;
        //        }
        //        else if (MinutesDifference > 270 && MinutesDifference <= 300)
        //        {
        //            return 7;
        //        }

        //        return 0;
        //    }
        //}

        #region GENERATE SALARY

        public static void GenerateAndSaveSalary(int? EmpID, int Month, int Year)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                if (EmpID == null) return;
                int daysInMonth = DateTime.DaysInMonth(Year, Month);
                var employeeWithDesignation = (from emp in db.tblEmployees
                                               join des in db.tblDesignations on emp.DesignationID equals des.ID
                                               where emp.ID == EmpID
                                               select new
                                               {
                                                   Employee = emp,
                                                   DesignationName = des.Designation,
                                                   SalaryPerDay = emp.Salary / daysInMonth
                                               }).FirstOrDefault();

                tblEmployee employee = employeeWithDesignation.Employee;

                if (employeeWithDesignation == null || employee == null) return;

                string designationName = employeeWithDesignation.DesignationName;

                // Retrieve all salary components for the employee for the given month and year
                var components = db.tblEmployeeSalaryComponents
                    .Where(x => x.EmpID == EmpID && x.Month == Month && x.Year == Year)
                    .ToList();

                // Sum up components based on their names
                decimal workingAndHolidaySalary = db.tblEmployeeAttendances
                                                    .Where(x => x.EmpID == EmpID && x.Date.HasValue
                                                        && x.Date.Value.Month == Month && x.Date.Value.Year == Year
                                                        && (x.Status == "P" || x.Status == "H"))
                                                    .Sum(x => x.TodaySalary) ?? 0m;

                workingAndHolidaySalary += GetSundaySalary(Month, Year, employee?.Salary);

                // Insert/Update Basic and WD Salary 
                UpsertSalaryComponent(employee.ID, Month, Year, SalaryComponentTypes.WorkingDaySalary, workingAndHolidaySalary);
                UpsertSalaryComponent(employee.ID, Month, Year, SalaryComponentTypes.BasicSalary, employee?.Salary ?? 0m);
                UpsertSalaryComponent(employee.ID, Month, Year, SalaryComponentTypes.TeaAllowance, SalaryComponentValues.TeaAllowanceValue);

                if (designationName == SpecialDesignations.Coordinator)
                {
                    UpsertSalaryComponent(employee.ID, Month, Year, SalaryComponentTypes.Bonus, employeeWithDesignation?.SalaryPerDay ?? 0);
                }

                decimal loan = components.FirstOrDefault(c => c.ComponentType == SalaryComponentTypes.Loan)?.Amount ?? 0m;
                decimal securityCharges = components.FirstOrDefault(c => c.ComponentType == SalaryComponentTypes.SecurityCharges)?.Amount ?? 0m;
                decimal bonus = components.FirstOrDefault(c => c.ComponentType == SalaryComponentTypes.Bonus)?.Amount ?? 0m;
                decimal teaAllowance = components.FirstOrDefault(c => c.ComponentType == SalaryComponentTypes.TeaAllowance)?.Amount ?? 0m;

                // Calculate final salary
                decimal netSalary = workingAndHolidaySalary + teaAllowance + bonus - loan - securityCharges;

                // Check if a salary record already exists
                var existingSalary = db.tblEmployeeSalaries.FirstOrDefault(x => x.EmpID == EmpID && x.Month == Month && x.Year == Year);

                // Update existing salary record
                if (existingSalary != null)
                {
                    existingSalary.BasicSalary = employee?.Salary;
                    existingSalary.NetSalary = netSalary;
                }
                else
                {
                    // Insert new salary record
                    db.tblEmployeeSalaries.Add(new tblEmployeeSalary()
                    {
                        EmpID = EmpID,
                        Month = Month,
                        Year = Year,
                        BasicSalary = employee?.Salary,
                        NetSalary = netSalary
                    });
                }

                db.SaveChanges();
            }
        }
        private static void UpsertSalaryComponent(int empID, int month, int year, string componentType, decimal amount)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                var component = db.tblEmployeeSalaryComponents
             .FirstOrDefault(x => x.EmpID == empID && x.Month == month && x.Year == year && x.ComponentType == componentType);

                if (component == null)
                {
                    db.tblEmployeeSalaryComponents.Add(new tblEmployeeSalaryComponent
                    {
                        EmpID = empID,
                        Month = month,
                        Year = year,
                        ComponentType = componentType,
                        Amount = amount
                    });
                }
                else
                {
                    component.Amount = amount;
                }
                db.SaveChanges();
            }
        }

        private static decimal GetSundaySalary(int Month, int Year, decimal? BasicSalary)
        {
            try
            {
                DateTime firstDay = new DateTime(Year, Month, 1);
                int daysInMonth = DateTime.DaysInMonth(Year, Month);

                // Count Sundays
                int totalSundays = Enumerable.Range(0, daysInMonth)
                    .Select(i => firstDay.AddDays(i))
                    .Count(date => date.DayOfWeek == DayOfWeek.Sunday);

                // Fetch PerDaySalary from tblEmployee
                decimal perDaySalary = (decimal)(BasicSalary / daysInMonth);

                // Final salary including Sundays
                decimal SalarySundays = totalSundays * perDaySalary;

                return Math.Round(SalarySundays, 0);
            }
            catch (Exception)
            {
                return 0;
            }
        }

        public static SalaryViewModel GetThisMonthSalary(int? DaysPresent, decimal? SalaryPerDay, decimal? LateDeduction, int Month, int Year)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                decimal? NetSalary = 0;

                int? DaysInMonth = DateTime.DaysInMonth(Year, Month);

                NetSalary = DaysPresent * SalaryPerDay;

                // Deduction

                NetSalary -= LateDeduction;

                return new SalaryViewModel()
                {
                    LateDeduction = LateDeduction,
                    NetSalary = NetSalary
                };
            }
        }


        #endregion


        public static decimal? GetSavedMonthlyBasicSalary(int? EmpID, int? Month, int? Year)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                var row = db.tblEmployeeSalaries.FirstOrDefault(x => x.EmpID == EmpID && x.Month == Month && x.Year == Year);

                return row?.BasicSalary ?? 0;
            }
        }
    }
}



//// Insert/update Working Day Salary into component table 
//var WorkingDaySalaryComponent = db.tblEmployeeSalaryComponents
//  .FirstOrDefault(x => x.EmpID == EmpID && x.Month == Month && x.Year == Year && x.ComponentType == SalaryComponentTypes.WorkingDaySalary);

//var basicSalaryComponent = db.tblEmployeeSalaryComponents
//  .FirstOrDefault(x => x.EmpID == EmpID && x.Month == Month && x.Year == Year && x.ComponentType == SalaryComponentTypes.WorkingDaySalary);

//if (WorkingDaySalaryComponent == null)
//{
//    db.tblEmployeeSalaryComponents.Add(new tblEmployeeSalaryComponent()
//    {
//        EmpID = employee?.ID,
//        Month = Month,
//        Year = Year,
//        ComponentType = SalaryComponentTypes.WorkingDaySalary,
//        Amount = workingAndHolidaySalary
//    });
//}
//else
//{
//    WorkingDaySalaryComponent.Amount = workingAndHolidaySalary;
//}

//if (basicSalaryComponent == null)
//{
//    db.tblEmployeeSalaryComponents.Add(new tblEmployeeSalaryComponent()
//    { EmpID = employee?.ID, Month = Month, Year = Year, ComponentType = SalaryComponentTypes.BasicSalary, Amount = workingAndHolidaySalary });

//}
//else
//{
//    WorkingDaySalaryComponent.Amount = employee?.Salary;
//}

