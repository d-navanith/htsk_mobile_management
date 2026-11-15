using Microsoft.EntityFrameworkCore;
using backend.Data;
using backend.DTOs;
using backend.Models;

namespace backend.Services;

public interface ICheckSessionService
{
    Task<SessionSummaryDto> StartSessionAsync(int userId, string? notes);
    Task<DeviceCheckRecord> RecordDeviceCheckAsync(int sessionId, int userId, RecordCheckRequest request);
    Task<List<DeviceCheckRecord>> RecordBatchCheckAsync(int sessionId, int userId, BatchCheckRequest request);
    Task<SessionSummaryDto> CompleteSessionAsync(int sessionId, string? notes);
    Task<SessionSummaryDto> CancelSessionAsync(int sessionId);
    Task<SessionDetailsDto?> GetSessionDetailsAsync(int sessionId);
    Task<List<SessionSummaryDto>> GetRecentSessionsAsync(int limit = 10);
    Task<DashboardDto> GetDashboardDataAsync();
}

public class CheckSessionService : ICheckSessionService
{
    private readonly AppDbContext _db;
    private readonly ITimeService _time;

    public CheckSessionService(AppDbContext db, ITimeService time)
    {
        _db = db;
        _time = time;
    }

    public async Task<SessionSummaryDto> StartSessionAsync(int userId, string? notes)
    {
        // Check if there is already an active InProgress session
        var activeSession = await _db.CheckSessions
            .Include(s => s.StartedByUser)
            .Include(s => s.CheckRecords)
            .FirstOrDefaultAsync(s => s.SessionStatus == "InProgress");

        var totalActiveDevices = await _db.MobileDevices.CountAsync(d => d.IsActive);

        if (activeSession != null)
        {
            if (activeSession.TotalDevices < totalActiveDevices)
            {
                activeSession.TotalDevices = totalActiveDevices;
                await _db.SaveChangesAsync();
            }
            return MapToSummary(activeSession);
        }

        var session = new CheckSession
        {
            StartedByUserId = userId,
            StartedAtUtc = _time.UtcNow,
            SessionStatus = "InProgress",
            TotalDevices = totalActiveDevices,
            Notes = notes
        };

        _db.CheckSessions.Add(session);
        await _db.SaveChangesAsync();

        var loadedUser = await _db.Users.FindAsync(userId);
        session.StartedByUser = loadedUser;

        return MapToSummary(session);
    }

    public async Task<DeviceCheckRecord> RecordDeviceCheckAsync(int sessionId, int userId, RecordCheckRequest request)
    {
        var session = await _db.CheckSessions.FindAsync(sessionId);
        if (session == null || session.SessionStatus != "InProgress")
        {
            throw new InvalidOperationException("Session is not active or does not exist.");
        }

        var device = await _db.MobileDevices.FindAsync(request.DeviceId);
        if (device == null || !device.IsActive)
        {
            throw new InvalidOperationException("Device not found or is inactive.");
        }

        var checkTime = _time.UtcNow;

        // Check if already checked in this session
        var existingRecord = await _db.DeviceCheckRecords
            .FirstOrDefaultAsync(r => r.SessionId == sessionId && r.DeviceId == request.DeviceId);

        DeviceCheckRecord record;
        string previousCheckStatus = existingRecord?.DeviceStatus ?? string.Empty;

        if (existingRecord != null)
        {
            existingRecord.DeviceStatus = request.DeviceStatus;
            existingRecord.CheckedByUserId = userId;
            existingRecord.CheckedAtUtc = checkTime;
            existingRecord.Notes = request.Notes;
            existingRecord.GroupId = device.GroupId;
            record = existingRecord;
        }
        else
        {
            record = new DeviceCheckRecord
            {
                SessionId = sessionId,
                DeviceId = request.DeviceId,
                GroupId = device.GroupId,
                CheckedByUserId = userId,
                DeviceStatus = request.DeviceStatus,
                CheckedAtUtc = checkTime,
                Notes = request.Notes
            };
            _db.DeviceCheckRecords.Add(record);
        }

        await _db.SaveChangesAsync(); // Save to ensure record has an Id for incidents

        // Update device current status
        device.CurrentStatus = request.DeviceStatus;
        device.UpdatedAtUtc = checkTime;

        // Apply Incident Management Logic
        await HandleIncidentWorkflowAsync(device, record, request.DeviceStatus, previousCheckStatus, sessionId);

        await _db.SaveChangesAsync();

        return record;
    }

