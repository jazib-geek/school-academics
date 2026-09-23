using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Policy;
using System.Web;
using System.Web.Mvc;
using Data.BLL.Accounts;
using Data.Viewmodel.Account;

namespace Student.Areas.Accounts.Controllers
{
    public class VoucherController : Controller
    {
        public ActionResult Index()
        {
            return View();
        }
        public ActionResult CashPayment()
        {
            var model = new TransactionViewModel()
            {
                Hash = Guid.NewGuid().ToString()
            };

            return View(model);
        }
        public ActionResult CashReceipt()
        {
            var model = new TransactionViewModel()
            {
                Hash = Guid.NewGuid().ToString()
            };

            return View(model);
        }
        public ActionResult _Index(string Hash)
        {
            var lst = Temp.GetByHash(Hash);

            return PartialView("_Index", lst);
        }

        public ActionResult _Edit(int? ID)
        {
            var model = Transaction.GetDetailRow(ID);

            return PartialView(model);
        }

        public ActionResult EditVoucher(int? id)
        {
            var model = Transaction.GetDetailRow(id);

            return View(model);
        }

        public ActionResult Print(string id)
        {
            var Voucher = Transaction.GetVoucher(id);

            return View(Voucher);
        }
        ///////////////////////////////////////////////////////////////////////////////////////////////////////
        [HttpPost]
        public ActionResult InsertTempRow(TransactionViewModel model)
        {
            Temp.InsertTempRow(model);

            return Json(new { msg = "success" });
        }
        [HttpPost]
        public ActionResult InsertTempPayment(TransactionViewModel model)
        {
            Temp.InsertTempRowCashPayment(model);

            return Json(new { msg = "success" });
        }
        [HttpPost]
        public ActionResult InsertTempReceipt(TransactionViewModel model)
        {
            Temp.InsertTempRowCashReceipt(model);

            return Json(new { msg = "success" });
        }
        [HttpPost]
        public ActionResult SaveVoucher(string Hash, DateTime Date)
        {
            string UserName = Session["user"].ToString();

            string Code = Transaction.InsertNewTransaction(Hash, Date, UserName);

            return Json(new { msg = "success", VCode = Code }, JsonRequestBehavior.AllowGet);
        }
        [HttpPost]
        public ActionResult EditRow(TransactionViewModel model)
        {
            Transaction.EditVoucher(model);

            return Json(new { msg = "success" });
        }
        [HttpPost]
        public ActionResult DeleteRow(int ID)
        {
            Temp.DeleteRow(ID);

            return Json(new { msg = "success" });
        }
    }
}