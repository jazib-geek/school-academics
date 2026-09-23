using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Data.DAL;

namespace Data.BLL.Student
{
    public class Promote
    {
        public static void PromoteTemporarily(int? CurrentClassID, int? TargetClassID)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                var lst = db.tblStudents.Where(x => x.ClassCompositeID == CurrentClassID && x.IsActive == true).ToList();

                if (lst.Count > 0)
                {
                    foreach (var item in lst)
                    {
                        db.Database.ExecuteSqlCommand("update tblStudent set TempClassID = " + TargetClassID + " where ClassCompositeID = " + CurrentClassID); 
                    }
                }
            }
        }

        public static void PromotePermanently()
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                db.Database.ExecuteSqlCommand("update tblStudent set ClassCompositeID = TempClassID , TempClassID = ClassCompositeID where TempClassID != 0");
                db.Database.ExecuteSqlCommand("update tblStudent set TempClassID = 0");
            }
        }
    }
}
