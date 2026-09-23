using Data.DAL;
using Data.Viewmodel;
using Data.Viewmodel.Employee;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Data;
using System.Data.Entity;
using System.Globalization;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using static Data.BLL.DateFunctions;

namespace Data.BLL.Employee
{
    public class Attendance
    {
        public static List<EmployeeAttendanceViewModel> MonthlySummary(int month, int year)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                var EmployeeList = db.tblEmployees.Where(x => x.IsActive == true).ToList();

                var attendanceList = db.v_EmployeeAttendance
                    .Where(x => x.Month == month && x.Year == year)
                    .ToList();

                int daysInMonth = DateTime.DaysInMonth(year, month);
                var days = Enumerable.Range(1, daysInMonth).ToList();

                var result = EmployeeList.Select(emp =>
                {
                    var attendanceDict = new Dictionary<int, string>();
                    var changeJsonDict = new Dictionary<int, string>();
                    var lcDict = new Dictionary<int, int>();

                    foreach (var d in days)
                    {
                        var att = attendanceList.FirstOrDefault(a =>
                            a.EmployeeID == emp.ID &&
                            a.AttendanceDate.Value.Day == d &&
                            a.AttendanceDate.Value.Month == month &&
                            a.AttendanceDate.Value.Year == year);

                        if (att == null)
                        {
                            attendanceDict[d] = "A";
                            changeJsonDict[d] = null;
                            lcDict[d] = 0;
                            continue;
                        }

                        // ✅ Attendance display
                        if (att.Status == "P")
                        {
                            attendanceDict[d] = att.AttendanceTime ?? "P";
                        }
                        else if (att.Status == "L" || att.Status == "H")
                        {
                            attendanceDict[d] = att.Status;
                        }
                        else
                        {
                            attendanceDict[d] = "A";
                        }

                        // ✅ NEW: ChangeJson
                        changeJsonDict[d] = att.ChangeJson;

                        // ✅ NEW: LC
                        lcDict[d] = att.LateComings ?? 0;
                    }

                    return new EmployeeAttendanceViewModel
                    {
                        ID = emp.ID,
                        EmployeeName = emp.EmployeeName,
                        Attendance = attendanceDict,
                        ChangeJsonDict = changeJsonDict,
                        LateComingsDict = lcDict
                    };
                }).ToList();

