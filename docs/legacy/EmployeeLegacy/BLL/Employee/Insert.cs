using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Data.DAL;
using Data.Viewmodel.Employee;

namespace Data.BLL.Employee
{
    public class Insert
    {
        public static int NewEmployee(EmployeeViewModel model)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                var employee = new tblEmployee()
                {
                    EmployeeName = model.EmployeeName,
                    FatherName = model.FatherName,
                    Thumb_ID = model.Thumb_ID,
                    CNIC = model.CNIC,
                    Contact1 = model.Contact1,
                    Contact2 = model.Contact2,
                    Contact3 = model.Contact3,
                    DoB = model.DoB,
                    Blood_Group = model.Blood_Group,
                    MaritalStatus = model.MaritalStatus,
                    DesignationID = model.DesignationID,
                    Joining_Date = model.Joining_Date,
                    Religion = model.Religion,
                    Permanent_Address = model.Permanent_Address,
                    HomePhone = model.HomePhone,
                    ProfessionalDegree = model.ProfessionalDegree,
                    Salary = model.Salary,
                    Gender = model.Gender,
                    ApprovedBy = model.ApprovedBy,
                    IdentityMark = model.IdentityMark,
                    VerifiedBy = model.VerifiedBy,
                    Email = model.Email,
                    IsTrained = model.IsTrained,
                    LocalityID = model.LocalityID,
                    Password = FamilyFunctions.GenerateRandomPassword(6),
                    IsActive = true
                };

                db.tblEmployees.Add(employee);
                db.SaveChanges();

                return employee.ID;

                //var lstQual = db.tblTempEmployees.Where(x => x.Type == "Qual" && x.Hash == model.Hash).ToList();

                //foreach (var item in lstQual)
                //{
                //    db.tblEmployeeQualifications.Add(new tblEmployeeQualification()
                //    {
                //        EmployeeID = EmployeeID,
                //        Board = item.Qual_Board,
                //        Degree = item.Qual_Degree,
                //        Grade = item.Qual_Grade,
                //        Marks = item.Qual_Marks,
                //        Remarks = item.Qual_Remarks,
                //        Year = item.Qual_Year
                //    });
                //    db.SaveChanges();
                //}

                //var lstExp = db.tblTempEmployees.Where(x => x.Type == "Exp" && x.Hash == model.Hash).ToList();

                //foreach (var item in lstExp)
                //{
                //    db.tblEmployeeExperiences.Add(new tblEmployeeExperience()
                //    {
                //        EmployeeID = EmployeeID,
                //        InstituteName = item.Exp_InstituteName,
                //        Designation = item.Exp_Designation,
                //        FromDate = item.Exp_FromDate,
                //        ToDate = item.Exp_ToDate,
                //        DurationYears = item.Exp_DurationYears,
                //    });
                //    db.SaveChanges();
                //}

                //var lstSubj = db.tblTempEmployees.Where(x => x.Type == "Subject" && x.Hash == model.Hash).ToList();
                //foreach (var item in lstSubj)
                //{
                //    db.tblEmployeeSubjects.Add(new tblEmployeeSubject()
                //    {
                //        EmployeeID = EmployeeID,
                //        SubjectID = item.SubjectID
                //    });
                //    db.SaveChanges();
                //}

                //var lstAsset = db.tblTempEmployees.Where(x => x.Type == "Asset" && x.Hash == model.Hash).ToList();
                //foreach (var item in lstAsset)
                //{
                //    db.tblEmployeeAssets.Add(new tblEmployeeAsset()
                //    {
                //        EmployeeID = EmployeeID,
                //        AssetName = item.Asset_Name,
                //        AssetWorth = item.Asset_AssetWorth,
                //        DateOfIssue = item.Asset_DateOfIssue,
                //        Remarks = item.Asset_Remarks
                //    });
                //    db.SaveChanges();
                //}

            }
        }

        public static int GenerateEmployeeID()
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                var lst = db.tblEmployees.ToList();

                if (lst.Count > 0)
                {
                    return lst.Max(x => x.ID) + 1;
                }

                return 1;
            }
        }

        public static tblEmployee GetByThumbID(string ThumbID)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                var employee = db.tblEmployees.FirstOrDefault(x => x.Thumb_ID == ThumbID);

                return employee;
            }
        }

        #region Import from file
        public static void ImportFromFile(List<ImportAttendanceViewModel> lst)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                string Thumb_ID = "0";
                foreach (var item in lst)
                {
                    if (item.EmpCode != null &&  item.EmpName != null && !string.IsNullOrEmpty(item.EmpName))
                    {
                        Thumb_ID = Convert.ToString(item.EmpName);
                        var chk = db.tblEmployees.FirstOrDefault(x => x.Thumb_ID == Thumb_ID);
                        if (chk == null)
                        {
                            db.tblEmployees.Add(new tblEmployee()
                            {
                                Thumb_ID = Thumb_ID,
                                EmployeeName = item.EmpName,
                                DesignationID = item.DesignationID,
                                Salary = 0,
                                IsActive = true
                            });
                            db.SaveChanges();
                        }
                    }
                }
            }

        }

        #endregion
    }
}