    public async Task<List<DeviceCheckRecord>> RecordBatchCheckAsync(int sessionId, int userId, BatchCheckRequest request)
    {
        var results = new List<DeviceCheckRecord>();
        foreach (var item in request.Checks)
        {
            var res = await RecordDeviceCheckAsync(sessionId, userId, item);
            results.Add(res);
        }
        return results;
    }

    private async Task HandleIncidentWorkflowAsync(MobileDevice device, DeviceCheckRecord checkRecord, string newStatus, string previousCheckStatusInSameSession, int sessionId)
    {
        var activeIncident = await _db.MissingIncidents
            .Where(i => i.DeviceId == device.DeviceId && (i.IncidentStatus == "Open" || i.IncidentStatus == "Escalated"))
            .OrderByDescending(i => i.FirstMissingAtUtc)
            .FirstOrDefaultAsync();

        if (newStatus == "Missing")
        {
            if (activeIncident == null)
            {
                // Scenario A: First missing occurrence
                var newIncident = new MissingIncident
                {
                    DeviceId = device.DeviceId,
                    FirstMissingCheckId = checkRecord.CheckRecordId,
                    LastMissingCheckId = checkRecord.CheckRecordId,
                    ConsecutiveMissingCount = 1,
                    IncidentStatus = "Open",
                    FirstMissingAtUtc = checkRecord.CheckedAtUtc,
                    Notes = $"First missing check in Session #{sessionId}."
                };
                _db.MissingIncidents.Add(newIncident);
                await _db.SaveChangesAsync();

                _db.Notifications.Add(new Notification
                {
                    DeviceId = device.DeviceId,
                    IncidentId = newIncident.IncidentId,
                    NotificationType = "FirstMissing",
                    Message = $"Device {device.MobileCode} ({device.MobileName ?? "Unnamed"}) marked Missing in Session #{sessionId}.",
                    Priority = "Medium",
                    CreatedAtUtc = _time.UtcNow
                });
            }
            else
            {
                // If it was already checked as Missing in this exact session, don't increment consecutive count twice
                if (previousCheckStatusInSameSession != "Missing")
                {
                    // Scenario C: Consecutive missing occurrence
                    activeIncident.ConsecutiveMissingCount += 1;
                    activeIncident.LastMissingCheckId = checkRecord.CheckRecordId;

                    var threshold = 2; // configurable threshold
                    var thresholdSetting = await _db.SystemSettings.FirstOrDefaultAsync(s => s.SettingKey == "ConsecutiveMissingThreshold");
                    if (thresholdSetting != null && int.TryParse(thresholdSetting.SettingValue, out var val))
                    {
                        threshold = val;
                    }

                    if (activeIncident.ConsecutiveMissingCount >= threshold)
                    {
                        activeIncident.IncidentStatus = "Escalated";
                        _db.Notifications.Add(new Notification
                        {
                            DeviceId = device.DeviceId,
                            IncidentId = activeIncident.IncidentId,
                            NotificationType = "ConsecutiveMissing",
                            Message = $"CRITICAL ALERT: Device {device.MobileCode} is Missing for {activeIncident.ConsecutiveMissingCount} consecutive checks!",
                            Priority = "High",
                            CreatedAtUtc = _time.UtcNow
                        });
                    }
                }
            }
        }
        else if (newStatus == "Available")
        {
            // Scenario B: Phone becomes available
            if (activeIncident != null)
            {
                activeIncident.IncidentStatus = "Recovered";
                activeIncident.RecoveredAtUtc = checkRecord.CheckedAtUtc;
                activeIncident.Notes = (activeIncident.Notes ?? "") + $" Recovered in Session #{sessionId}.";

                _db.Notifications.Add(new Notification
                {
                    DeviceId = device.DeviceId,
                    IncidentId = activeIncident.IncidentId,
                    NotificationType = "Recovered",
                    Message = $"Device {device.MobileCode} has been recovered and verified Available in Session #{sessionId}.",
                    Priority = "Low",
                    CreatedAtUtc = _time.UtcNow
                });
            }
        }
    }

