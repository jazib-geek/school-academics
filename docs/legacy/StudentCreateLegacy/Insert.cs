using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Data.DAL;
using Data.Viewmodel;

namespace Data.BLL.Student
{
    public class Insert
    {
        public static void CreateStudent(StudentViewModel model)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                // First check if student belong to any existing family, if not generate new family code otherwise prevent new entry in family table
                int StudentID = Students.GenerateStudentID();

                int? ClassID = db.tblSections.Find(model.ClassCompositeID).Class_ID;
                int? SectionID = db.tblSections.Find(model.ClassCompositeID).SectionID;

                int FamilyID = 0;

                if (model.Family_ID == null)
                {
                    FamilyID = Convert.ToInt32(Students.GenerateFamilyCode());
                }
                else
                {
                    FamilyID = model.Family_ID.Value;
                }

                // Insert Basic Data in Student table 

                tblStudent student = new tblStudent()
                {
                    Reg_Id = StudentID,
                    StudentType = model.StudentType,
                    MachineCode = model.MachineCode,
                    Type = model.StudentType,
                    FeeType = model.FeeType,
                    Sponsor = model.Sponsor,
                    Email = model.Email,
                    FullName = model.FullName,
                    SessionSpan = model.SessionSpan,
                    Date_of_Brith = model.Date_of_Brith,
                    LocalityID = model.LocalityID,
                    B_FormNum = model.B_FormNum,
                    Caste = model.Caste,
                    Religion = model.Religion,
                    Mark_Of_Identification = model.Mark_Of_Identification,
                    LearningMode = model.LearningMode,
                    Gender = model.Gender,
                    isHafiz = model.IsHafiz,
                    isOrphan = model.IsOrphan,
                    Admitted_by = model.Admitted_by,
                    SpecialNotes = model.Notes,
                    PrevSchoolName = model.PrevSchoolName,
                    PrevSchoolClass = model.PrevSchoolClass,
                    Family_Code = FamilyID,
                    Home_Address = model.Home_Address,
                    SMS_Contact = model.SMS_Contact,
                    RegDate = DateTime.Now.AddHours(10).Date,
                    // InitialClass = StudentParameters.ClassSectionNameByID(model.Class_ID, model.Section_ID),
                    Church = model.Church,
                    IsActive = true,
                    Password = FamilyFunctions.GenerateRandomPassword(6),

                    RollNum = model.RollNum,
                    FinanceType = model.FinanceType,
                    StudentContact = model.StudentContact,
                    // Academic Data

                    Class_ID = ClassID,
                    Section_ID = SectionID,
                    ClassCompositeID = model.ClassCompositeID,
                    Medium = model.Medium,
                    SubjectGroupID = model.SubjectGroupID,
                    BranchID = model.BranchID,

                    // Fee Data

                    TutionFee = model.ActualFee,
                    FeeConcession = model.FeeConcession,
                    Fee = (int)model.ActualFee + (int)model.FeeConcession,
                };

                db.tblStudents.Add(student);
                db.SaveChanges();

                // Insert one row in Family table

                tblStudentFamily family = new tblStudentFamily()
                {
                    FamilyID = FamilyID,
                    StudentID = StudentID
                };

                db.tblStudentFamilies.Add(family);
                db.SaveChanges();

                // Insert Father and mother data in Family Detail table if student doesnt belong to existing family

                if (!Students.FamilyIDExist(model.Family_ID))
                {
                    tblStudentFamilyDetail detail = new tblStudentFamilyDetail()
                    {
                        FamilyID = FamilyID,
                        FatherName = model.FatherName,
                        FatherCNIC = model.FatherCNIC,
                        FatherEmail = model.FatherEmail,
                        FatherOccupationID = model.FatherOccupationID,
                        FatherQualificationID = model.FatherQualificationID,
                        FatherMobileNo = model.FatherContactNumber,
                        FatherWorkPhone = model.FatherWorkPhone,
                        MotherName = model.MotherName,
                        MotherCNIC = model.MotherCnic,
                        MotherPhoneNo = model.MotherPhoneNo,
                        MotherQualificationID = model.MotherQualificationID,
                        MotherOccupationID = model.MotherOccupationID,
                        Password = FamilyFunctions.GenerateRandomPassword(6)
                    };

                    db.tblStudentFamilyDetails.Add(detail);
                    db.SaveChanges();
                }

