using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Data.DAL;
using Data.Viewmodel;

namespace Data.BLL.Employee
{
    public class Designations
    {
        public static List<tblDesignation> List()
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                var designations = db.tblDesignations.ToList();
                var today = DateTime.Today;

                foreach (var designation in designations)
                {
                    var effectiveTiming = GetEffectiveTimingInternal(db, designation.ID, today);
                    if (effectiveTiming != null)
                    {
                        designation.MustCheckinTime = CombineWithAnchorDate(effectiveTiming.CheckInTime);
                        designation.LeavingTime = CombineWithAnchorDate(effectiveTiming.CheckOutTime);
                    }
                }

                return designations;
            }
        }

        public static tblDesignation GetByID(int? ID)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                var row = db.tblDesignations.Find(ID);
                if (row == null)
                {
                    return null;
                }

                var effectiveTiming = GetEffectiveTimingInternal(db, row.ID, DateTime.Today);
                if (effectiveTiming != null)
                {
                    row.MustCheckinTime = CombineWithAnchorDate(effectiveTiming.CheckInTime);
                    row.LeavingTime = CombineWithAnchorDate(effectiveTiming.CheckOutTime);
                }

                return row;
            }
        }

        public static List<DesignationTimingRangeViewModel> GetTimingRanges(int designationID)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                return db.tblDesignationTimings
                    .Where(x => x.DesignationID == designationID && x.IsActive)
                    .OrderByDescending(x => x.EffectiveFromDate)
                    .ToList()
                    .Select(x => new DesignationTimingRangeViewModel
                    {
                        EffectiveFromDate = x.EffectiveFromDate.Date,
                        CheckInHours = x.CheckInTime.Hours,
                        CheckInMinutes = x.CheckInTime.Minutes,
                        CheckOutHours = x.CheckOutTime.Hours,
                        CheckOutMinutes = x.CheckOutTime.Minutes
                    }).ToList();
            }
        }

        public static Tuple<DateTime?, DateTime?> GetEffectiveTimes(int designationID, DateTime? onDate)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                var effectiveTiming = GetEffectiveTimingInternal(db, designationID, onDate ?? DateTime.Today);
                if (effectiveTiming == null)
                {
                    var designation = db.tblDesignations.Find(designationID);
                    return Tuple.Create(designation?.MustCheckinTime, designation?.LeavingTime);
                }

                return Tuple.Create(
                    (DateTime?)CombineWithAnchorDate(effectiveTiming.CheckInTime),
                    (DateTime?)CombineWithAnchorDate(effectiveTiming.CheckOutTime));
            }
        }

        public static void Create(DesignationViewModel model, string updatedBy)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                var designation = new tblDesignation()
                {
                    Designation = model.Designation,
                    MustCheckinTime = model.MustCheckinTime,
                    LeavingTime = model.LeavingTime,
                    IsActive = true
                };

                db.tblDesignations.Add(designation);
                db.SaveChanges();

                var ranges = BuildRanges(model);
                if (ranges.Count == 0 && model.MustCheckinTime.HasValue && model.LeavingTime.HasValue)
                {
                    ranges.Add(new DesignationTimingRangeViewModel
                    {
                        EffectiveFromDate = (model.EffectiveFromDate ?? DateTime.Today).Date,
                        CheckInHours = model.MustCheckinTime.Value.Hour,
                        CheckInMinutes = model.MustCheckinTime.Value.Minute,
                        CheckOutHours = model.LeavingTime.Value.Hour,
                        CheckOutMinutes = model.LeavingTime.Value.Minute
                    });
                }

                SaveTimingRangesInternal(db, designation.ID, ranges, updatedBy);
            }
        }

        public static void Update(DesignationViewModel model, string updatedBy)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                var row = db.tblDesignations.Find(model.ID);
                if (row != null)
                {
                    row.Designation = model.Designation;

                    var ranges = BuildRanges(model);
                    if (ranges.Count == 0 && model.MustCheckinTime.HasValue && model.LeavingTime.HasValue)
                    {
                        ranges.Add(new DesignationTimingRangeViewModel
                        {
                            EffectiveFromDate = (model.EffectiveFromDate ?? DateTime.Today).Date,
                            CheckInHours = model.MustCheckinTime.Value.Hour,
                            CheckInMinutes = model.MustCheckinTime.Value.Minute,
                            CheckOutHours = model.LeavingTime.Value.Hour,
                            CheckOutMinutes = model.LeavingTime.Value.Minute
                        });
                    }

                    SaveTimingRangesInternal(db, row.ID, ranges, updatedBy);

                    var latestRange = ranges.OrderByDescending(x => x.EffectiveFromDate).FirstOrDefault();
                    if (latestRange != null)
                    {
                        row.MustCheckinTime = new DateTime(2020, 1, 1, latestRange.CheckInHours, latestRange.CheckInMinutes, 0);
                        row.LeavingTime = new DateTime(2020, 1, 1, latestRange.CheckOutHours, latestRange.CheckOutMinutes, 0);
                    }
                    else
                    {
                        row.MustCheckinTime = model.MustCheckinTime;
                        row.LeavingTime = model.LeavingTime;
                    }

                    db.SaveChanges();
                }
            }
        }

        private static List<DesignationTimingRangeViewModel> BuildRanges(DesignationViewModel model)
        {
            if (string.IsNullOrWhiteSpace(model.TimingRangesJson))
            {
                return new List<DesignationTimingRangeViewModel>();
            }

            try
            {
                return Newtonsoft.Json.JsonConvert
                    .DeserializeObject<List<DesignationTimingRangeViewModel>>(model.TimingRangesJson)
                    ?.Where(x => x != null)
                    .ToList() ?? new List<DesignationTimingRangeViewModel>();
            }
            catch
            {
                return new List<DesignationTimingRangeViewModel>();
            }
        }

        private static void SaveTimingRangesInternal(dbSchoolEntities db, int designationID, List<DesignationTimingRangeViewModel> ranges, string updatedBy)
        {
            var normalized = ranges
                .Where(x => x != null)
                .GroupBy(x => x.EffectiveFromDate.Date)
                .Select(g => g.First())
                .OrderBy(x => x.EffectiveFromDate.Date)
                .ToList();

            var existing = db.tblDesignationTimings.Where(x => x.DesignationID == designationID).ToList();
            if (existing.Count > 0)
            {
                db.tblDesignationTimings.RemoveRange(existing);
            }

            var now = DateTime.Now;
            foreach (var range in normalized)
            {
                db.tblDesignationTimings.Add(new tblDesignationTiming
                {
                    DesignationID = designationID,
                    EffectiveFromDate = range.EffectiveFromDate.Date,
                    CheckInTime = new TimeSpan(range.CheckInHours, range.CheckInMinutes, 0),
                    CheckOutTime = new TimeSpan(range.CheckOutHours, range.CheckOutMinutes, 0),
                    CreatedAt = now,
                    CreatedBy = string.IsNullOrWhiteSpace(updatedBy) ? "system" : updatedBy,
                    IsActive = true
                });
            }
        }

        private static tblDesignationTiming GetEffectiveTimingInternal(dbSchoolEntities db, int designationID, DateTime date)
        {
            return db.tblDesignationTimings
                .Where(x => x.DesignationID == designationID && x.IsActive && x.EffectiveFromDate <= date)
                .OrderByDescending(x => x.EffectiveFromDate)
                .FirstOrDefault();
        }

        private static DateTime CombineWithAnchorDate(TimeSpan time)
        {
            return new DateTime(2020, 1, 1, time.Hours, time.Minutes, 0);
        }
    }
}