    public async Task<SessionSummaryDto> CompleteSessionAsync(int sessionId, string? notes)
    {
        var session = await _db.CheckSessions
            .Include(s => s.StartedByUser)
            .Include(s => s.CheckRecords)
            .FirstOrDefaultAsync(s => s.SessionId == sessionId);

        if (session == null) throw new InvalidOperationException("Session not found.");
        if (session.SessionStatus != "InProgress") throw new InvalidOperationException("Session is not in progress.");

        session.SessionStatus = "Completed";
        session.CompletedAtUtc = _time.UtcNow;
        if (!string.IsNullOrWhiteSpace(notes))
        {
            session.Notes = string.IsNullOrWhiteSpace(session.Notes) ? notes : $"{session.Notes} | {notes}";
        }

        // Automatically identify any unverified active devices at the end of a physical inspection and flag them as Missing
        var activeDevices = await _db.MobileDevices.Where(d => d.IsActive).ToListAsync();
        var checkedIds = session.CheckRecords.Select(r => r.DeviceId).ToHashSet();
        var unverifiedDevices = activeDevices.Where(d => !checkedIds.Contains(d.DeviceId)).ToList();

        foreach (var dev in unverifiedDevices)
        {
            var autoMissingReq = new RecordCheckRequest(
                DeviceId: dev.DeviceId,
                DeviceStatus: "Missing",
                Notes: "Automatically identified as missing (unverified during physical inspection)"
            );
            // Temporarily set status back to InProgress for helper or record directly
            var checkTime = _time.UtcNow;
            var autoRecord = new DeviceCheckRecord
            {
                SessionId = sessionId,
                DeviceId = dev.DeviceId,
                GroupId = dev.GroupId,
                CheckedByUserId = session.StartedByUserId,
                DeviceStatus = "Missing",
                CheckedAtUtc = checkTime,
                Notes = autoMissingReq.Notes
            };
            _db.DeviceCheckRecords.Add(autoRecord);
            await _db.SaveChangesAsync();

            dev.CurrentStatus = "Missing";
            dev.UpdatedAtUtc = checkTime;

            await HandleIncidentWorkflowAsync(dev, autoRecord, "Missing", string.Empty, sessionId);
        }

        await _db.SaveChangesAsync();
        return MapToSummary(session);
    }

    public async Task<SessionSummaryDto> CancelSessionAsync(int sessionId)
    {
        var session = await _db.CheckSessions
            .Include(s => s.StartedByUser)
            .Include(s => s.CheckRecords)
            .FirstOrDefaultAsync(s => s.SessionId == sessionId);

        if (session == null) throw new InvalidOperationException("Session not found.");
        if (session.SessionStatus != "InProgress") throw new InvalidOperationException("Session is not in progress.");

        session.SessionStatus = "Cancelled";
        session.CompletedAtUtc = _time.UtcNow;
        await _db.SaveChangesAsync();

        return MapToSummary(session);
    }

    public async Task<SessionDetailsDto?> GetSessionDetailsAsync(int sessionId)
    {
        var session = await _db.CheckSessions
            .Include(s => s.StartedByUser)
            .Include(s => s.CheckRecords)
                .ThenInclude(r => r.CheckedByUser)
            .FirstOrDefaultAsync(s => s.SessionId == sessionId);

        if (session == null) return null;

        var activeDevices = await _db.MobileDevices
            .Include(d => d.Group)
            .Include(d => d.MissingIncidents)
            .Include(d => d.CheckRecords)
            .Where(d => d.IsActive)
            .ToListAsync();

        var checkMap = session.CheckRecords.ToDictionary(r => r.DeviceId);

        var deviceList = activeDevices.Select(d =>
        {
            var isChecked = checkMap.TryGetValue(d.DeviceId, out var rec);
            var prevRecord = d.CheckRecords
                .Where(c => c.SessionId != sessionId)
                .OrderByDescending(c => c.CheckedAtUtc)
                .FirstOrDefault();

            var hasActiveIncident = d.MissingIncidents.Any(i => i.IncidentStatus == "Open" || i.IncidentStatus == "Escalated");
            var prevMissing = hasActiveIncident || (prevRecord != null && prevRecord.DeviceStatus == "Missing");
            var lastSummary = prevRecord != null
                ? $"Last session: {prevRecord.DeviceStatus} at {_time.FormatColombo(prevRecord.CheckedAtUtc, "hh:mm tt")}"
                : "No previous session record";

            return new DeviceSessionCheckDto(
                DeviceId: d.DeviceId,
                MobileCode: d.MobileCode,
                MobileName: d.MobileName,
                Brand: d.Brand,
                Model: d.Model,
                GroupId: d.GroupId,
                GroupName: d.Group?.GroupName ?? "Unassigned",
                CurrentDeviceStatus: d.CurrentStatus,
                IsCheckedInSession: isChecked,
                CheckRecordId: rec?.CheckRecordId,
                CheckedStatus: rec?.DeviceStatus,
                CheckedAtColombo: rec != null ? _time.FormatColombo(rec.CheckedAtUtc) : null,
                CheckedByAdmin: rec?.CheckedByUser?.FullName ?? rec?.CheckedByUser?.Username,
                CheckNotes: rec?.Notes,
                Description: d.Description,
                PreviouslyMissing: prevMissing,
                LastSessionSummary: lastSummary,
                PhoneNumber: d.PhoneNumber,
                IMEI: d.IMEI,
                SerialNumber: d.SerialNumber
            );
        }).OrderBy(d => d.GroupName).ThenBy(d => d.MobileCode).ToList();

        var checkedCount = session.CheckRecords.Count;
        var availCount = session.CheckRecords.Count(r => r.DeviceStatus == "Available");
        var missCount = session.CheckRecords.Count(r => r.DeviceStatus == "Missing");
        var uncheckCount = Math.Max(0, activeDevices.Count - checkedCount);

        return new SessionDetailsDto(
            SessionId: session.SessionId,
            StartedByAdmin: session.StartedByUser?.FullName ?? session.StartedByUser?.Username ?? "Unknown",
            StartedAtColombo: _time.FormatColombo(session.StartedAtUtc),
            CompletedAtColombo: _time.FormatColombo(session.CompletedAtUtc),
            SessionStatus: session.SessionStatus,
            TotalExpectedDevices: activeDevices.Count,
            CheckedCount: checkedCount,
            AvailableCount: availCount,
            MissingCount: missCount,
            UncheckedCount: uncheckCount,
            Notes: session.Notes,
            Devices: deviceList
        );
    }

