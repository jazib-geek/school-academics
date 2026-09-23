using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Data.DAL;
using Data.Viewmodel.Employee;

namespace Data.BLL.Employee
{
    public class Edit
    {
        public static void EditEmployee(EmployeeViewModel model)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                int? EmployeeID = model.ID;
                var row = db.tblEmployees.Find(EmployeeID);

                if (row != null)
                {
                    row.EmployeeName = model.EmployeeName;
                    row.FatherName = model.FatherName;
                    row.Thumb_ID = model.Thumb_ID;
                    row.CNIC = model.CNIC;
                    row.Contact1 = model.Contact1;
                    row.Contact2 = model.Contact2;
                    row.Contact3 = model.Contact3;
                    row.DoB = model.DoB;
                    row.Blood_Group = model.Blood_Group;
                    row.MaritalStatus = model.MaritalStatus;
                    row.DesignationID = model.DesignationID;
                    row.Joining_Date = model.Joining_Date;
                    row.Religion = model.Religion;
                    row.Permanent_Address = model.Permanent_Address;
                    row.HomePhone = model.HomePhone;
                    row.ProfessionalDegree = model.ProfessionalDegree;
                    row.Salary = model.Salary;
                    row.Gender = model.Gender;
                    row.ApprovedBy = model.ApprovedBy;
                    row.IdentityMark = model.IdentityMark;
                    row.VerifiedBy = model.VerifiedBy;
                    row.Email = model.Email;
                    row.IsTrained = model.IsTrained;
                    row.LocalityID = model.LocalityID;
                    row.Thumb_ID = model.Thumb_ID;

                    db.SaveChanges();
                }
            }
        }

        public static bool IsDuplicateThumbID(int? EmployeeID, string ThumbID)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                var row = db.tblEmployees
                            .Where(x => x.Thumb_ID == ThumbID && x.ID != EmployeeID)
                            .FirstOrDefault();
                if (row != null)
                {
                    return true;
                }
                else
                {
                    return false;
                }
            }
        }

        public static void AddOtherData(EmployeeTempViewModel model)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                int? EmployeeID = model.ID;
                string Type = model.Type;

                switch (Type)
                {
                    case "Qual":
                        db.tblEmployeeQualifications.Add(new tblEmployeeQualification()
                        {
                            EmpID = EmployeeID,
                            Board = model.Qual_Board,
                            Degree = model.Qual_Degree,
                            Grade = model.Qual_Grade,
                            Marks = model.Qual_Marks,
                            Remarks = model.Qual_Remarks,
                            Year = model.Qual_Year
                        });
                        db.SaveChanges();
                        break;


                    case "Exp":
                        db.tblEmployeeExperiences.Add(new tblEmployeeExperience()
                        {
                            EmpID = EmployeeID,
                            InstituteName = model.Exp_InstituteName,
                            Designation = model.Exp_Designation,
                            FromDate = model.Exp_FromDate,
                            ToDate = model.Exp_ToDate,
                            DurationYears = model.Exp_DurationYears,
                        });
                        db.SaveChanges();

                        break;


                    case "Asset":
                        db.tblEmployeeAssets.Add(new tblEmployeeAsset()
                        {
                            EmpID = EmployeeID,
                            AssetName = model.Asset_Name,
                            AssetWorth = model.Asset_AssetWorth,
                            DateOfIssue = model.Asset_DateOfIssue,
                            Remarks = model.Asset_Remarks
                        });
                        db.SaveChanges();

                        break;


                    case "Subject":
                        db.tblEmployeeSubjects.Add(new tblEmployeeSubject()
                        {
                            EmpID = EmployeeID,
                            SubjectID = model.SubjectID
                        });
                        db.SaveChanges();

                        break;
                    default:
                        break;
                }
            }
        }

        public static void DeleteOtherData(int? ID, string Type)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                switch (Type)
                {
                    case "Qual":
                        db.Database.ExecuteSqlCommand("delete from tblEmployeeQualification where ID = " + ID);

                        break;


                    case "Exp":
                        db.Database.ExecuteSqlCommand("delete from tblEmployeeExperience where ID = " + ID);
                        break;


                    case "Asset":
                        db.Database.ExecuteSqlCommand("delete from tblEmployeeAsset where ID = " + ID);

                        break;

                    case "Subject":
                        db.Database.ExecuteSqlCommand("delete from tblEmployeeSubject where ID = " + ID);

                        break;

                    case "Component":
                        db.Database.ExecuteSqlCommand("delete from tblEmployeeSalaryComponents where ID = " + ID);

                        break;


                    default:
                        break;
                }
            }
        }
    }
}
