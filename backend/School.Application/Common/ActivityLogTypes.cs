namespace School.Application.Common;

public static class ActivityLogTypes
{
    public const string StudentEdit = "StudentEdit";
    public const string StudentBulkEdit = "StudentBulkEdit";
    public const string StudentTransfer = "StudentTransfer";
    public const string StudentFeeUpdate = "StudentFeeUpdate";
    public const string StudentActivate = "StudentActivate";
    public const string StudentDeactivate = "StudentDeactivate";
    public const string EmployeeAttendanceEdit = "EmployeeAttendanceEdit";
    public const string EmployeeAttendanceMarkPresent = "EmployeeAttendanceMarkPresent";
    public const string EmployeeAttendanceMarkHoliday = "EmployeeAttendanceMarkHoliday";
    public const string EmployeeAttendanceDelete = "EmployeeAttendanceDelete";
    public const string EmployeeAttendanceBackfill = "EmployeeAttendanceBackfill";
    public const string EmployeeAttendanceRecalculateDutyTimes = "EmployeeAttendanceRecalculateDutyTimes";
    public const string EmployeeAttendanceImport = "EmployeeAttendanceImport";
    public const string FeeReceiptVoid = "FeeReceiptVoid";
    public const string FeeReceiptEdit = "FeeReceiptEdit";
    public const string StationeryPurchase = "StationeryPurchase";
    public const string StationeryHandover = "StationeryHandover";
    public const string EmployeeSalaryComponentEdit = "EmployeeSalaryComponentEdit";
    public const string EmployeeSalaryComponentDelete = "EmployeeSalaryComponentDelete";
    public const string ClassDiaryReplace = "ClassDiaryReplace";
    public const string ClassDiaryDelete = "ClassDiaryDelete";
}

public static class ActivityLogEntityTypes
{
    public const string Student = "Student";
    public const string EmployeeAttendance = "EmployeeAttendance";
    public const string FeeReceipt = "FeeReceipt";
    public const string StationeryPurchase = "StationeryPurchase";
    public const string StationeryHandover = "StationeryHandover";
    public const string EmployeeSalaryComponent = "EmployeeSalaryComponent";
    public const string ClassDiary = "ClassDiary";
}