    public async Task<List<SessionSummaryDto>> GetRecentSessionsAsync(int limit = 10)
    {
        var sessions = await _db.CheckSessions
            .Include(s => s.StartedByUser)
            .Include(s => s.CheckRecords)
            .OrderByDescending(s => s.StartedAtUtc)
            .Take(limit)
            .ToListAsync();

        return sessions.Select(MapToSummary).ToList();
    }

    public async Task<DashboardDto> GetDashboardDataAsync()
    {
        // Reconcile any recovered incidents whose Device or CheckRecord was still marked Missing
        var recoveredIncidents = await _db.MissingIncidents
            .Include(i => i.Device)
            .Where(i => i.IncidentStatus == "Recovered" || i.IncidentStatus == "Closed")
            .ToListAsync();
        bool reconciled = false;
        foreach (var inc in recoveredIncidents)
        {
            var hasActive = await _db.MissingIncidents
                .AnyAsync(o => o.DeviceId == inc.DeviceId && (o.IncidentStatus == "Open" || o.IncidentStatus == "Escalated"));
            if (!hasActive && inc.Device != null && inc.Device.CurrentStatus == "Missing")
            {
                inc.Device.CurrentStatus = "Available";
                inc.Device.UpdatedAtUtc = inc.RecoveredAtUtc ?? _time.UtcNow;
                reconciled = true;
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
                    reconciled = true;
                }
            }
        }
        if (reconciled)
        {
            await _db.SaveChangesAsync();
        }

        var totalDevices = await _db.MobileDevices.CountAsync(d => d.IsActive);
        var availableDevices = await _db.MobileDevices.CountAsync(d => d.IsActive && d.CurrentStatus == "Available");
        var missingDevices = await _db.MobileDevices.CountAsync(d => d.IsActive && d.CurrentStatus == "Missing");
        var notCheckedDevices = await _db.MobileDevices.CountAsync(d => d.IsActive && d.CurrentStatus == "NotChecked");
        var assignedDevices = await _db.MobileDevices.CountAsync(d => d.IsActive && d.CurrentStatus != "Missing" && d.PhoneNumber != null && d.PhoneNumber != "");
        var availableUnassignedDevices = await _db.MobileDevices.CountAsync(d => d.IsActive && d.CurrentStatus != "Missing" && (d.PhoneNumber == null || d.PhoneNumber == ""));
        var totalGroups = await _db.Groups.CountAsync(g => g.IsActive);
        var totalSessions = await _db.CheckSessions.CountAsync();

        var latestSessionEntity = await _db.CheckSessions
            .Include(s => s.StartedByUser)
            .Include(s => s.CheckRecords)
            .OrderByDescending(s => s.StartedAtUtc)
            .FirstOrDefaultAsync();

