using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;
using System.Data;
using Data.Viewmodel;
using Data.BLL;
using Data.BLL.Employee;
using System.IO;
using ClosedXML.Excel;
using Data.DAL;

namespace Student.Areas.Employee.Controllers
{
    public class AttendanceController : Controller
    {
        // GET: Staff/Attendance
        public ActionResult Index(int? m, int? y)
        {
            ViewBag.m = m;
            ViewBag.y = y;

            return View();
        }
        public ActionResult _Edit(int id, int? EmpID, DateTime? date)
        {
            tblEmployeeAttendance row = new tblEmployeeAttendance();

            if (id == 0 && date.HasValue)
            {
                row.Status = "A";
                row.Date = date;
                row.LateComings = 0;
                row.LateDeduction = 0;
                row.TodaySalary = 0;
                //row.MonthlySalary = Salary.GetSavedMonthlyBasicSalary(EmpID, date.Value.Month, date.Value.Year);
            }
            else
            {
                row = Data.BLL.Employee.Attendance.GetRow(id);
            }

            return PartialView(row);
        }
        [HttpPost]
        public ActionResult ForceEdit(EmployeeAttendanceViewModel model)
        {
            model.UpdatedBy = Session["user"]?.ToString();
            Data.BLL.Employee.Attendance.ForceEditAttendance(model);

            return Json(new { msg = "success" });
        }
        [HttpPost]
        public ActionResult ForceMarkPresent(EmployeeAttendanceViewModel model)
        {
            model.UpdatedBy = Session["user"]?.ToString();
            Data.BLL.Employee.Attendance.ForceMarkPresent(model);

            return Json(new { msg = "success" });
        }

        /////////////////// IMPORT START ////////////////////////
        #region Search Attendance
        public ActionResult Search()
        {
            return View();
        }
        public ActionResult _Search(int month, int year)
        {
            ViewBag.m = month;
            ViewBag.y = year;

            var lst = Data.BLL.Employee.Attendance.MonthlySummary(month, year);

            return PartialView(lst);
        }

        #endregion

        public ActionResult Import()
        {
            return View();
        }
        [HttpPost]
        public ActionResult ImportData(HttpPostedFileBase UploadedFile)
        {
            //Get the file name 
            var pic = "004" + Path.GetFileName(UploadedFile.FileName);
            //Get the folder in the server
            var imagesDir = System.Web.HttpContext.Current.Server.MapPath("~/Uploads/");
            var imgPath = imagesDir + pic;
            UploadedFile.SaveAs((imgPath));

            // Import and save to DB
            string path = Server.MapPath("~/Uploads/" + pic);
            DataTable dt = ConvertToDataTable(path);

            Data.BLL.Employee.Attendance.ImportFromFile(dt);

            TempData["success"] = "Data imported succesfully!";

            return RedirectToAction("Import");
        }
        public DataTable ConvertToDataTable(string filePath)
        {
            DataTable dt = new DataTable();

            dt.Columns.Add(new DataColumn("ThumbID"));
            dt.Columns.Add(new DataColumn("DateTime"));
            dt.Columns.Add(new DataColumn("Machine"));
            dt.Columns.Add(new DataColumn("Status"));

            string[] lines = System.IO.File.ReadAllLines(filePath);

            foreach (string line in lines)
            {
                var cols = line.Split('\t');

                DataRow dr = dt.NewRow();
                for (int cIndex = 0; cIndex < 4; cIndex++)
                {
                    dr[cIndex] = cols[cIndex];
                }

                dt.Rows.Add(dr);
            }
            var lst = new List<EmpAttendanceViewModel>();

            for (int i = 0; i < dt.Rows.Count; i++)
            {
                lst.Add(new EmpAttendanceViewModel()
                {
                    Emp_Id = Convert.ToInt32(dt.Rows[i]["ThumbID"]),
                    Date = Convert.ToDateTime(dt.Rows[i]["DateTime"]),
                    CheckInTime = Convert.ToDateTime(dt.Rows[i]["DateTime"]).ToShortTimeString()
                });
            }
            // Data.BLL.Staff.Attendance.InsertImportedFileIntoDB(lst);

            return dt;
        }

        /////////////////// IMPORT END ////////////////////////

        // This Emp attendance by Month
        public ActionResult Emp(int? id, int? m, int? y)
        {
            ViewBag.Month = m;
            ViewBag.Year = y;
            ViewBag.EmpID = id;

            return View();
        }
        public ActionResult _Emp(int? id, int? m, int? y)
        {
            ViewBag.Month = m;
            ViewBag.Year = y;
            ViewBag.EmpID = id;

            var lst = Data.BLL.Employee.Attendance.List(id, m, y);

            return PartialView(lst);
        }
        // Mark Holiday
        public ActionResult Holiday()
        {
            return View();
        }
        [HttpPost]
        public ActionResult Holiday(DateTime Date)
        {
            Data.BLL.Employee.Attendance.MarkDayAsHoliday(Date);

            return Json(new { msg = DateFunctions.convertToStringDate(Date) + " has been marked as Holiday for All Employees" });
        }

        // Mark Leave
        public ActionResult Leave()
        {
            return View();
        }
        [HttpPost]
        public ActionResult Leave(int? Day, int? Month, int? Year, int? EmpID)
        {
            //  Data.BLL.Staff.Attendance.MarkAsLeave(EmpID ,Day, Month, Year);
            string date = DateFunctions.convertToStringDate(Convert.ToDateTime(Month.ToString() + "/" + Day.ToString() + "/" + Year.ToString()));

            return Json(new { msg = "s leave has been marked for " + date });
        }

        #region Export to Excel
        public ActionResult ExportAttendanceData(int? m, int? y)
        {
            DataTable table = new DataTable();
            table.Columns.Add("Name", typeof(string));
            table.Columns.Add("Monthly Salary", typeof(decimal));
            table.Columns.Add("Days Present", typeof(int));
            table.Columns.Add("Days Absent", typeof(int));
            table.Columns.Add("Late Comings", typeof(int));

            //foreach (var item in Salary.ThisMonth(m, y))
            //{
            //    // table.Rows.Add(item.Name, item.MonthlySalary, item.DaysPresent, item.DaysAbsent, item.LateComings);
            //}

            string SheetName = "Attendance_" + DateFunctions.convertToStringMonth(m) + "_" + y;
            ExportToExcel(table, SheetName);

            return View();
        }

        public ActionResult ExportToExcel(DataTable dt, string FileName)
        {
            using (XLWorkbook wb = new XLWorkbook())
            {
                wb.Worksheets.Add(dt, FileName);

                Response.Clear();
                Response.Buffer = true;
                Response.Charset = "";
                Response.ContentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
                Response.AddHeader("content-disposition", "attachment;filename=" + FileName + ".xlsx");
                using (MemoryStream MyMemoryStream = new MemoryStream())
                {
                    wb.SaveAs(MyMemoryStream);
                    MyMemoryStream.WriteTo(Response.OutputStream);
                    Response.Flush();
                    Response.End();
                }

                return View();
            }
        }

        #endregion
    }
}