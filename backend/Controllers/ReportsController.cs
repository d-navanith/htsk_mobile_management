using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using backend.Data;
using backend.DTOs;
using backend.Services;

namespace backend.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ReportsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ITimeService _timeService;

    public ReportsController(AppDbContext db, ITimeService timeService)
    {
        _db = db;
        _timeService = timeService;
    }

    private async Task ReconcileRecoveredIncidentsAsync()
    {
        // Ensure any incident marked Recovered/Closed has its Device and linked CheckRecord updated to Available
        var recoveredIncidents = await _db.MissingIncidents
            .Include(i => i.Device)
            .Where(i => i.IncidentStatus == "Recovered" || i.IncidentStatus == "Closed")
            .ToListAsync();

        bool changed = false;
        foreach (var inc in recoveredIncidents)
        {
            var hasOtherActive = await _db.MissingIncidents
                .AnyAsync(o => o.DeviceId == inc.DeviceId && (o.IncidentStatus == "Open" || o.IncidentStatus == "Escalated"));

            if (!hasOtherActive && inc.Device != null && inc.Device.CurrentStatus == "Missing")
            {
                inc.Device.CurrentStatus = "Available";
                inc.Device.UpdatedAtUtc = inc.RecoveredAtUtc ?? _timeService.UtcNow;
                changed = true;
            }

            if (inc.LastMissingCheckId.HasValue || inc.FirstMissingCheckId.HasValue)
            {
                var linkedRecords = await _db.DeviceCheckRecords
                    .Where(r => (r.CheckRecordId == inc.LastMissingCheckId || r.CheckRecordId == inc.FirstMissingCheckId) &&
                                r.DeviceStatus == "Missing")
                    .ToListAsync();

                foreach (var rec in linkedRecords)
                {
                    rec.DeviceStatus = "Available";
                    rec.Notes = !string.IsNullOrWhiteSpace(inc.ActionTaken)
                        ? $"Recovered: {inc.ActionTaken}"
                        : "Recovered (Verified Available)";
                    changed = true;
                }
            }
        }

        if (changed)
        {
            await _db.SaveChangesAsync();
        }
    }

    [HttpGet("by-date")]
    public async Task<ActionResult<DateFilteredReportDto>> GetReportByDate([FromQuery] string? date)
    {
        await ReconcileRecoveredIncidentsAsync();

        var nowColombo = _timeService.ColomboNow;
        DateTime targetDate = nowColombo.Date;
        if (!string.IsNullOrWhiteSpace(date) && DateTime.TryParse(date, out var parsed))
        {
            targetDate = parsed.Date;
        }

        var nextDate = targetDate.AddDays(1);
        var startUtc = _timeService.ToUtc(targetDate);
        var endUtc = _timeService.ToUtc(nextDate);

        // 1. Checking Sessions on targetDate
        var sessions = await _db.CheckSessions
            .Include(s => s.StartedByUser)
            .Include(s => s.CheckRecords)
            .Where(s => s.StartedAtUtc >= startUtc && s.StartedAtUtc < endUtc)
            .OrderByDescending(s => s.StartedAtUtc)
            .ToListAsync();

        var sessionDtos = sessions.Select(s =>
        {
            var startedColombo = _timeService.ToColomboTime(s.StartedAtUtc);
            var code = $"CHK-{startedColombo:yyyy-MMdd}-{s.SessionId:D2}";
            var sChecked = s.CheckRecords.Count;
            var sAvail = s.CheckRecords.Count(r => r.DeviceStatus == "Available");
            var sMiss = s.CheckRecords.Count(r => r.DeviceStatus == "Missing");

            return new DateSessionItemDto(
                SessionId: s.SessionId,
                SessionCode: code,
                StartedAtColombo: _timeService.FormatColombo(s.StartedAtUtc),
                CompletedAtColombo: _timeService.FormatColombo(s.CompletedAtUtc),
                StartedByAdmin: s.StartedByUser?.FullName ?? s.StartedByUser?.Username ?? "IT Admin",
                SessionStatus: s.SessionStatus,
                TotalDevices: s.TotalDevices,
                CheckedCount: sChecked,
                AvailableCount: sAvail,
                MissingCount: sMiss,
                UncheckedCount: Math.Max(0, s.TotalDevices - sChecked),
                Notes: s.Notes
            );
        }).ToList();

        // 2. All Device Check Records on targetDate (with times)
        var checks = await _db.DeviceCheckRecords
            .Include(r => r.Device)
                .ThenInclude(d => d!.MissingIncidents)
            .Include(r => r.Group)
            .Include(r => r.CheckedByUser)
            .Include(r => r.Session)
            .Where(r => r.CheckedAtUtc >= startUtc && r.CheckedAtUtc < endUtc)
            .OrderByDescending(r => r.CheckedAtUtc)
            .ToListAsync();

        var checkTimeDtos = checks.Select(r => new CheckHistoryItemDto(
            CheckRecordId: r.CheckRecordId,
            SessionId: r.SessionId,
            MobileCode: r.Device?.MobileCode ?? $"DEV-{r.DeviceId}",
            MobileName: r.Device?.MobileName ?? r.Device?.Model,
            GroupName: r.Group?.GroupName ?? "Unassigned",
            DeviceStatus: r.DeviceStatus,
            CheckedAtColombo: _timeService.FormatColombo(r.CheckedAtUtc),
            CheckedByAdmin: r.CheckedByUser?.FullName ?? r.CheckedByUser?.Username ?? "IT Admin",
            Notes: r.Notes
        )).ToList();

        // 3. Missing Items on targetDate (ONLY items that are actually Missing)
        var missingChecks = checks.Where(c => c.DeviceStatus == "Missing").ToList();
        var missingItemDtos = missingChecks.Select(r =>
        {
            var sColombo = r.Session != null
                ? _timeService.ToColomboTime(r.Session.StartedAtUtc)
                : _timeService.ToColomboTime(r.CheckedAtUtc);
            var sCode = $"CHK-{sColombo:yyyy-MMdd}-{r.SessionId:D2}";
            var incident = r.Device?.MissingIncidents
                .Where(i => i.IncidentStatus == "Open" || i.IncidentStatus == "Escalated")
                .OrderByDescending(i => i.FirstMissingAtUtc)
                .FirstOrDefault()
                ?? r.Device?.MissingIncidents
                    .OrderByDescending(i => i.FirstMissingAtUtc)
                    .FirstOrDefault();

            return new DateMissingItemDto(
                Id: r.CheckRecordId,
                SessionId: r.SessionId,
                SessionCode: sCode,
                MobileCode: r.Device?.MobileCode ?? $"DEV-{r.DeviceId}",
                MobileName: r.Device?.MobileName ?? r.Device?.Model,
                GroupName: r.Group?.GroupName ?? "Unassigned",
                CheckedAtColombo: _timeService.FormatColombo(r.CheckedAtUtc) ?? "-",
                CheckedByAdmin: r.CheckedByUser?.FullName ?? r.CheckedByUser?.Username ?? "IT Admin",
                ConsecutiveMissingCount: incident?.ConsecutiveMissingCount ?? 1,
                IncidentStatus: incident?.IncidentStatus ?? "Open",
                Notes: r.Notes ?? incident?.ActionTaken
            );
        }).ToList();

        // 4. Daily Summary for targetDate
        // Show latest session's available/missing device counts if sessions exist on that date so user isn't confused by summed check rows across multiple sessions
        var latestSessionOnDate = sessionDtos.FirstOrDefault();
        var availCount = latestSessionOnDate != null
            ? latestSessionOnDate.AvailableCount
            : checks.Count(c => c.DeviceStatus == "Available");
        var missCount = missingItemDtos.Count;
        var uniqueMissing = missingChecks.Select(c => c.DeviceId).Distinct().Count();
        var recoveredCount = await _db.MissingIncidents
            .CountAsync(mi => mi.RecoveredAtUtc >= startUtc && mi.RecoveredAtUtc < endUtc);

        var summaryDto = new DailyReportDto(
            DateColombo: targetDate.ToString("yyyy-MM-dd"),
            SessionsRun: sessions.Count,
            TotalChecksRecorded: checks.Count,
            AvailableCount: availCount,
            MissingCount: missCount,
            UniqueMissingDevices: uniqueMissing,
            RecoveredCount: recoveredCount
        );

        // 5. Month Activity for Calendar Indicators
        var monthStart = new DateTime(targetDate.Year, targetDate.Month, 1);
        var monthEnd = monthStart.AddMonths(1);
        var monthStartUtc = _timeService.ToUtc(monthStart);
        var monthEndUtc = _timeService.ToUtc(monthEnd);

        var monthSessions = await _db.CheckSessions
            .Where(s => s.StartedAtUtc >= monthStartUtc && s.StartedAtUtc < monthEndUtc)
            .Select(s => s.StartedAtUtc)
            .ToListAsync();

        var monthMissingChecks = await _db.DeviceCheckRecords
            .Where(r => r.CheckedAtUtc >= monthStartUtc && r.CheckedAtUtc < monthEndUtc && r.DeviceStatus == "Missing")
            .Select(r => r.CheckedAtUtc)
            .ToListAsync();

        var dayMap = new Dictionary<string, (int sessions, int missing)>();
        foreach (var sUtc in monthSessions)
        {
            var dKey = _timeService.ToColomboTime(sUtc).ToString("yyyy-MM-dd");
            dayMap.TryGetValue(dKey, out var cur);
            dayMap[dKey] = (cur.sessions + 1, cur.missing);
        }
        foreach (var mUtc in monthMissingChecks)
        {
            var dKey = _timeService.ToColomboTime(mUtc).ToString("yyyy-MM-dd");
            dayMap.TryGetValue(dKey, out var cur);
            dayMap[dKey] = (cur.sessions, cur.missing + 1);
        }

        var monthActivity = dayMap
            .Select(kv => new CalendarDaySummaryDto(kv.Key, kv.Value.sessions, kv.Value.missing))
            .OrderBy(x => x.DateColombo)
            .ToList();

        return Ok(new DateFilteredReportDto(
            SelectedDateColombo: targetDate.ToString("yyyy-MM-dd"),
            Summary: summaryDto,
            Sessions: sessionDtos,
            MissingItems: missingItemDtos,
            CheckTimes: checkTimeDtos,
            MonthActivity: monthActivity
        ));
    }

    [HttpGet("daily")]
    public async Task<ActionResult<List<DailyReportDto>>> GetDailyReport([FromQuery] int days = 7)
    {
        await ReconcileRecoveredIncidentsAsync();

        var nowColombo = _timeService.ColomboNow;
        var reports = new List<DailyReportDto>();

        for (int i = 0; i < days; i++)
        {
            var targetDate = nowColombo.Date.AddDays(-i);
            var nextDate = targetDate.AddDays(1);

            var startUtc = _timeService.ToUtc(targetDate);
            var endUtc = _timeService.ToUtc(nextDate);

            var sessionsCount = await _db.CheckSessions
                .CountAsync(s => s.StartedAtUtc >= startUtc && s.StartedAtUtc < endUtc);

            var checks = await _db.DeviceCheckRecords
                .Where(r => r.CheckedAtUtc >= startUtc && r.CheckedAtUtc < endUtc)
                .ToListAsync();

            var availCount = checks.Count(c => c.DeviceStatus == "Available");
            var missCount = checks.Count(c => c.DeviceStatus == "Missing");
            var uniqueMissing = checks.Where(c => c.DeviceStatus == "Missing").Select(c => c.DeviceId).Distinct().Count();

            var recoveredCount = await _db.MissingIncidents
                .CountAsync(mi => mi.RecoveredAtUtc >= startUtc && mi.RecoveredAtUtc < endUtc);

            reports.Add(new DailyReportDto(
                DateColombo: targetDate.ToString("yyyy-MM-dd"),
                SessionsRun: sessionsCount,
                TotalChecksRecorded: checks.Count,
                AvailableCount: availCount,
                MissingCount: missCount,
                UniqueMissingDevices: uniqueMissing,
                RecoveredCount: recoveredCount
            ));
        }

        return Ok(reports);
    }

    [HttpGet("group-availability")]
    public async Task<ActionResult<List<GroupAvailabilityReportDto>>> GetGroupAvailabilityReport()
    {
        await ReconcileRecoveredIncidentsAsync();

        var groups = await _db.Groups
            .Include(g => g.Devices)
            .Where(g => g.IsActive)
            .ToListAsync();

        var list = groups.Select(g =>
        {
            var activeDevs = g.Devices.Where(d => d.IsActive).ToList();
            var total = activeDevs.Count;
            var avail = activeDevs.Count(d => d.CurrentStatus == "Available");
            var miss = activeDevs.Count(d => d.CurrentStatus == "Missing");
            var pct = total > 0 ? Math.Round((double)avail / total * 100, 1) : 100.0;

            return new GroupAvailabilityReportDto(
                GroupId: g.GroupId,
                GroupName: g.GroupName,
                TotalDevices: total,
                AvailableDevices: avail,
                MissingDevices: miss,
                AvailabilityPercentage: pct
            );
        }).OrderBy(r => r.AvailabilityPercentage).ToList();

        return Ok(list);
    }

    [HttpGet("admin-activity")]
    public async Task<ActionResult<List<AdminActivityReportDto>>> GetAdminActivityReport()
    {
        var admins = await _db.Users
            .Include(u => u.Role)
            .Where(u => u.RoleId == 1 || u.RoleId == 2) // Developer & ITAdmin
            .ToListAsync();

        var list = new List<AdminActivityReportDto>();
        foreach (var admin in admins)
        {
            var sessionsStarted = await _db.CheckSessions.CountAsync(s => s.StartedByUserId == admin.UserId);
            var checksRecorded = await _db.DeviceCheckRecords.CountAsync(r => r.CheckedByUserId == admin.UserId);
            var lastCheck = await _db.DeviceCheckRecords
                .Where(r => r.CheckedByUserId == admin.UserId)
                .OrderByDescending(r => r.CheckedAtUtc)
                .FirstOrDefaultAsync();

            list.Add(new AdminActivityReportDto(
                UserId: admin.UserId,
                FullName: admin.FullName,
                Username: admin.Username,
                SessionsStarted: sessionsStarted,
                ChecksPerformed: checksRecorded,
                LastActiveColombo: lastCheck != null ? _timeService.FormatColombo(lastCheck.CheckedAtUtc) : null
            ));
        }

        return Ok(list);
    }
}