        if (latestSessionEntity != null && latestSessionEntity.TotalDevices < totalDevices)
        {
            latestSessionEntity.TotalDevices = totalDevices;
            await _db.SaveChangesAsync();
        }

        SessionSummaryDto? latestSession = latestSessionEntity != null ? MapToSummary(latestSessionEntity) : null;

        var uncheckedInCurrent = 0;
        if (latestSessionEntity != null && latestSessionEntity.SessionStatus == "InProgress")
        {
            uncheckedInCurrent = Math.Max(0, totalDevices - latestSessionEntity.CheckRecords.Count);
        }

        // Escalated / Repeated missing incidents
        var escalatedIncidents = await _db.MissingIncidents
            .Include(i => i.Device)
                .ThenInclude(d => d!.Group)
            .Include(i => i.Device)
                .ThenInclude(d => d!.CheckRecords)
            .Where(i => i.IncidentStatus == "Escalated" || (i.IncidentStatus == "Open" && i.ConsecutiveMissingCount >= 2))
            .OrderByDescending(i => i.ConsecutiveMissingCount)
            .ToListAsync();

        var alertList = escalatedIncidents.Select(i =>
        {
            var lastVerifiedRec = i.Device?.CheckRecords
                .Where(c => c.DeviceStatus == "Available")
                .OrderByDescending(c => c.CheckedAtUtc)
                .FirstOrDefault();

            return new MissingIncidentDto(
                IncidentId: i.IncidentId,
                DeviceId: i.DeviceId,
                MobileCode: i.Device?.MobileCode ?? "Unknown",
                MobileName: i.Device?.MobileName,
                GroupName: i.Device?.Group?.GroupName ?? "Unknown",
                ConsecutiveMissingCount: i.ConsecutiveMissingCount,
                IncidentStatus: i.IncidentStatus,
                FirstMissingAtColombo: _time.FormatColombo(i.FirstMissingAtUtc) ?? "-",
                RecoveredAtColombo: _time.FormatColombo(i.RecoveredAtUtc),
                ActionTaken: i.ActionTaken,
                Notes: i.Notes,
                IsEscalated: true,
                Brand: i.Device?.Brand,
                Model: i.Device?.Model,
                IMEI: i.Device?.IMEI,
                SerialNumber: i.Device?.SerialNumber,
                AssignedTo: i.Device?.PhoneNumber,
                LastKnownLocation: i.Device?.Description,
                PreviousAssignmentDetails: i.Notes,
                LastVerifiedAtColombo: lastVerifiedRec != null
                    ? _time.FormatColombo(lastVerifiedRec.CheckedAtUtc)
                    : (i.Device != null ? _time.FormatColombo(i.Device.CreatedAtUtc) : null)
            );
        }).ToList();

        // Interval calculation
        var intervalMinutes = 120;
        var intervalSetting = await _db.SystemSettings.FirstOrDefaultAsync(s => s.SettingKey == "CheckingIntervalMinutes");
        if (intervalSetting != null && int.TryParse(intervalSetting.SettingValue, out var im))
        {
            intervalMinutes = im;
        }

        string? nextDueColombo = null;
        bool isOverdue = false;
        int minutesUntilNextDue = 0;

        if (latestSessionEntity != null)
        {
            var nextDueUtc = latestSessionEntity.StartedAtUtc.AddMinutes(intervalMinutes);
            nextDueColombo = _time.FormatColombo(nextDueUtc);

            var diff = nextDueUtc - _time.UtcNow;
            minutesUntilNextDue = (int)Math.Round(diff.TotalMinutes);
            if (diff.TotalMinutes < 0 && latestSessionEntity.SessionStatus != "InProgress")
            {
                isOverdue = true;
            }
        }

