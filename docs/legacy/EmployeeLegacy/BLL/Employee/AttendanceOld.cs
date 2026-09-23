//using Data.DAL;
//using Data.Viewmodel;
//using System;
//using System.Collections.Generic;
//using System.Linq;
//using System.Text;

//namespace Data.BLL.Staff
//{
//    public class Attendance
//    {
//        // Get This Month attendance 
//        public static List<TeacherViewModel> lstAttendance(int Month, int Year)
//        {
//            var lst = new List<TeacherViewModel>();

//            using (dbSchoolEntities db = new dbSchoolEntities())
//            {
//                foreach (var item in Teachers.lstTeacher())
//                {
//                    var model = new TeacherViewModel();
//                    model.ID = item.ID;
//                    model.TeacherName = item.TeacherName;
//                    model.Salary = item.Salary;
//                    model.Attendance = new EmpAttendanceViewModel()
//                    {

//                    };

//                    lst.Add(model);
//                }
//            }

//            return lst;
//        }

//        public static string GetStatusOfThisDay(int? Day, int? Month, int? Year, int? EmpID)
//        {
//            using (dbSchoolEntities db = new dbSchoolEntities())
//            {
//                var find = db.tblTeacher_Attendance.Where(x => x.EmpID == EmpID && x.Day == Day && x.Month == Month && x.Year == Year).ToList();

//                if (find.Count > 0)
//                {
//                    if (!string.IsNullOrEmpty(find.First().CheckInTime))
//                    {
//                        return "Present";
//                    }
//                    return find.First().Status;
//                }

//                return "";
//            }
//        }

//        public static string GetCheckinTimeOfThisDay(int? Day, int? Month, int? Year, int? EmpID)
//        {
//            using (dbSchoolEntities db = new dbSchoolEntities())
//            {
//                var find = db.tblTeacher_Attendance.Where(x => x.EmpID == EmpID && x.Day == Day && x.Month == Month && x.Year == Year).ToList();

//                if (find.Count > 0)
//                {
//                    return find.First().CheckInTime;
//                }

//                return "";
//            }
//        }
//        // Save imported list to DB
//        public static void InsertImportedFileIntoDB(List<EmpAttendanceViewModel> lst)
//        {
//            using (dbSchoolEntities db = new dbSchoolEntities())
//            {
//                // Iterate through DB and check if item already exist or not
//                foreach (var item in lst)
//                {
//                    DateTime? Date = item.Date;
//                    int? EmpID = item.Emp_Id;

//                    tblTeacher_Attendance attendance = new tblTeacher_Attendance()
//                    {
//                        EmpID = item.Emp_Id,
//                        Date = item.Date,
//                        CheckInTime = item.CheckInTime,
//                        Day = item.Date.Value.Day,
//                        Month = item.Date.Value.Month,
//                        Year = item.Date.Value.Year,
//                        Status = "Present",
//                        DayOfWeek = item.Date.Value.DayOfWeek.ToString()
//                    };
//                    db.tblTeacher_Attendance.Add(attendance);
//                    db.SaveChanges();
//                }

//                var duplicates = lst.GroupBy(i => new { i.Emp_Id, i.Date.Value.Date }).Where(g => g.Count() > 1).Select(g => g.Key);

//                if (duplicates.Count() > 0)
//                {
//                    foreach (var item in duplicates)
//                    {
//                        tblTeacher_Attendance_InOut inout = new tblTeacher_Attendance_InOut()
//                        {
//                            Date = item.Date,
//                            EmpID = item.Emp_Id,
//                            Time = item.Date.ToShortTimeString()
//                        };
//                        db.tblTeacher_Attendance_InOut.Add(inout);
//                        db.SaveChanges();
//                    }
//                }
//            }
//        }

//        // Mark as Holiday
//        public static void MarkAsHoliday(int? Day, int? Month, int? Year)
//        {
//            using (dbSchoolEntities db = new dbSchoolEntities())
//            {
//                foreach (var item in Teachers.lstTeacher().Where(x => x.IsActive == true))
//                {
//                    tblTeacher_Attendance insert = new tblTeacher_Attendance()
//                    {
//                        EmpID = item.ID,
//                        Date = Convert.ToDateTime(Month.ToString() + "/" + Day.ToString() + "/" + Year.ToString()),
//                        Day = Day,
//                        Month = Month,
//                        Year = Year,
//                        Status = "Holiday"
//                    };
//                    db.tblTeacher_Attendance.Add(insert);
//                    db.SaveChanges();
//                }
//            }
//        }

//        // Mark as Leave
//        public static void MarkAsLeave(int? EmpID, int? Day, int? Month, int? Year)
//        {
//            using (dbSchoolEntities db = new dbSchoolEntities())
//            {
//                tblTeacher_Attendance insert = new tblTeacher_Attendance()
//                {
//                    EmpID = EmpID,
//                    Date = Convert.ToDateTime(Month.ToString() + "/" + Day.ToString() + "/" + Year.ToString()),
//                    Day = Day,
//                    Month = Month,
//                    Year = Year,
//                    Status = "Leave"
//                };
//                db.tblTeacher_Attendance.Add(insert);
//                db.SaveChanges();
//            }
//        }
//        // Calculate Number of late comings
//        public static int NumberOfLateComings(string CheckinTime)
//        {
//            string startTime = "8:00 AM";
//            string endTime = CheckinTime;

//            TimeSpan duration = DateTime.Parse(endTime).Subtract(DateTime.Parse(startTime));
//            int? Minuets = (int)duration.TotalMinutes;

//            if (Minuets > 0 && Minuets <= 15)
//            {
//                return 1;
//            }
//            else if (Minuets > 0 && Minuets <= 15)
//            {
//                return 1;
//            }
//            else if (Minuets > 15 && Minuets <= 30)
//            {
//                return 2;
//            }
//            else if (Minuets > 30 && Minuets <= 45)
//            {
//                return 3;
//            }
//            else if (Minuets > 45 && Minuets <= 60)
//            {
//                return 4;
//            }
//            else if (Minuets > 60 && Minuets <= 75)
//            {
//                return 5;
//            }
//            else if (Minuets > 90 && Minuets <= 105)
//            {
//                return 6;
//            }
//            else if (Minuets > 105 && Minuets <= 120)
//            {
//                return 7;
//            }

//            return 0;
//        }
//    }
//}
