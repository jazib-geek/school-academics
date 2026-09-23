using Data.DAL;
using Data.Viewmodel.Employee;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Data.BLL.Employee
{
    public class EmployeeClass
    {
        public static List<tblEmployeeClass> ListOfClassByEmployee(int? EmpID)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                return db.tblEmployeeClasses.Where(x => x.EmpID == EmpID).ToList();
            }
        }
        public static void AddUpdateEmployeeClass(int? EmployeeID, int[] ClassID)
        {
            if (EmployeeID == null || ClassID == null || ClassID.Length == 0)
                throw new ArgumentException("EmpID and ClassID must not be null or empty.");

            using (var db = new dbSchoolEntities())
            {
                using (var transaction = db.Database.BeginTransaction())
                {
                    try
                    {
                        // Remove all existing rows for the current EmployeeID
                        db.tblEmployeeClasses.RemoveRange(db.tblEmployeeClasses.Where(sc => sc.EmpID == EmployeeID));

                        // Add new rows for the given EmployeeID and ClassIDs
                        foreach (var classID in ClassID)
                        {
                            db.tblEmployeeClasses.Add(new tblEmployeeClass
                            {
                                EmpID = EmployeeID.Value,
                                ClassID = classID
                            });
                        }

                        // Save changes and commit the transaction
                        db.SaveChanges();
                        transaction.Commit();
                    }
                    catch
                    {
                        // Rollback the transaction in case of an error
                        transaction.Rollback();
                        throw;
                    }
                }
            }
        }

    }
}
