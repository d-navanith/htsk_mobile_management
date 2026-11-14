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
public class IncidentsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ITimeService _timeService;

    public IncidentsController(AppDbContext db, ITimeService timeService)
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
    public async Task<ActionResult<List<MissingIncidentDto>>> GetIncidents([FromQuery] string? status)
    {
        var query = _db.MissingIncidents
            .Include(i => i.Device)
                .ThenInclude(d => d!.Group)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(status))
        {
            query = query.Where(i => i.IncidentStatus.ToLower() == status.Trim().ToLower());
        }

        var incidents = await query
            .OrderByDescending(i => i.FirstMissingAtUtc)
            .ToListAsync();

        var list = incidents.Select(i => new MissingIncidentDto(
            IncidentId: i.IncidentId,
            DeviceId: i.DeviceId,
            MobileCode: i.Device?.MobileCode ?? "Unknown",
            MobileName: i.Device?.MobileName,
            GroupName: i.Device?.Group?.GroupName ?? "Unassigned",
            ConsecutiveMissingCount: i.ConsecutiveMissingCount,
            IncidentStatus: i.IncidentStatus,
            FirstMissingAtColombo: _timeService.FormatColombo(i.FirstMissingAtUtc),
            RecoveredAtColombo: _timeService.FormatColombo(i.RecoveredAtUtc),
            ActionTaken: i.ActionTaken,
            Notes: i.Notes,
            IsEscalated: i.IncidentStatus == "Escalated" || (i.IncidentStatus == "Open" && i.ConsecutiveMissingCount >= 2)
        )).ToList();

        return Ok(list);
    }

    [HttpPost]
    [Authorize(Roles = "Developer,ITAdmin")]
    public async Task<ActionResult<MissingIncidentDto>> CreateIncident([FromBody] CreateIncidentRequest request)
    {
        var device = await _db.MobileDevices
            .Include(d => d.Group)
            .FirstOrDefaultAsync(d => d.DeviceId == request.DeviceId);

        if (device == null)
        {
            return BadRequest(new { message = "Selected mobile phone does not exist." });
        }

        var now = _timeService.UtcNow;
        var userId = GetCurrentUserId();
        var status = string.IsNullOrWhiteSpace(request.IncidentStatus)
            ? (request.ConsecutiveMissingCount >= 2 ? "Escalated" : "Open")
            : request.IncidentStatus.Trim();

        // Also record or update the latest session check record so Dashboard, Reports, and History stay in sync
        var latestSession = await _db.CheckSessions
            .OrderByDescending(s => s.StartedAtUtc)
            .FirstOrDefaultAsync();

        DeviceCheckRecord? linkedRecord = null;
        if (latestSession != null)
        {
            linkedRecord = await _db.DeviceCheckRecords
                .FirstOrDefaultAsync(r => r.SessionId == latestSession.SessionId && r.DeviceId == device.DeviceId);

            var targetDeviceStatus = (status == "Recovered" || status == "Closed") ? "Available" : "Missing";
            var noteText = request.ActionTaken?.Trim() ?? request.Notes?.Trim() ?? $"Incident ({status}) logged";

            if (linkedRecord != null)
            {
                linkedRecord.DeviceStatus = targetDeviceStatus;
                linkedRecord.CheckedAtUtc = now;
                linkedRecord.CheckedByUserId = userId;
                linkedRecord.Notes = noteText;
            }
            else
            {
                linkedRecord = new DeviceCheckRecord
                {
                    SessionId = latestSession.SessionId,
                    DeviceId = device.DeviceId,
                    GroupId = device.GroupId,
                    CheckedByUserId = userId,
                    DeviceStatus = targetDeviceStatus,
                    CheckedAtUtc = now,
                    Notes = noteText
                };
                _db.DeviceCheckRecords.Add(linkedRecord);
                await _db.SaveChangesAsync();
            }
        }

        var incident = new MissingIncident
        {
            DeviceId = device.DeviceId,
            FirstMissingCheckId = linkedRecord?.CheckRecordId,
            LastMissingCheckId = linkedRecord?.CheckRecordId,
            ConsecutiveMissingCount = Math.Max(1, request.ConsecutiveMissingCount),
            IncidentStatus = status,
            FirstMissingAtUtc = now,
            RecoveredAtUtc = (status == "Recovered" || status == "Closed") ? now : null,
            ActionTaken = request.ActionTaken?.Trim(),
            Notes = request.Notes?.Trim()
        };

        device.CurrentStatus = (status == "Recovered" || status == "Closed") ? "Available" : "Missing";
        device.UpdatedAtUtc = now;

        _db.MissingIncidents.Add(incident);
        await _db.SaveChangesAsync();

        return Ok(new MissingIncidentDto(
            IncidentId: incident.IncidentId,
            DeviceId: device.DeviceId,
            MobileCode: device.MobileCode,
            MobileName: device.MobileName,
            GroupName: device.Group?.GroupName ?? "Unassigned",
            ConsecutiveMissingCount: incident.ConsecutiveMissingCount,
            IncidentStatus: incident.IncidentStatus,
            FirstMissingAtColombo: _timeService.FormatColombo(incident.FirstMissingAtUtc),
            RecoveredAtColombo: _timeService.FormatColombo(incident.RecoveredAtUtc),
            ActionTaken: incident.ActionTaken,
            Notes: incident.Notes,
            IsEscalated: incident.IncidentStatus == "Escalated" || (incident.IncidentStatus == "Open" && incident.ConsecutiveMissingCount >= 2)
        ));
    }

    [HttpPut("{id}/action")]
    [Authorize(Roles = "Developer,ITAdmin")]
    public async Task<ActionResult> UpdateIncidentAction(int id, [FromBody] UpdateIncidentActionRequest request)
    {
        var incident = await _db.MissingIncidents
            .Include(i => i.Device)
            .FirstOrDefaultAsync(i => i.IncidentId == id);
        if (incident == null) return NotFound();

        var now = _timeService.UtcNow;
        var userId = GetCurrentUserId();

        if (request.ActionTaken != null)
        {
            incident.ActionTaken = request.ActionTaken.Trim();
        }

        if (request.Notes != null)
        {
            incident.Notes = request.Notes.Trim();
        }

        if (!string.IsNullOrWhiteSpace(request.Status))
        {
            var newStatus = request.Status.Trim();
            incident.IncidentStatus = newStatus;

            if (newStatus == "Recovered" || newStatus == "Closed")
            {
                incident.RecoveredAtUtc = now;

                // 1. Update Device CurrentStatus -> Available
                if (incident.Device != null)
                {
                    incident.Device.CurrentStatus = "Available";
                    incident.Device.UpdatedAtUtc = now;
                }

                // 2. Update linked and recent Missing DeviceCheckRecords for this device so Dashboard, Reports, and History immediately reflect recovery
                var checkRecordsToUpdate = await _db.DeviceCheckRecords
                    .Where(r => r.DeviceId == incident.DeviceId &&
                                (r.CheckRecordId == incident.LastMissingCheckId ||
                                 r.CheckRecordId == incident.FirstMissingCheckId ||
                                 (r.DeviceStatus == "Missing" && r.CheckedAtUtc >= incident.FirstMissingAtUtc.AddMinutes(-5))))
                    .ToListAsync();

                // Also check the very latest check record for this device
                var latestDeviceRecord = await _db.DeviceCheckRecords
                    .Where(r => r.DeviceId == incident.DeviceId)
                    .OrderByDescending(r => r.CheckedAtUtc)
                    .FirstOrDefaultAsync();

                if (latestDeviceRecord != null && latestDeviceRecord.DeviceStatus == "Missing" &&
                    !checkRecordsToUpdate.Any(c => c.CheckRecordId == latestDeviceRecord.CheckRecordId))
                {
                    checkRecordsToUpdate.Add(latestDeviceRecord);
                }

                var recoverySummary = !string.IsNullOrWhiteSpace(incident.ActionTaken)
                    ? $"Recovered: {incident.ActionTaken}"
                    : !string.IsNullOrWhiteSpace(incident.Notes)
                    ? $"Recovered: {incident.Notes}"
                    : $"Marked {newStatus} by Admin";

                foreach (var rec in checkRecordsToUpdate)
                {
                    rec.DeviceStatus = "Available";
                    rec.CheckedAtUtc = now;
                    rec.CheckedByUserId = userId;
                    rec.Notes = recoverySummary;
                }

                // 3. Mark related missing notifications as read and add recovery notification
                var unreadAlerts = await _db.Notifications
                    .Where(n => (n.IncidentId == incident.IncidentId || n.DeviceId == incident.DeviceId) && !n.IsRead)
                    .ToListAsync();
                foreach (var n in unreadAlerts)
                {
                    n.IsRead = true;
                }

                if (incident.Device != null)
                {
                    _db.Notifications.Add(new Notification
                    {
                        DeviceId = incident.DeviceId,
                        IncidentId = incident.IncidentId,
                        NotificationType = "Recovered",
                        Message = $"Device {incident.Device.MobileCode} status updated to {newStatus}. {recoverySummary}",
                        Priority = "Low",
                        IsRead = false,
                        CreatedAtUtc = now
                    });
                }
            }
            else if (newStatus == "Open" || newStatus == "Escalated")
            {
                incident.RecoveredAtUtc = null;
                if (newStatus == "Escalated" && incident.ConsecutiveMissingCount < 2)
                {
                    incident.ConsecutiveMissingCount = 2;
                }

                // 1. Update Device CurrentStatus -> Missing
                if (incident.Device != null)
                {
                    incident.Device.CurrentStatus = "Missing";
                    incident.Device.UpdatedAtUtc = now;
                }

                // 2. Update linked/latest check record so Dashboard, Reports, and History reflect Missing status
                var targetRecord = await _db.DeviceCheckRecords
                    .Where(r => r.DeviceId == incident.DeviceId &&
                                (r.CheckRecordId == incident.LastMissingCheckId || r.CheckRecordId == incident.FirstMissingCheckId))
                    .OrderByDescending(r => r.CheckedAtUtc)
                    .FirstOrDefaultAsync();

                if (targetRecord == null)
                {
                    targetRecord = await _db.DeviceCheckRecords
                        .Where(r => r.DeviceId == incident.DeviceId)
                        .OrderByDescending(r => r.CheckedAtUtc)
                        .FirstOrDefaultAsync();
                }

                var missingSummary = !string.IsNullOrWhiteSpace(incident.ActionTaken)
                    ? incident.ActionTaken
                    : !string.IsNullOrWhiteSpace(incident.Notes)
                    ? incident.Notes
                    : $"Incident #{incident.IncidentId} ({newStatus})";

                if (targetRecord != null)
                {
                    targetRecord.DeviceStatus = "Missing";
                    targetRecord.CheckedAtUtc = now;
                    targetRecord.CheckedByUserId = userId;
                    targetRecord.Notes = missingSummary;
                }
            }
        }
        else
        {
            // Status unchanged, but ActionTaken/Notes updated -> sync note to linked check record in History
            var linkedRecord = await _db.DeviceCheckRecords
                .Where(r => r.CheckRecordId == incident.LastMissingCheckId || r.CheckRecordId == incident.FirstMissingCheckId)
                .OrderByDescending(r => r.CheckedAtUtc)
                .FirstOrDefaultAsync();

            if (linkedRecord != null)
            {
                linkedRecord.Notes = !string.IsNullOrWhiteSpace(incident.ActionTaken)
                    ? incident.ActionTaken
                    : incident.Notes;
                linkedRecord.CheckedAtUtc = now;
                linkedRecord.CheckedByUserId = userId;
            }
        }

        await _db.SaveChangesAsync();
        return Ok(new { message = "Incident, device status, dashboard, reports, and history updated." });
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Developer,ITAdmin")]
    public async Task<ActionResult> DeleteIncident(int id)
    {
        var incident = await _db.MissingIncidents
            .Include(i => i.Device)
            .FirstOrDefaultAsync(i => i.IncidentId == id);
        if (incident == null) return NotFound();

        var linkedNotifs = await _db.Notifications.Where(n => n.IncidentId == id).ToListAsync();
        foreach (var n in linkedNotifs)
        {
            n.IncidentId = null;
        }

        // If this was an active incident and no other active incident exists for the device, restore device and check record to Available
        var otherActive = await _db.MissingIncidents
            .AnyAsync(i => i.DeviceId == incident.DeviceId && i.IncidentId != id && (i.IncidentStatus == "Open" || i.IncidentStatus == "Escalated"));

        if (!otherActive && incident.Device != null && incident.Device.CurrentStatus == "Missing")
        {
            incident.Device.CurrentStatus = "Available";
            incident.Device.UpdatedAtUtc = _timeService.UtcNow;

            var linkedChecks = await _db.DeviceCheckRecords
                .Where(r => r.CheckRecordId == incident.LastMissingCheckId || r.CheckRecordId == incident.FirstMissingCheckId)
                .ToListAsync();
            foreach (var c in linkedChecks)
            {
                c.DeviceStatus = "Available";
                c.Notes = "Incident deleted by Admin";
            }
        }

        _db.MissingIncidents.Remove(incident);
        await _db.SaveChangesAsync();
        return Ok(new { message = $"Incident #{id} deleted." });
    }
}
