using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;
using Data.Viewmodel.Account;
using Data.BLL.Accounts;
using System.Web.Script.Serialization;

namespace Student.Areas.Accounts.Controllers
{
    public class SettingsController : Controller
    {
        public ActionResult Index()
        {
            return View();
        }

        public ActionResult _Groups(int? MasterID)
        {
            var Groups = Chart.ListGroups();

            if (MasterID != null)
            {
                Groups = Groups.Where(x => x.MasterID == MasterID).ToList();
            }

            return PartialView("_Groups", Groups);
        }

        [HttpPost]
        public ActionResult CreateGroup(int? MasterID, string Title)
        {
            if (Chart.ListGroups().Where(x => x.GroupTitle == Title).FirstOrDefault() != null)
            {
                return Json(new { msg = "duplicate" });
            }

            Chart.CreateGroup(MasterID, Title);

            return Json(new { msg = "success" });
        }

        // SUB GROUP
        public ActionResult _SubGroups(int? MasterID, string GroupID)
        {
            var SubGroups = Chart.ListSubGroups();

            if (MasterID != null)
            {
                SubGroups = SubGroups.Where(x => x.MasterID == MasterID).ToList();
            }

            if (!string.IsNullOrEmpty(GroupID))
            {
                SubGroups = SubGroups.Where(x => x.GroupID == GroupID).ToList();
            }

            return PartialView("_SubGroups", SubGroups);
        }
        [HttpPost]
        public ActionResult CreateSubGroup(string GroupID, string Title)
        {
            if (Chart.ListSubGroups().Where(x => x.SubGroupName == Title).FirstOrDefault() != null)
            {
                return Json(new { msg = "duplicate" });
            }

            Chart.CreateSubGroup(GroupID, Title);

            return Json(new { msg = "success" });
        }

        // SUB GROUP
        public ActionResult _Accounts(int? MasterID, string GroupID, string SubGroupID)
        {
            var Accounts = Chart.ListAccount();

            if (MasterID != null)
            {
                Accounts = Accounts.Where(x => x.MasterID == MasterID).ToList();
            }

            if (!string.IsNullOrEmpty(GroupID) && GroupID != "0")
            {
                Accounts = Accounts.Where(x => x.GroupID == GroupID).ToList();
            }

            if (!string.IsNullOrEmpty(SubGroupID) && SubGroupID != "0")
            {
                Accounts = Accounts.Where(x => x.SubGroupID == SubGroupID).ToList();
            }

            return PartialView("_Accounts", Accounts);
        }

        [HttpPost]
        public ActionResult CreateAccount(string SubGroupID, string Title)
        {
            if (Chart.ListAccount().Where(x => x.AccountTitle == Title).FirstOrDefault() != null)
            {
                return Json(new { msg = "duplicate" });
            }

            string User = "LoggedInUser";

            Chart.CreateAccount(SubGroupID, Title, User);

            return Json(new { msg = "success" });
        }

        [HttpPost]
        public JsonResult GetGroups(int? MasterID)
        {
            var lst = Chart.ListGroups().Where(x => x.MasterID == MasterID).ToList();

            JavaScriptSerializer javaScriptSerializer = new JavaScriptSerializer();
            string result = javaScriptSerializer.Serialize(lst);

            return Json(result, JsonRequestBehavior.AllowGet);
        }

        [HttpPost]
        public JsonResult GetSubGroups(string GroupID)
        {
            var lst = Chart.ListSubGroups().Where(x => x.GroupID == GroupID).ToList();

            JavaScriptSerializer javaScriptSerializer = new JavaScriptSerializer();
            string result = javaScriptSerializer.Serialize(lst);

            return Json(result, JsonRequestBehavior.AllowGet);
        }

        [HttpPost]
        public JsonResult EditAccountTitle(int? ID, string Title)
        {
            Chart.EditAccountTitle(ID, Title);

            return Json(new { msg = "success" });
        }
        [HttpPost]
        public JsonResult EditGroupName(int? ID, string Title)
        {
            Chart.EditGroupName(ID, Title);

            return Json(new { msg = "success" });
        }
        [HttpPost]
        public JsonResult EditSubGroupName(int? ID, string Title)
        {
            Chart.EditSubGroupName(ID, Title);

            return Json(new { msg = "success" });
        }
    }
}