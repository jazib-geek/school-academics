using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Data.DAL;

namespace Data.BLL.Accounts
{
    public class Chart
    {
        public static List<tblAccountGroup> ListGroups()
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                return db.tblAccountGroups.ToList();
            }
        }
        public static List<tblAccountSubGroup> ListSubGroups()
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                return db.tblAccountSubGroups.ToList();
            }
        }
        public static List<tblAccount> ListAccount()
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                return db.tblAccounts.ToList();
            }
        }
        public static void CreateGroup(int? MasterID, string Title)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                var lst = db.tblAccountGroups.Where(x => x.MasterID == MasterID).ToList();
                int PostFix = lst.Count + 1;

                string GroupID = MasterID.ToString() + "-0" + PostFix;

                if (PostFix > 9)
                {
                    GroupID = MasterID.ToString() + "-" + PostFix;
                }

                tblAccountGroup group = new tblAccountGroup()
                {
                    MasterID = MasterID,
                    GroupID = GroupID,
                    GroupTitle = Title
                };
                db.tblAccountGroups.Add(group);
                db.SaveChanges();
            }
        }

        public static void CreateSubGroup(string GroupID, string Title)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                var Group = db.tblAccountGroups.Where(x => x.GroupID == GroupID).FirstOrDefault();

                if (Group != null)
                {
                    int MasterID = Group.MasterID.Value;

                    var lst = db.tblAccountSubGroups.Where(x => x.GroupID == GroupID).ToList();
                    int PostFix = lst.Count + 1;

                    string SubGroupID = GroupID + "-00" + PostFix;

                    if (PostFix > 9)
                    {
                        SubGroupID = GroupID + "-0" + PostFix;
                    }

                    tblAccountSubGroup subgroup = new tblAccountSubGroup()
                    {
                        MasterID = MasterID,
                        GroupID = GroupID,
                        SubGroupID = SubGroupID,
                        SubGroupName = Title
                    };
                    db.tblAccountSubGroups.Add(subgroup);
                    db.SaveChanges();
                }
            }
        }

        public static void CreateAccount(string SubGroupID, string AccountTitle, string User)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                var SubGroup = db.tblAccountSubGroups.Where(x => x.SubGroupID == SubGroupID).FirstOrDefault();

                if (SubGroup != null)
                {
                    int MasterID = SubGroup.MasterID;
                    string GroupID = SubGroup.GroupID;

                    var lst = db.tblAccounts.Where(x => x.SubGroupID == SubGroupID).ToList();
                    int PostFix = lst.Count + 1;

                    string AccountID = SubGroupID + "-000" + PostFix;

                    if (PostFix > 9)
                    {
                        AccountID = SubGroupID + "-00" + PostFix;
                    }

                    tblAccount account = new tblAccount()
                    {
                        MasterID = MasterID,
                        GroupID = GroupID,
                        SubGroupID = SubGroupID,
                        AccountID = AccountID,
                        AccountTitle = AccountTitle,
                        EntryUser = User,
                        CreationDate = DateTime.Now.Date,
                        OpeningBalance = 0
                    };
                    db.tblAccounts.Add(account);
                    db.SaveChanges();
                }
            }
        }

        public static string CreateAccount(string SubGroupID, string AccountTitle)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                var SubGroup = db.tblAccountSubGroups.Where(x => x.SubGroupID == SubGroupID).FirstOrDefault();
                string AccountID = "";

                if (SubGroup != null)
                {
                    int MasterID = SubGroup.MasterID;
                    string GroupID = SubGroup.GroupID;

                    var lst = db.tblAccounts.Where(x => x.SubGroupID == SubGroupID).ToList();
                    int PostFix = lst.Count + 1;

                    AccountID = SubGroupID + "-000" + PostFix;

                    if (PostFix > 9)
                    {
                        AccountID = SubGroupID + "-00" + PostFix;
                    }

                    tblAccount account = new tblAccount()
                    {
                        MasterID = MasterID,
                        GroupID = GroupID,
                        SubGroupID = SubGroupID,
                        AccountID = AccountID,
                        AccountTitle = AccountTitle,
                        EntryUser = "Auto",
                        CreationDate = DateTime.Now.Date,
                        OpeningBalance = 0
                    };
                    db.tblAccounts.Add(account);
                    db.SaveChanges();
                }

                return AccountID;
            }
        }

        public static void EditAccountTitle(int? ID, string AccountTitle)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                var row = db.tblAccounts.Find(ID);

                if (row != null)
                {
                    row.AccountTitle = AccountTitle;
                    db.SaveChanges();
                }
            }
        }

        public static void EditGroupName(int? ID, string GroupName)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                var row = db.tblAccountGroups.Find(ID);

                if (row != null)
                {
                    row.GroupTitle = GroupName;
                    db.SaveChanges();
                }
            }
        }

        public static void EditSubGroupName(int? ID, string SubGroupName)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                var row = db.tblAccountSubGroups.Find(ID);

                if (row != null)
                {
                    row.SubGroupName = SubGroupName;
                    db.SaveChanges();
                }
            }
        }
        public static string GetAccountTitle(string AccountCode)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                return db.tblAccounts.Where(x => x.AccountID == AccountCode).First().AccountTitle;
            }
        }
    }
}