                return result;
            }
        }

        public static List<v_EmployeeAttendance> List(int? Month, int? Year)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                return db.v_EmployeeAttendance.Where(x => x.Month == Month && x.Year == Year).ToList();
            }
        }
        public static List<v_EmployeeAttendance> List(int? EmpID, int? Month, int? Year)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                return db.v_EmployeeAttendance.Where(x => x.EmployeeID == EmpID && x.Month == Month && x.Year == Year).ToList();
            }
        }
        public static List<v_EmployeeAttendance> EmployeeListByMonth(int? Month, int? Year)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                var lst = db.v_EmployeeAttendance.Where(x => x.Month == Month && x.Year == Year).ToList();
                var lstDistinct = lst.GroupBy(i => i.EmployeeID).Select(group => group.FirstOrDefault());

                return lstDistinct.ToList();
            }
        }
        public static void ImportFromFile(DataTable DT)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                if (DT.Rows.Count > 0)
                {
                    MarkAbsentAutomatically(Convert.ToDateTime(DT.Rows[1][1]).Month, Convert.ToDateTime(DT.Rows[1][1]).Year);

                    var empCodes = new HashSet<string>();
                    for (int i = 0; i < DT.Rows.Count; i++)
                    {
                        var code = Convert.ToString(DT.Rows[i][0]);
                        if (!string.IsNullOrWhiteSpace(code))
                        {
                            empCodes.Add(code);
                        }
                    }

                    var employeeLookup = db.tblEmployees
                        .Where(x => empCodes.Contains(x.Thumb_ID))
                        .ToDictionary(x => x.Thumb_ID, x => x);

                    var designationIds = employeeLookup.Values
                        .Where(x => x.DesignationID.HasValue)
                        .Select(x => x.DesignationID.Value)
                        .Distinct()
                        .ToList();

                    var designationDefaults = db.tblDesignations
                        .Where(x => designationIds.Contains(x.ID))
                        .ToDictionary(x => x.ID, x => x);

                    var designationTimingLookup = db.tblDesignationTimings
                        .Where(x => designationIds.Contains(x.DesignationID) && x.IsActive)
                        .OrderByDescending(x => x.EffectiveFromDate)
                        .ToList()
                        .GroupBy(x => x.DesignationID)
                        .ToDictionary(g => g.Key, g => g.ToList());

                    var resolvedTimingCache = new Dictionary<string, DefaultTimeViewModel>();

                    for (int i = 0; i < DT.Rows.Count; i++)
                    {
                        string EmpCode = Convert.ToString(DT.Rows[i][0]);
                        DateTime? Date = Convert.ToDateTime(DT.Rows[i][1]);
                        string Time = Date.Value.ToShortTimeString();
                        //var Diff = GetTimeDifference(1, new DateTime(2020, 1, 1, Date.Value.Hour, Date.Value.Minute, 0));

                        if (!employeeLookup.TryGetValue(EmpCode, out var EMP))
                        {
                            continue;
                        }

                        var DefaultTime = ResolveDefaultTimeByDesignation(
                            EMP.DesignationID,
                            Date.Value.Date,
                            designationTimingLookup,
                            designationDefaults,
                            resolvedTimingCache);

                        var DefaultCheckinTime = DefaultTime.DefaultCheckinTime;
                        var DefaultCheckoutTime = DefaultTime.DefaultCheckoutTime;

                        if (EMP != null && DefaultCheckinTime != null)
                        {
                            int EmpID = EMP.ID;
                            int sDay = Date.Value.Day;
                            int sMonth = Date.Value.Month;
                            int sYear = Date.Value.Year;

                            int sHour = DefaultCheckinTime.Value.Hour;
                            int sMinute = DefaultCheckinTime.Value.Minute;

                            var StartDate = new DateTime(sYear, sMonth, sDay, sHour, sMinute, 0);
                            var EndDate = Date;

                            var SPAN = EndDate - StartDate;
                            var MinutesDiff = SPAN.Value.TotalMinutes;

                            int? LC = Salary.CountLateComings(Convert.ToInt32(MinutesDiff));

                            var check = db.tblEmployeeAttendances.Where(x => x.EmpID == EmpID && DbFunctions.TruncateTime(x.Date) == DbFunctions.TruncateTime(Date)).FirstOrDefault();

                            decimal? CurrentSalary = check == null ? EMP.Salary : check.CurrentSalary;
                            CurrentSalary = CurrentSalary != null ? Math.Round(CurrentSalary.Value, 2) : CurrentSalary;

                            decimal? LateDeduction = Salary.GetLateDeductionOnThisDay(Date.Value, CurrentSalary, LC);
                            LateDeduction = LateDeduction != null ? Math.Round(LateDeduction.Value, 2) : LateDeduction;

                            decimal? TodaySalary = Salary.CalculateEmpSalaryOnThisDay(Date.Value, CurrentSalary, LC);
                            TodaySalary = TodaySalary != null ? Math.Round(TodaySalary.Value, 2) : TodaySalary;

                            if (check == null)
                            {
                                tblEmployeeAttendance att = new tblEmployeeAttendance()
                                {
                                    EmpID = EmpID,
                                    Date = Date,
                                    Time = Time,
                                    LateComings = LC,
                                    CurrentSalary = EMP.Salary,
                                    LateDeduction = LateDeduction,
                                    TodaySalary = TodaySalary,
                                    Status = "P",
                                };
                                db.tblEmployeeAttendances.Add(att);
                                db.SaveChanges();
                            }
                            else
                            {
                                //check.EmpID = EmpID;
                                check.Date = Date;
                                check.Time = Time;
                                check.LateComings = LC;
                                check.LateDeduction = LateDeduction;
                                check.TodaySalary = TodaySalary;
                                check.Status = "P";
                                db.SaveChanges();
                            }
                        }
                    }

                }
            }
        }

        //public static void ImportFromExcelFile(List<ImportAttendanceViewModel> lstAttendance)
        //{
        //    using (dbSchoolEntities db = new dbSchoolEntities())
        //    {
        //        if (lstAttendance.Count > 0)
        //        {
        //            // MarkAbsentAutomatically(Convert.ToDateTime(DT.Rows[1][1]).Month, Convert.ToDateTime(DT.Rows[1][1]).Year);

        //            foreach (var item in lstAttendance)
        //            {
        //                string EmpCode = Convert.ToString(item.EmpCode);
        //                string Time = item.CheckInTime;
        //                //var Diff = GetTimeDifference(1, new DateTime(2020, 1, 1, Date.Value.Hour, Date.Value.Minute, 0));

        //                var DefaultTime = GetDefaultCheckinTime(EmpCode);
        //                var DefaultCheckinTime = DefaultTime.DefaultCheckinTime;
        //                var DefaultCheckoutTime = DefaultTime.DefaultCheckoutTime;

        //                var EMP = db.tblEmployees.Where(x => x.Thumb_ID == EmpCode).FirstOrDefault();

        //                if (EMP != null && item.Date != null)
        //                {
        //                    int EmpID = EMP.ID;
        //                    DateTime? Date = Convert.ToDateTime(item.Date);

        //                    int sDay = Date.Value.Day;
        //                    int sMonth = Date.Value.Month;
        //                    int sYear = Date.Value.Year;

        //                    int sHour = DefaultCheckinTime.Value.Hour;
        //                    int sMinute = DefaultCheckinTime.Value.Minute;

        //                    int eHour = Date.Value.Hour;
        //                    int eMinute = Date.Value.Minute;

        //                    var StartDate = new DateTime(sYear, sMonth, sDay, sHour, sMinute, 0);
        //                    var EndDate = new DateTime(sYear, sMonth, sDay, eHour, eMinute, 0);

        //                    var SPAN = EndDate - StartDate;
        //                    var MinutesDiff = SPAN.TotalMinutes;

        //                    int? LC = Salary.CountLateComings(Convert.ToInt32(MinutesDiff));

        //                    if (EmpID == 2)
        //                    {
        //                        int i = 0;
        //                    }

        //                    var check = db.tblEmployeeAttendances.Where(x => x.EmpID == EmpID && DbFunctions.TruncateTime(x.Date) == DbFunctions.TruncateTime(Date)).FirstOrDefault();

        //                    decimal? CurrentSalary = check == null || (sMonth == DateTime.Now.Month && sYear == DateTime.Now.Year)
        //                                            ? EMP.Salary
        //                                            : check.CurrentSalary;

        //                    CurrentSalary = CurrentSalary != null ? Math.Round(CurrentSalary.Value, 2) : CurrentSalary;

        //                    decimal? LateDeduction = Salary.GetLateDeductionOnThisDay(Date.Value, CurrentSalary, LC);
        //                    LateDeduction = LateDeduction != null ? Math.Round(LateDeduction.Value, 2) : LateDeduction;

        //                    decimal? TodaySalary = Salary.CalculateEmpSalaryOnThisDay(Date.Value, CurrentSalary, LC);
        //                    TodaySalary = TodaySalary != null ? Math.Round(TodaySalary.Value, 2) : TodaySalary;

        //                    if (check == null)
        //                    {
        //                        tblEmployeeAttendance att = new tblEmployeeAttendance()
        //                        {
        //                            EmpID = EmpID,
        //                            Date = Date,
        //                            Time = Time,
        //                            LateComings = LC,
        //                            CurrentSalary = CurrentSalary,
        //                            LateDeduction = LateDeduction,
        //                            TodaySalary = TodaySalary,
        //                            Status = "P",
        //                        };
        //                        db.tblEmployeeAttendances.Add(att);
        //                        db.SaveChanges();
        //                    }
        //                    else
        //                    {
        //                        check.Date = Date;
        //                        check.Time = Time;
        //                        check.LateComings = LC;
        //                        check.LateDeduction = LateDeduction;
        //                        check.CurrentSalary = CurrentSalary;
        //                        check.TodaySalary = TodaySalary;
        //                        check.Status = "P";
        //                        db.SaveChanges();
        //                    }
        //                }
        //            }

        //        }
        //    }
        //}

        public static void ImportFromExcelFile(List<ImportAttendanceViewModel> lstAttendance)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                if (lstAttendance.Count > 0)
                {
                    var empCodes = lstAttendance
                        .Where(x => !string.IsNullOrWhiteSpace(x.EmpCode))
                        .Select(x => x.EmpCode)
                        .Distinct()
                        .ToList();

                    var employeeLookup = db.tblEmployees
                        .Where(x => empCodes.Contains(x.Thumb_ID))
                        .ToDictionary(x => x.Thumb_ID, x => x);

                    var designationIds = employeeLookup.Values
                        .Where(x => x.DesignationID.HasValue)
                        .Select(x => x.DesignationID.Value)
                        .Distinct()
                        .ToList();

                    var designationDefaults = db.tblDesignations
                        .Where(x => designationIds.Contains(x.ID))
                        .ToDictionary(x => x.ID, x => x);

                    var designationTimingLookup = db.tblDesignationTimings
                        .Where(x => designationIds.Contains(x.DesignationID) && x.IsActive)
                        .OrderByDescending(x => x.EffectiveFromDate)
                        .ToList()
                        .GroupBy(x => x.DesignationID)
                        .ToDictionary(g => g.Key, g => g.ToList());

                    var resolvedTimingCache = new Dictionary<string, DefaultTimeViewModel>();

                    foreach (var item in lstAttendance)
                    {
                        string EmpCode = Convert.ToString(item.EmpCode);
                        string Time = item.CheckInTime;

                        if (!employeeLookup.TryGetValue(EmpCode, out var EMP))
                        {
                            continue;
                        }

                        if (item.Date == null)
                        {
                            continue;
                        }

                        DateTime Date = Convert.ToDateTime(item.Date);

                        var DefaultTime = ResolveDefaultTimeByDesignation(
                            EMP.DesignationID,
                            Date.Date,
                            designationTimingLookup,
                            designationDefaults,
                            resolvedTimingCache);

                        var DefaultCheckinTime = DefaultTime.DefaultCheckinTime;
                        var DefaultCheckoutTime = DefaultTime.DefaultCheckoutTime;

                        if (EMP != null && DefaultCheckinTime != null && DefaultCheckoutTime != null)
                        {
                            int EmpID = EMP.ID;

                            int sDay = Date.Day;
                            int sMonth = Date.Month;
                            int sYear = Date.Year;

                            // Parse actual times
                            DateTime? actualCheckIn = null;
                            DateTime? actualCheckOut = null;

                            if (!string.IsNullOrWhiteSpace(item.CheckInTime))
                                actualCheckIn = DateTime.Parse($"{Date:yyyy-MM-dd} {item.CheckInTime}");

                            if (!string.IsNullOrWhiteSpace(item.CheckOutTime))
                                actualCheckOut = DateTime.Parse($"{Date:yyyy-MM-dd} {item.CheckOutTime}");

                            // Default times
                            var defaultCheckIn = new DateTime(Date.Year, Date.Month, Date.Day,
                                DefaultCheckinTime.Value.Hour,
                                DefaultCheckinTime.Value.Minute, 0);

                            var defaultCheckOut = new DateTime(Date.Year, Date.Month, Date.Day,
                                DefaultCheckoutTime.Value.Hour,
                                DefaultCheckoutTime.Value.Minute, 0);

                            // --- Heuristic for single punch ---
                            string ruleApplied = "Direct";

                            if (actualCheckIn == null && actualCheckOut != null)
                            {
                                // Only OUT exists → treat as CO
                                ruleApplied = "OnlyCheckout";
                            }
                            else if (actualCheckIn != null && actualCheckOut == null)
                            {
                                // Only IN exists → treat as CI
                                ruleApplied = "OnlyCheckin";
                            }

                            // --- Calculations ---
                            double lateMinutes = 0;
                            if (actualCheckIn != null && actualCheckIn > defaultCheckIn)
                            {
                                lateMinutes = (actualCheckIn.Value - defaultCheckIn).TotalMinutes;
                            }

                            double earlyMinutes = 0;
                            if (actualCheckOut != null && actualCheckOut < defaultCheckOut)
                            {
                                earlyMinutes = (defaultCheckOut - actualCheckOut.Value).TotalMinutes;
                            }

                            double totalMinutes = lateMinutes + earlyMinutes;

                            int? LC = Salary.CountLateComings((int)Math.Floor(totalMinutes));

                            // --- Existing Logic (UNCHANGED) ---

                            var check = db.tblEmployeeAttendances
                                .Where(x => x.EmpID == EmpID && DbFunctions.TruncateTime(x.Date) == DbFunctions.TruncateTime(Date))
                                .FirstOrDefault();

                            decimal? CurrentSalary = check == null || (sMonth == DateTime.Now.Month && sYear == DateTime.Now.Year)
                                                    ? EMP.Salary
                                                    : check.CurrentSalary;

                            CurrentSalary = CurrentSalary != null ? Math.Round(CurrentSalary.Value, 2) : CurrentSalary;

                            decimal? LateDeduction = Salary.GetLateDeductionOnThisDay(Date, CurrentSalary, LC);
                            LateDeduction = LateDeduction != null ? Math.Round(LateDeduction.Value, 2) : LateDeduction;

                            decimal? TodaySalary = Salary.CalculateEmpSalaryOnThisDay(Date, CurrentSalary, LC);
                            TodaySalary = TodaySalary != null ? Math.Round(TodaySalary.Value, 2) : TodaySalary;

                            string changeJson = JsonConvert.SerializeObject(new
                            {
                                Source = "Import",
                                UpdatedAt = DateFunctions.AdjustedDate().ToString("yyyy-MM-dd HH:mm:ss"),

                                Raw = new
                                {
                                    item.CheckInTime,
                                    item.CheckOutTime
                                },

                                Interpreted = new
                                {
                                    actualCheckIn,
                                    actualCheckOut,
                                    ruleApplied
                                },

                                Calculation = new
                                {
                                    lateMinutes,
                                    earlyMinutes,
                                    totalMinutes,
                                    LC
                                },

                                Salary = new
                                {
                                    CurrentSalary,
                                    LateDeduction,
                                    TodaySalary
                                }
                            });

                            if (check == null)
                            {
                                tblEmployeeAttendance att = new tblEmployeeAttendance()
                                {
                                    EmpID = EmpID,
                                    Date = Date,
                                    Time = Time,
                                    CheckOutTime = actualCheckOut,
                                    LateComings = LC,
                                    CurrentSalary = CurrentSalary,
                                    LateDeduction = LateDeduction,
                                    TodaySalary = TodaySalary,
                                    Status = "P",
                                    ChangeJson = changeJson
                                };
                                db.tblEmployeeAttendances.Add(att);
                                db.SaveChanges();
                            }
                            else
                            {
                                check.Date = Date;
                                check.CheckOutTime = actualCheckOut;
                                check.Time = Time;
                                check.LateComings = LC;
                                check.LateDeduction = LateDeduction;
                                check.CurrentSalary = CurrentSalary;
                                check.TodaySalary = TodaySalary;
                                check.Status = "P";
                                check.ChangeJson = changeJson;
                                db.SaveChanges();
                            }
                        }
                    }
                }
            }
        }

        public static void MarkAbsentAutomatically(int? Month, int? Year)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                var lstEmp = db.tblEmployees.Where(x => x.IsActive == true).ToList();
                foreach (var item in lstEmp)
                {
                    if (lstEmp.Count > 0)
                    {
                        int DaysInMonth = DateTime.DaysInMonth(Year.Value, Month.Value);
                        for (int i = 1; i <= DaysInMonth; i++)
                        {
                            DateTime iDate = new DateTime(Year.Value, Month.Value, i);
                            var chk = db.v_EmployeeAttendance.Where(x => x.Month == Month && x.Year == Year && x.EmployeeID == item.ID && DbFunctions.TruncateTime(x.AttendanceDate) == iDate).FirstOrDefault();
                            if (chk == null)
                            {
                                string DayOfWeek = iDate.DayOfWeek.ToString();
                                tblEmployeeAttendance att = new tblEmployeeAttendance()
                                {
                                    EmpID = item.ID,
                                    Date = iDate,
                                    Time = string.Empty,
                                    LateComings = 0,
                                    CurrentSalary = item.Salary,
                                    LateDeduction = 0
                                };
                                if (DayOfWeek == "Sunday")
                                {
                                    double? TodaySalary = (double?)Math.Round(item.Salary.Value / DaysInMonth, 2);
                                    att.TodaySalary = (decimal?)TodaySalary;
                                    att.Status = "H";
                                }
                                else
                                {
                                    att.TodaySalary = 0;
                                    att.Status = "A";
                                }
                                db.tblEmployeeAttendances.Add(att);
                                db.SaveChanges();
                            }
                        }
                    }

                }
            }
        }

        public static string GetStatusOfThisDay(int? Day, int? Month, int? Year, string ThumbID)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                var row = db.v_EmployeeAttendance.Where(x => x.Thumb_ID == ThumbID && x.AttendanceDate.Value.Day == Day && x.AttendanceDate.Value.Month == Month && x.AttendanceDate.Value.Year == Year).FirstOrDefault();

                if (row != null)
                {
                    return row.Status;
                }

                var Date = new DateTime(Year.Value, Month.Value, Day.Value);

                if (Date < DateTime.Now.Date)
                {
                    return "A";
                }

                return "";
            }
        }

        public static tblEmployeeAttendance GetRow(int id)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                return db.tblEmployeeAttendances.FirstOrDefault(x => x.ID == id);
            }
        }

        //public static void ForceEditAttendance(EmployeeAttendanceViewModel model)
        //{
        //    try
        //    {
        //        using (dbSchoolEntities db = new dbSchoolEntities())
        //        {
        //            var row = db.tblEmployeeAttendances.FirstOrDefault(x => x.ID == model.ID);
        //            if (row != null)
        //            {
        //                // Create "before" snapshot
        //                var before = new
        //                {
        //                    row.LateComings,
        //                    row.LateDeduction,
        //                    row.TodaySalary
        //                };

        //                // Apply changes
        //                row.LateComings = model.LateComings;
        //                row.LateDeduction = model.LateDeduction;
        //                row.TodaySalary = model.TodaySalary;
        //                row.UpdatedBy = model.UpdatedBy;

        //                // Create "after" snapshot
        //                var after = new
        //                {
        //                    row.LateComings,
        //                    row.LateDeduction,
        //                    row.TodaySalary
        //                };

        //                // Store change log as JSON
        //                row.ChangeJson = JsonConvert.SerializeObject(new
        //                {
        //                    UpdatedBy = model.UpdatedBy,
        //                    UpdatedAt =  DateFunctions.AdjustedDate().ToString("yyyy-MM-dd HH:mm:ss"),
        //                    Before = before, After = after });

        //                db.SaveChanges();
        //            }
        //        }
        //    }
        //    catch (Exception ex)
        //    {
        //        throw;
        //    }
        //}

        public static void ForceEditAttendance(EmployeeAttendanceViewModel model)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                var row = db.tblEmployeeAttendances.FirstOrDefault(x => x.ID == model.ID);
                if (row == null) return;

                var emp = db.tblEmployees.FirstOrDefault(x => x.ID == row.EmpID);
                if (emp == null) return;

                var defaultTime = GetDefaultCheckinTime(emp.Thumb_ID, row.Date?.Date);

                // --- BEFORE SNAPSHOT ---
                var before = new
                {
                    row.Time,
                    row.CheckOutTime,
                    row.LateComings,
                    row.LateDeduction,
                    row.TodaySalary
                };

                // --- APPLY NEW TIMES ---
                DateTime date = row.Date.Value;

                DateTime? actualCheckIn = null;
                DateTime? actualCheckOut = null;

                // --- Parse Check-In (HH:mm) ---
                if (!string.IsNullOrWhiteSpace(model.CheckInTime))
                {
                    if (TimeSpan.TryParse(model.CheckInTime, out TimeSpan ci))
                    {
                        actualCheckIn = date.Date.Add(ci);
                        row.Time = model.CheckInTime; // store as "HH:mm"
                    }
                    else
                    {
                        throw new Exception("Invalid Check-In time format");
                    }
                }
                else
                {
                    row.Time = null;
                }

                // --- Parse Check-Out (HH:mm) ---
                if (!string.IsNullOrWhiteSpace(model.CheckOutTime))
                {
                    if (TimeSpan.TryParse(model.CheckOutTime, out TimeSpan co))
                    {
                        actualCheckOut = date.Date.Add(co);
                        row.CheckOutTime = actualCheckOut;  
                    }
                    else
                    {
                        throw new Exception("Invalid Check-Out time format");
                    }
                }
                else
                {
                    row.CheckOutTime = null;
                }

                // --- DEFAULT TIMES ---
                var defaultCheckIn = new DateTime(date.Year, date.Month, date.Day,
                    defaultTime.DefaultCheckinTime.Value.Hour,
                    defaultTime.DefaultCheckinTime.Value.Minute, 0);

                var defaultCheckOut = new DateTime(date.Year, date.Month, date.Day,
                    defaultTime.DefaultCheckoutTime.Value.Hour,
                    defaultTime.DefaultCheckoutTime.Value.Minute, 0);

                // --- RECALCULATE ---
                double lateMinutes = 0;
                if (actualCheckIn.HasValue)
                {
                    lateMinutes = Math.Max(0, (actualCheckIn.Value - defaultCheckIn).TotalMinutes);
                }

                double earlyMinutes = 0;
                if (actualCheckOut.HasValue)
                {
                    earlyMinutes = Math.Max(0, (defaultCheckOut - actualCheckOut.Value).TotalMinutes);
                }

                // only positive deviations counted
                double totalMinutes = lateMinutes + earlyMinutes;

                int? LC = Salary.CountLateComings((int)Math.Floor(totalMinutes));

                decimal? CurrentSalary = row.CurrentSalary;

                decimal? LateDeduction = Salary.GetLateDeductionOnThisDay(date, CurrentSalary, LC);
                decimal? TodaySalary = Salary.CalculateEmpSalaryOnThisDay(date, CurrentSalary, LC);

                // --- APPLY DERIVED VALUES ---
                row.LateComings = LC;
                row.LateDeduction = LateDeduction;
                row.TodaySalary = TodaySalary;
                row.UpdatedBy = model.UpdatedBy;

                // --- AFTER SNAPSHOT ---
                var after = new
                {
                    row.Time,
                    row.CheckOutTime,
                    row.LateComings,
                    row.LateDeduction,
                    row.TodaySalary,
                    lateMinutes,
                    earlyMinutes,
                    totalMinutes
                };

                // --- LOG (IMPORTANT: NEW STRUCTURE) ---
                row.ChangeJson = JsonConvert.SerializeObject(new
                {
                    Source = "ManualEdit",
                    UpdatedBy = model.UpdatedBy,
                    UpdatedAt = DateFunctions.AdjustedDate().ToString("yyyy-MM-dd HH:mm:ss"),
                    Before = before,
                    After = after,
                    Calculation = new
                    {
                        lateMinutes,
                        earlyMinutes,
                        totalMinutes,
                        LC
                    }
                });

                db.SaveChanges();
            }
        }

        public static void ForceMarkPresent(EmployeeAttendanceViewModel model)
        {
            try
            {
                using (dbSchoolEntities db = new dbSchoolEntities())
                {
                    // Use DbFunctions.TruncateTime to compare only the date part of x.Date
                    var row = db.tblEmployeeAttendances.FirstOrDefault(x => x.EmpID == model.EmpID 
                                                && DbFunctions.TruncateTime(x.Date) == DbFunctions.TruncateTime(model.Date.Value));

                    if (row == null)
                    {
                        model.LateComings = 0;
                        model.LateDeduction = 0;

                        var emp = db.tblEmployees.Find(model.EmpID);
                        int DaysThisMonth = DateTime.DaysInMonth(model.Date.Value.Year, model.Date.Value.Month);
                        decimal? SalaryPerDay = emp.Salary / DaysThisMonth;
                        SalaryPerDay = Math.Round(SalaryPerDay.Value, 2);

                        tblEmployeeAttendance att = new tblEmployeeAttendance()
                        {
                            EmpID = model.EmpID,
                            Date = model.Date,
                            Time = string.Empty,
                            LateComings = model.LateComings,
                            CurrentSalary = emp.Salary,
                            LateDeduction = model.LateDeduction,
                            TodaySalary = SalaryPerDay,
                            Status = "P",
                            ChangeJson = JsonConvert.SerializeObject(new
                            {
                                UpdatedBy = model.UpdatedBy,
                                UpdatedAt = DateFunctions.AdjustedDate().ToString("yyyy-MM-dd HH:mm:ss"),
                                Before = (object)null,
                                After = new
                                {
                                    model.LateComings,
                                    model.LateDeduction,
                                    model.TodaySalary
                                }
                            })
                        };

                        db.tblEmployeeAttendances.Add(att);
                        db.SaveChanges();
                    }
                }
            }
            catch (Exception ex)
            {
                // Log or rethrow the exception as needed
                throw;
            }
        }


        public static double GetTimeDifference(string EmpCode, DateTime? CheckInTime)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                var Emp = db.tblEmployees.Where(x => x.Thumb_ID == EmpCode).FirstOrDefault();
                if (Emp != null)
                {
                    int? DesigID = Emp.DesignationID;
                    var effectiveTimes = Designations.GetEffectiveTimes(DesigID ?? 0, CheckInTime?.Date);
                    if (!effectiveTimes.Item1.HasValue || !CheckInTime.HasValue)
                    {
                        return 0;
                    }

                    DateTime STANDARD_CHECKIN_TIME = effectiveTimes.Item1.Value;
                    DateTime? param_time = new DateTime(2020, 1, 1, STANDARD_CHECKIN_TIME.Hour, STANDARD_CHECKIN_TIME.Minute, 0);
                    DateTime? checkin_time = new DateTime(2020, 1, 1, CheckInTime.Value.Hour, CheckInTime.Value.Minute, 0);
                    TimeSpan? ts = CheckInTime - param_time;

                    return ts.Value.TotalMinutes;
                }
                return 0;
            }
        }

        public static DefaultTimeViewModel GetDefaultCheckinTime(string EmpCode, DateTime? onDate = null)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                var Emp = db.tblEmployees.Where(x => x.Thumb_ID == EmpCode).FirstOrDefault();
                if (Emp != null)
                {
                    var DesignationID = Emp.DesignationID;
                    var effectiveTimes = Designations.GetEffectiveTimes(DesignationID ?? 0, onDate ?? DateTime.Today);
                    if (effectiveTimes != null)
                    {
                        return new DefaultTimeViewModel
                        {
                            DefaultCheckinTime = effectiveTimes.Item1,
                            DefaultCheckoutTime = effectiveTimes.Item2
                        };
                    }
                }
                return new DefaultTimeViewModel();
            }
        }

        private static DefaultTimeViewModel ResolveDefaultTimeByDesignation(
            int? designationID,
            DateTime attendanceDate,
            Dictionary<int, List<tblDesignationTiming>> designationTimingLookup,
            Dictionary<int, tblDesignation> designationDefaults,
            Dictionary<string, DefaultTimeViewModel> resolvedTimingCache)
        {
            if (!designationID.HasValue)
            {
                return new DefaultTimeViewModel();
            }

            var cacheKey = designationID.Value + "|" + attendanceDate.ToString("yyyyMMdd");
            if (resolvedTimingCache.TryGetValue(cacheKey, out var cached))
            {
                return cached;
            }

            DefaultTimeViewModel resolved = new DefaultTimeViewModel();

            if (designationTimingLookup.TryGetValue(designationID.Value, out var timings) && timings != null)
            {
                var timing = timings.FirstOrDefault(x => x.EffectiveFromDate.Date <= attendanceDate.Date);
                if (timing != null)
                {
                    resolved = new DefaultTimeViewModel
                    {
                        DefaultCheckinTime = attendanceDate.Date.Add(timing.CheckInTime),
                        DefaultCheckoutTime = attendanceDate.Date.Add(timing.CheckOutTime)
                    };
                }
            }

            if (resolved.DefaultCheckinTime == null || resolved.DefaultCheckoutTime == null)
            {
                if (designationDefaults.TryGetValue(designationID.Value, out var designation))
                {
                    resolved = new DefaultTimeViewModel
                    {
                        DefaultCheckinTime = designation.MustCheckinTime,
                        DefaultCheckoutTime = designation.LeavingTime
                    };
                }
            }

            resolvedTimingCache[cacheKey] = resolved;
            return resolved;
        }

        public static int CountByStatus(int? Month, int? Year, int? EmpID, string Status)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                var lst = db.v_EmployeeAttendance.Where(x => x.EmployeeID == EmpID && x.AttendanceDate.Value.Month == Month && x.AttendanceDate.Value.Year == Year && x.Status == Status).ToList();
                var Distinct = lst.GroupBy(i => i.AttendanceDate.Value.Date).Select(group => group.First());
                return Distinct.Count();
            }
        }

        public static void MarkDayAsHoliday(DateTime Date)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                if (Date != null)
                {
                    var lstEmp = db.tblEmployees.Where(x => x.IsActive == true).ToList();
                    foreach (var item in lstEmp)
                    {
                        int DaysThisMonth = DateTime.DaysInMonth(Date.Year, Date.Month);
                        decimal? SalaryPerDay = item.Salary / DaysThisMonth;
                        SalaryPerDay = Math.Round(SalaryPerDay.Value, 2);
                        if (lstEmp.Count > 0)
                        {
                            var chk = db.tblEmployeeAttendances.Where(x => x.EmpID == item.ID && x.Date == Date).FirstOrDefault();
                            if (chk == null)
                            {
                                tblEmployeeAttendance att = new tblEmployeeAttendance()
                                {
                                    EmpID = item.ID,
                                    Date = Date,
                                    Time = string.Empty,
                                    LateComings = 0,
                                    CurrentSalary = item.Salary,
                                    LateDeduction = 0,
                                    TodaySalary = SalaryPerDay,
                                    Status = "H",
                                };
                                db.tblEmployeeAttendances.Add(att);
                                db.SaveChanges();
                            }
                            else
                            {
                                chk.Time = string.Empty;
                                chk.LateComings = 0;
                                chk.LateDeduction = 0;
                                chk.TodaySalary = SalaryPerDay;
                                chk.Status = "H";
                                db.SaveChanges();
                            }
                        }
                    }
                }
            }
        }
        //public static string GetCheckinTimeOfThisDay(int? Day, int? Month, int? Year, int? ThumbID)
        //{
        //    using (dbSchoolEntities db = new dbSchoolEntities())
        //    {
        //        var row = db.v_EmployeeAttendance.Where(x => x.EmployeeID == ThumbID && x.AttendanceDate.Value.Day == Day && x.AttendanceDate.Value.Month == Month && x.AttendanceDate.Value.Year == Year).FirstOrDefault();

        //        if (row != null)
        //        {
        //            return row.AttendanceTime;
        //        }

        //        return "";
        //    }
        //}

    }
}