        return new DashboardDto(
            TotalDevices: totalDevices,
            AvailableDevices: availableDevices,
            MissingDevices: missingDevices,
            NotCheckedDevices: notCheckedDevices,
            TotalGroups: totalGroups,
            TotalSessions: totalSessions,
            LatestSession: latestSession,
            UncheckedInCurrentSession: uncheckedInCurrent,
            RepeatedMissingAlertCount: alertList.Count,
            HighPriorityAlerts: alertList,
            CurrentColomboTime: _time.FormatColombo(_time.UtcNow, "yyyy-MM-dd HH:mm:ss (UTC+05:30)"),
            NextSessionDueColomboTime: nextDueColombo,
            CheckingIntervalMinutes: intervalMinutes,
            IsSessionOverdue: isOverdue,
            MinutesUntilNextDue: minutesUntilNextDue,
            GroupProgress: await BuildGroupProgressAsync(latestSessionEntity),
            RecentActivities: await BuildRecentActivitiesAsync(),
            ActiveIncidentsCount: await _db.MissingIncidents.CountAsync(i => i.IncidentStatus == "Open" || i.IncidentStatus == "Escalated"),
            UnreadNotificationsCount: await _db.Notifications.CountAsync(n => !n.IsRead),
            AssignedDevices: assignedDevices,
            AvailableUnassignedDevices: availableUnassignedDevices
        );
    }

    private async Task<List<GroupSessionProgressDto>> BuildGroupProgressAsync(CheckSession? latestSession)
    {
        var groups = await _db.Groups
            .Include(g => g.Devices)
            .Where(g => g.IsActive)
            .OrderBy(g => g.GroupName)
            .ToListAsync();

        var checkedDeviceIds = latestSession != null
            ? latestSession.CheckRecords.Select(r => r.DeviceId).ToHashSet()
            : new HashSet<int>();

        return groups.Select(g =>
        {
            var activeDevs = g.Devices.Where(d => d.IsActive).ToList();
            var total = activeDevs.Count;
            var checkedCnt = activeDevs.Count(d => checkedDeviceIds.Contains(d.DeviceId));
            var status = total == 0 || checkedCnt == 0
                ? "Pending"
                : checkedCnt >= total
                ? "Completed"
                : "In progress";

            return new GroupSessionProgressDto(
                GroupId: g.GroupId,
                GroupName: g.GroupName,
                CheckedCount: checkedCnt,
                TotalDevices: total,
                Status: status
            );
        }).ToList();
    }

    private async Task<List<RecentActivityDto>> BuildRecentActivitiesAsync()
    {
        var activities = new List<RecentActivityDto>();

        var recentChecks = await _db.DeviceCheckRecords
            .Include(r => r.Device)
            .Include(r => r.Group)
            .Include(r => r.CheckedByUser)
            .OrderByDescending(r => r.CheckedAtUtc)
            .Take(5)
            .ToListAsync();

        foreach (var rec in recentChecks)
        {
            var isAvail = rec.DeviceStatus == "Available";
            activities.Add(new RecentActivityDto(
                Id: $"chk-{rec.CheckRecordId}",
                Title: isAvail
                    ? $"{rec.Device?.MobileCode ?? "Phone"} marked available"
                    : $"{rec.Device?.MobileCode ?? "Phone"} marked missing",
                Subtitle: $"{rec.CheckedByUser?.FullName ?? "IT Admin"} · {rec.Group?.GroupName ?? "Group"}",
                TimeColombo: _time.FormatColombo(rec.CheckedAtUtc, "h:mm tt"),
                Type: isAvail ? "available" : "missing"
            ));
        }

        if (activities.Count < 4)
        {
            var recentSessions = await _db.CheckSessions
                .Include(s => s.StartedByUser)
                .OrderByDescending(s => s.StartedAtUtc)
                .Take(2)
                .ToListAsync();

            foreach (var s in recentSessions)
            {
                activities.Add(new RecentActivityDto(
                    Id: $"sess-{s.SessionId}",
                    Title: "Checking session started",
                    Subtitle: $"{s.StartedByUser?.FullName ?? "IT Admin"} · {s.TotalDevices} phones",
                    TimeColombo: _time.FormatColombo(s.StartedAtUtc, "h:mm tt"),
                    Type: "session"
                ));
            }
        }

        return activities.Take(5).ToList();
    }

    private SessionSummaryDto MapToSummary(CheckSession s)
    {
        var checkedCount = s.CheckRecords?.Count ?? 0;
        var total = Math.Max(s.TotalDevices, checkedCount);

        return new SessionSummaryDto(
            SessionId: s.SessionId,
            StartedByAdmin: s.StartedByUser?.FullName ?? s.StartedByUser?.Username ?? "Unknown",
            StartedAtColombo: _time.FormatColombo(s.StartedAtUtc),
            CompletedAtColombo: _time.FormatColombo(s.CompletedAtUtc),
            SessionStatus: s.SessionStatus,
            TotalDevices: total,
            CheckedCount: checkedCount,
            AvailableCount: s.CheckRecords?.Count(r => r.DeviceStatus == "Available") ?? 0,
            MissingCount: s.CheckRecords?.Count(r => r.DeviceStatus == "Missing") ?? 0,
            Notes: s.Notes
        );
    }
}
