using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;
using Data.BLL.Accounts;

namespace Student.Areas.Accounts.Controllers
{
    public class LedgerController : Controller
    {
        // GET: Account/Ledger
        public ActionResult Index()
        {
            return View();
        }
        public ActionResult _Index(DateTime? From, DateTime? To, string AccountID)
        {
            var ledger = Ledger.GetLedger(From, To, AccountID);

            return PartialView("_Index", ledger);
        }

        // CASH BOOK
        public ActionResult CashBook()
        {
            return View();
        }
        public ActionResult _CashBook(DateTime? From, DateTime? To)
        {
            var ledger = Ledger.lstDinstinctDate(From, To);
            ViewBag.From = From;
            ViewBag.To = To;

            return PartialView(ledger);
        }

        public ActionResult PrintCashBook(DateTime? From, DateTime? To)
        {
            var ledger = Ledger.lstDinstinctDate(From, To);
            ViewBag.From = From;
            ViewBag.To = To;

            return View(ledger);
        }

        public ActionResult PrintLedger(DateTime? From, DateTime? To, string AccountID)
        {
            var ledger = Ledger.GetLedger(From, To, AccountID);
            ViewBag.From = From;
            ViewBag.To = To;
            ViewBag.AccountID = AccountID;

            return View(ledger);
        }
    }
}