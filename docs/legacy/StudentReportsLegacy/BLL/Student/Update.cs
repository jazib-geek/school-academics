using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Data.DAL;
using Data.Viewmodel;

namespace Data.BLL.Student
{
    public class Update
    {
        public static void UpdateStudent(StudentViewModel model)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                // Get row from tblStudent and update

                tblStudent student = db.tblStudents.Find(model.Reg_Id);

                if (student != null)
                {
                    student.FullName = model.FullName;
                    student.NameInUrdu = model.NameInUrdu;
                    student.Date_of_Brith = model.Date_of_Brith;
                    student.LocalityID = model.LocalityID;
                    student.B_FormNum = model.B_FormNum;
                    student.Caste = model.Caste;
                    student.Religion = model.Religion;
                    student.Mark_Of_Identification = model.Mark_Of_Identification;
                    student.Gender = model.Gender;
                    //  student.isHafiz = model.IsHafiz;
                    //  student.isOrphan = model.IsOrphan;
                    student.Admitted_by = model.Admitted_by;
                    student.SpecialNotes = model.Notes;
                    student.PrevSchoolName = model.PrevSchoolName;
                    student.PrevSchoolClass = model.PrevSchoolClass;
                    student.Home_Address = model.Home_Address;
                    student.Family_Code = model.Family_ID;
                    student.SMS_Contact = model.SMS_Contact;
                    student.Medium = model.Medium;

                    // Update Father and mother data in Family Detail table 

                    tblStudentFamilyDetail detail = db.tblStudentFamilyDetails.Where(x => x.FamilyID == model.Family_ID).FirstOrDefault();

                    if (detail != null)
                    {
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

                    }

                    db.SaveChanges();
                }
            }
        }

        // Transfer Student form One Class to Another
        public static void TransferStudent(int? StudentID, string OldClassName, int? NewCompositeID)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                tblStudent student = db.tblStudents.Find(StudentID);

                var NewClass = db.tblSections.Find(NewCompositeID);

                if (student != null)
                {
                    // Change ClassID and SectionID in Student Table
                    student.Class_ID = NewClass.Class_ID;
                    student.Section_ID = NewClass.SectionID;
                    student.ClassCompositeID = NewCompositeID;

                    db.SaveChanges();

                    Log.StudentLog.InsertLog(StudentID, "", DateFunctions.GetCurrentDate(), "Transferred From " + OldClassName + " to " + NewClass.ClassName);

                    // Update in Exam Table to maintain History
                    List<tblExam> lstExam = db.tblExams.Where(x => x.StudentID == StudentID).ToList();
                    //if (lstExam.Count > 0)
                    //{
                    //    foreach (var item in lstExam)
                    //    {
                    //        item.ClassID = ClassID;
                    //        item.SectionID = SectionID;
                    //        db.SaveChanges();
                    //    }
                    //}

                }
            }
        }

        public static void UpdateAlt(StudentViewModel model)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                tblStudent student = db.tblStudents.Find(model.Reg_Id);
                if (student != null)
                {
                    int? FamilyID = student.Family_Code;

                    student.FullName = model.FullName;
                    student.Home_Address = model.Home_Address;
                    student.ClassCompositeID = model.Class_ID;

                    var FeeFromModel = model.TutionFee;
                    var NewConcession = student.Fee - FeeFromModel;

                    student.FeeConcession = Convert.ToInt32(NewConcession);
                    student.TutionFee = FeeFromModel;
                    db.SaveChanges();

                    var Family = db.tblStudentFamilyDetails.Where(x => x.FamilyID == FamilyID).FirstOrDefault();
                    if (Family != null)
                    {
                        Family.FatherName = model.FatherName;
                        db.SaveChanges();
                    }
                }
            }
        }
    }
}
