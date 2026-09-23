using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;
using Data.Viewmodel.Employee;
using OfficeOpenXml;

namespace Student.Areas.Employee.Controllers
{
    public class ImportDataController : Controller
    {
        // GET: Employee/ImportData
        public ActionResult Index()
        {
            return View();
        }
        [HttpPost]
        public ActionResult ImportData(HttpPostedFileBase UploadedFile)
        {
            if (UploadedFile != null && UploadedFile.ContentLength > 0)
            {
                try
                {
                    ExcelPackage.LicenseContext = LicenseContext.NonCommercial;
                    using (var package = new OfficeOpenXml.ExcelPackage(UploadedFile.InputStream))
                    {
                        var totalSheets = package.Workbook.Worksheets.Count;

                        // Access the 4th sheet (Exception Stat.)
                        //var worksheet = package.Workbook.Worksheets[3];
                        var worksheet = package.Workbook.Worksheets["Exception Stat."];
                        if (worksheet == null)
                        {
                            return Json(new { success = false, message = "Sheet not found!" });
                        }

                        var data = new List<ImportAttendanceViewModel>();

                        // Skip the first 4 rows (heading and column names)
                        for (int row = 5; row <= worksheet.Dimension.End.Row; row++)
                        {
                            var id = worksheet.Cells[row, 2].Text; // EmpCode
                            var date = worksheet.Cells[row, 4].Text;

                            var e_in = worksheet.Cells[row, 5].Text; // E
                            var f_out = worksheet.Cells[row, 6].Text; // F
                            var g_in = worksheet.Cells[row, 7].Text; // G
                            var h_out = worksheet.Cells[row, 8].Text; // H

                            // Skip if completely empty
                            if (string.IsNullOrWhiteSpace(e_in) &&
                                string.IsNullOrWhiteSpace(f_out) &&
                                string.IsNullOrWhiteSpace(g_in) &&
                                string.IsNullOrWhiteSpace(h_out))
                            {
                                continue;
                            }

                            DateTime baseDate = DateTime.Parse(date);

                            // ✅ Collect all IN punches
                            var inTimes = new List<DateTime>();
                            if (!string.IsNullOrWhiteSpace(e_in))
                                inTimes.Add(DateTime.Parse($"{baseDate:yyyy-MM-dd} {e_in}"));

                            if (!string.IsNullOrWhiteSpace(g_in))
                                inTimes.Add(DateTime.Parse($"{baseDate:yyyy-MM-dd} {g_in}"));

                            // ✅ Collect all OUT punches
                            var outTimes = new List<DateTime>();
                            if (!string.IsNullOrWhiteSpace(f_out))
                                outTimes.Add(DateTime.Parse($"{baseDate:yyyy-MM-dd} {f_out}"));

                            if (!string.IsNullOrWhiteSpace(h_out))
                                outTimes.Add(DateTime.Parse($"{baseDate:yyyy-MM-dd} {h_out}"));

                            // ✅ Apply rule
                            DateTime? finalCheckIn = inTimes.Any() ? inTimes.Min() : (DateTime?)null;
                            DateTime? finalCheckOut = outTimes.Any() ? outTimes.Max() : (DateTime?)null;

                            data.Add(new ImportAttendanceViewModel
                            {
                                EmpCode = id,
                                Date = baseDate,
                                CheckInTime = finalCheckIn?.ToString("HH:mm"),
                                CheckOutTime = finalCheckOut?.ToString("HH:mm")
                            });
                        }
                        //for (int row = 5; row <= worksheet.Dimension.End.Row; row++)
                        //{
                        //    // Read required columns
                        //    var id = worksheet.Cells[row, 2].Text; // Column A
                        //    var date = worksheet.Cells[row, 4].Text; // Column D
                        //    var checkInTime = worksheet.Cells[row, 5].Text; // Column E
                        //    var checkOutTime = worksheet.Cells[row, 6].Text; // Column F

                        //    // Skip rows where both CheckInTime and CheckOutTime are empty
                        //    if (string.IsNullOrWhiteSpace(checkInTime) && string.IsNullOrWhiteSpace(checkOutTime))
                        //    {
                        //        continue;
                        //    }

                        //    // Add to list
                        //    data.Add(new ImportAttendanceViewModel
                        //    {
                        //        EmpCode = id,
                        //       Date = DateTime.Parse(date),
                        //       // Date = DateTime.Parse($"{date} {checkInTime}"),
                        //        CheckInTime = checkInTime,
                        //        CheckOutTime = checkOutTime
                        //    });
                        //}

                        Data.BLL.Employee.Attendance.ImportFromExcelFile(data);

                        return Json(new { success = true, data });
                    }
                }
                catch (Exception ex)
                {
                    return Json(new { success = false, message = ex.Message });
                }
            }
            return Json(new { success = false, message = "No file uploaded!" });
        }

        public ActionResult ImportEmployee()
        {
            return View();
        }
        [HttpPost]
        public ActionResult ImportEmployeeData(HttpPostedFileBase UploadedFile)
        {
            if (UploadedFile != null && UploadedFile.ContentLength > 0)
            {
                try
                {
                    ExcelPackage.LicenseContext = LicenseContext.NonCommercial;
                    using (var package = new OfficeOpenXml.ExcelPackage(UploadedFile.InputStream))
                    {
                        var totalSheets = package.Workbook.Worksheets.Count;

                        // Access the 4th sheet (Exception Stat.)
                        var worksheet = package.Workbook.Worksheets["Exception Stat."];
                        if (worksheet == null)
                        {
                            return Json(new { success = false, message = "Sheet not found!" });
                        }

                        var employeeRows = new List<ImportAttendanceViewModel>();

                        for (int row = 5; row <= worksheet.Dimension.End.Row; row++)
                        {
                            var employeeId = worksheet.Cells[row, 1];
                            var employeeName = worksheet.Cells[row, 2];
                            if (employeeId != null && employeeName != null)
                            {
                                employeeRows.Add(new ImportAttendanceViewModel()
                                {
                                    EmpCode = employeeId?.Text.ToString(),
                                    EmpName = employeeName?.Text.ToString(),
                                    DesignationID = 1
                                });
                            }
                        }

                        employeeRows = employeeRows.GroupBy(i => i.EmpCode).Select(group => group.FirstOrDefault()).ToList();

                        Data.BLL.Employee.Insert.ImportFromFile(employeeRows);

                        return Json(new { employeeRows });
                    }
                }
                catch (Exception ex)
                {
                    return Json(new { success = false, message = ex.Message });
                }
            }
            return Json(new { success = false, message = "No file uploaded!" });
        }

    }
}