using System;
using System.Collections.Generic;
using System.Linq;
using Data.Viewmodel;
using Data.DAL;

namespace Data.BLL.Student
{
    public class LocalityFunctions
    {
        public static List<LocalityViewModel> lstLocality()
        {
            var lst = new List<LocalityViewModel>();

            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                foreach (var item in db.tblLocalities.ToList())
                {
                    lst.Add(new LocalityViewModel()
                    {
                        ID = item.ID,
                        LocalityName = item.Town,
                        IsActive = item.IsActive
                    });
                }
            }
            return lst;
        }
        public static void CreateLocality(LocalityViewModel model)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                tblLocality add = new tblLocality()
                {
                    Town = model.LocalityName,
                    IsActive = true
                };
                db.tblLocalities.Add(add);
                db.SaveChanges();
            }
        }
        public static void EditLocality(LocalityViewModel model)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                tblLocality row = db.tblLocalities.Find(model.ID);
                if (row != null)
                {
                    row.Town = model.LocalityName;
                    db.SaveChanges();
                }
            }
        }
        public static bool LocalityExist(string name)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                tblLocality row = db.tblLocalities.Where(x => x.Town == name).FirstOrDefault();

                if (row == null)
                {
                    return false;
                }

                return true;
            }
        }
    }
}