                // Generate Fee and Funds

              //  FeeAndFund.Generate.GenerateFund(StudentID, 1, DateTime.Now.Month, DateTime.Now.Year, model.ActualFee);   // TUTION FEE
                FeeAndFund.Generate.GenerateFund(StudentID, 2, 0, DateTime.Now.Year, model.AdmissionFee);   // ADMISSION FEE

                FeeAndFund.Generate.GenerateFund(StudentID, 3, 0, DateTime.Now.Year, model.FundType_1);
                FeeAndFund.Generate.GenerateFund(StudentID, 4, 0, DateTime.Now.Year, model.FundType_2);
                FeeAndFund.Generate.GenerateFund(StudentID, 5, 0, DateTime.Now.Year, model.FundType_3);

                // Insert Log Row
                Log.StudentLog.InsertLog(StudentID, "Registered", DateFunctions.GetCurrentDate() , "Got admission");
            }
        }

        public static void UpdateStudent(StudentViewModel model)
        {
            using (dbSchoolEntities mydb = new dbSchoolEntities())
            {
                // Get row from tblStudent and update

                tblStudent student = mydb.tblStudents.Find(model.Reg_Id);

                student.FullName = model.FullName;
                student.NameInUrdu = model.NameInUrdu;
                student.Date_of_Brith = model.Date_of_Brith;
                student.LocalityID = model.LocalityID;
                student.B_FormNum = model.B_FormNum;
                student.Caste = model.Caste;
                student.Religion = model.Religion;
                student.Mark_Of_Identification = model.Mark_Of_Identification;
                student.Gender = model.Gender;
                student.isHafiz = model.IsHafiz;
                student.isOrphan = model.IsOrphan;
                student.Admitted_by = model.Admitted_by;
                student.SpecialNotes = model.Notes;
                student.PrevSchoolName = model.PrevSchoolName;
                student.PrevSchoolClass = model.PrevSchoolClass;
                student.Home_Address = model.Home_Address;
                student.Family_Code = model.Family_ID;
                student.SMS_Contact = model.SMS_Contact;

                // Academy Data

                //    student.Class_ID = model.Class_ID;
                //    student.Section_ID = model.Section_ID;
                student.Medium = model.Medium;
                student.SubjectGroupID = model.SubjectGroupID;

                // Fee Data

                //student.AdmissionFee = model.AdmissionFee;
                //student.AnnualCharges = model.Annual_Charges;
                //student.TransportCharges = model.Transport_Charges;
                //student.LabCharges = model.Lab_Charges;

                // Update Father and mother data in Family Detail table 

                tblStudentFamilyDetail detail = mydb.tblStudentFamilyDetails.Where(x => x.FamilyID == model.Family_ID).First();

                detail.FatherName = model.FatherName;
                detail.FatherCNIC = model.FatherCNIC;
                detail.FatherEmail = model.FatherEmail;
                detail.FatherOccupationID = model.FatherOccupationID;
                detail.FatherQualificationID = model.FatherQualificationID;
                detail.FatherMobileNo = model.FatherContactNumber;

                detail.FatherWorkPhone = model.FatherWorkPhone;
                detail.MotherName = model.MotherName;
                detail.MotherCNIC = model.MotherCnic;
                detail.MotherPhoneNo = model.MotherPhoneNo;
                detail.MotherQualificationID = model.MotherQualificationID;
                // detail.MotherOccupationID = model.MotherOccupationID;

                tblStudentFamily family_row = mydb.tblStudentFamilies.Where(x => x.StudentID == model.Reg_Id).First();
                family_row.FamilyID = model.Family_ID;

                mydb.SaveChanges();
            }
        }

    }
}
