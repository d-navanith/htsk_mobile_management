using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using backend.Data;
using backend.DTOs;
using backend.Models;
using backend.Services;

namespace backend.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class HistoryController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ITimeService _timeService;

    public HistoryController(AppDbContext db, ITimeService timeService)
    {
        _db = db;
        _timeService = timeService;
    }

    private int GetCurrentUserId()
    {
        var idStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return int.TryParse(idStr, out var id) ? id : 1;
    }

    [HttpGet]
    public async Task<ActionResult<List<CheckHistoryItemDto>>> GetHistory(
        [FromQuery] int? sessionId,
        [FromQuery] int? groupId,
        [FromQuery] int? deviceId,
        [FromQuery] string? mobileCode,
        [FromQuery] string? status,
        [FromQuery] int? checkedByUserId,
        [FromQuery] DateTime? date,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        var query = _db.DeviceCheckRecords
            .Include(r => r.Device)
            .Include(r => r.Group)
            .Include(r => r.CheckedByUser)
            .AsQueryable();

        if (sessionId.HasValue)
        {
            query = query.Where(r => r.SessionId == sessionId.Value);
        }

        if (groupId.HasValue)
        {
            query = query.Where(r => r.GroupId == groupId.Value);
        }

        if (deviceId.HasValue)
        {
            query = query.Where(r => r.DeviceId == deviceId.Value);
        }

        if (!string.IsNullOrWhiteSpace(mobileCode))
        {
            var code = mobileCode.Trim().ToLower();
            query = query.Where(r => r.Device != null && r.Device.MobileCode.ToLower().Contains(code));
        }

        if (!string.IsNullOrWhiteSpace(status))
        {
            query = query.Where(r => r.DeviceStatus.ToLower() == status.Trim().ToLower());
        }

        if (checkedByUserId.HasValue)
        {
            query = query.Where(r => r.CheckedByUserId == checkedByUserId.Value);
        }

        if (date.HasValue)
        {
            var colomboDate = date.Value.Date;
            var startColombo = new DateTime(colomboDate.Year, colomboDate.Month, colomboDate.Day, 0, 0, 0);
            var endColombo = startColombo.AddDays(1);
            var startUtc = _timeService.ToUtc(startColombo);
            var endUtc = _timeService.ToUtc(endColombo);

            query = query.Where(r => r.CheckedAtUtc >= startUtc && r.CheckedAtUtc < endUtc);
        }

        var total = await query.CountAsync();

        var records = await query
            .OrderByDescending(r => r.CheckedAtUtc)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var list = records.Select(r => new CheckHistoryItemDto(
            CheckRecordId: r.CheckRecordId,
            SessionId: r.SessionId,
            MobileCode: r.Device?.MobileCode ?? "Unknown",
            MobileName: r.Device?.MobileName,
            GroupName: r.Group?.GroupName ?? "Unknown",
            DeviceStatus: r.DeviceStatus,
            CheckedAtColombo: _timeService.FormatColombo(r.CheckedAtUtc),
            CheckedByAdmin: r.CheckedByUser?.FullName ?? r.CheckedByUser?.Username ?? "Unknown",
            Notes: r.Notes
        )).ToList();

        Response.Headers.Append("X-Total-Count", total.ToString());
        return Ok(list);
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Developer,ITAdmin")]
    public async Task<ActionResult> UpdateHistoryRecord(int id, [FromBody] UpdateHistoryRecordRequest request)
    {
        var record = await _db.DeviceCheckRecords
            .Include(r => r.Device)
            .FirstOrDefaultAsync(r => r.CheckRecordId == id);
        if (record == null) return NotFound();

        var now = _timeService.UtcNow;
        var userId = GetCurrentUserId();

        record.Notes = request.Notes?.Trim();
        record.CheckedAtUtc = now;
        record.CheckedByUserId = userId;

        if (request.DeviceStatus == "Available" || request.DeviceStatus == "Missing")
        {
            record.DeviceStatus = request.DeviceStatus;
            if (record.Device != null)
            {
                record.Device.CurrentStatus = request.DeviceStatus;
                record.Device.UpdatedAtUtc = now;
            }

            // Synchronize MissingIncidents so Dashboard, Incidents, and Reports stay 100% consistent
            var activeIncidents = await _db.MissingIncidents
                .Where(i => i.DeviceId == record.DeviceId && (i.IncidentStatus == "Open" || i.IncidentStatus == "Escalated"))
                .ToListAsync();

            if (request.DeviceStatus == "Available")
            {
                foreach (var inc in activeIncidents)
                {
                    inc.IncidentStatus = "Recovered";
                    inc.RecoveredAtUtc = now;
                    inc.ActionTaken = !string.IsNullOrWhiteSpace(record.Notes)
                        ? record.Notes
                        : "Marked Available via Checking History";
                }
            }
            else if (request.DeviceStatus == "Missing")
            {
                if (activeIncidents.Count == 0)
                {
                    var linkedInc = await _db.MissingIncidents
                        .Where(i => i.FirstMissingCheckId == record.CheckRecordId || i.LastMissingCheckId == record.CheckRecordId)
                        .OrderByDescending(i => i.FirstMissingAtUtc)
                        .FirstOrDefaultAsync();

                    if (linkedInc != null)
                    {
                        linkedInc.IncidentStatus = linkedInc.ConsecutiveMissingCount >= 2 ? "Escalated" : "Open";
                        linkedInc.RecoveredAtUtc = null;
                        if (!string.IsNullOrWhiteSpace(record.Notes))
                        {
                            linkedInc.Notes = record.Notes;
                        }
                    }
                    else
                    {
                        _db.MissingIncidents.Add(new MissingIncident
                        {
                            DeviceId = record.DeviceId,
                            FirstMissingCheckId = record.CheckRecordId,
                            LastMissingCheckId = record.CheckRecordId,
                            ConsecutiveMissingCount = 1,
                            IncidentStatus = "Open",
                            FirstMissingAtUtc = now,
                            Notes = record.Notes ?? $"Marked Missing in Session #{record.SessionId}"
                        });
                    }
                }
            }
        }

        await _db.SaveChangesAsync();
        return Ok(new { message = "Check record, device status, incident, dashboard, and report updated." });
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Developer,ITAdmin")]
    public async Task<ActionResult> DeleteHistoryRecord(int id)
    {
        var record = await _db.DeviceCheckRecords.FindAsync(id);
        if (record == null) return NotFound();

        // Clear any MissingIncident FK references to this check record before deleting
        var incidentsFirst = await _db.MissingIncidents.Where(i => i.FirstMissingCheckId == id).ToListAsync();
        foreach (var i in incidentsFirst) i.FirstMissingCheckId = null;

        var incidentsLast = await _db.MissingIncidents.Where(i => i.LastMissingCheckId == id).ToListAsync();
        foreach (var i in incidentsLast) i.LastMissingCheckId = null;

        _db.DeviceCheckRecords.Remove(record);
        await _db.SaveChangesAsync();
        return Ok(new { message = "Check record deleted." });
    }
}
