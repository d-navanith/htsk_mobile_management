using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using backend.Data;
using backend.Models;
using backend.Services;

namespace backend.Controllers;

public class CompareAuditsRequest
{
    public string ListA { get; set; } = string.Empty;
    public string ListB { get; set; } = string.Empty;
    public string? Title { get; set; }
    public string? ChecklistAName { get; set; }
    public string? ChecklistBName { get; set; }
    public bool SaveSession { get; set; } = true;
}

public class UpdateItemResolutionRequest
{
    public string ResolutionResult { get; set; } = string.Empty; // "Under Investigation", "Confirmed Lost", "Recovered", "Explained by Device Return"
    public string? InvestigationNotes { get; set; }
    public bool IsApproved { get; set; } = true;
}

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ReconciliationController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ReconciliationEngine _engine;
    private readonly IPermissionService _permissionService;
    private readonly ColomboTimeService _timeService;

    public ReconciliationController(
        AppDbContext db,
        ReconciliationEngine engine,
        IPermissionService permissionService,
        ColomboTimeService timeService)
    {
        _db = db;
        _engine = engine;
        _permissionService = permissionService;
        _timeService = timeService;
    }

    private string GetCurrentRole() =>
        User.FindFirst(ClaimMap("role"))?.Value
        ?? User.FindFirst(ClaimTypes.Role)?.Value
        ?? "Employee";

    private (int? UserId, string UserName) GetCurrentUserInfo()
    {
        var idStr = User.FindFirst(ClaimMap("nameid"))?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        int? uid = int.TryParse(idStr, out var parsed) ? parsed : null;
        var name = User.FindFirst(ClaimMap("unique_name"))?.Value ?? User.FindFirst(ClaimTypes.Name)?.Value ?? "System User";
        return (uid, name);
    }

    private static string ClaimMap(string shortType) =>
        shortType switch
        {
            "nameid" => "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier",
            "unique_name" => "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name",
            "role" => "http://schemas.microsoft.com/ws/2008/06/identity/claims/role",
            _ => shortType
        };

    [HttpGet("benchmark-data")]
    public ActionResult<object> GetBenchmarkData()
    {
        var (listA, listB) = ReconciliationEngine.GetSection9BenchmarkData();
        return Ok(new
        {
            title = "Section 9 Standard Validation Benchmark (70 vs 66 items)",
            checklistAName = "Checklist 1 (Previous Physical Audit)",
            checklistBName = "Checklist 2 (Latest Physical Audit)",
            listA,
            listB,
            expectedValues = new
            {
                rawA = 70,
                uniqueA = 67,
                duplicatesA = 3,
                rawB = 66,
                uniqueB = 64,
                duplicatesB = 2,
                common = 58,
                absent = 9,
                newlyFound = 6,
                netRawDifference = 4,
                netUniqueDifference = 3
            }
        });
    }

    [HttpPost("benchmark-run")]
    public async Task<ActionResult<ReconciliationComparisonResult>> RunBenchmark()
    {
        var (listA, listB) = ReconciliationEngine.GetSection9BenchmarkData();
        var (uid, uname) = GetCurrentUserInfo();

        var result = await _engine.CompareAsync(
            listA,
            listB,
            title: "Section 9 Standard Validation Benchmark Test",
            checklistAName: "Checklist 1 (Previous Audit - 70 raw)",
            checklistBName: "Checklist 2 (Latest Audit - 66 raw)",
            persistSession: false,
            userId: uid,
            userName: uname
        );

        return Ok(result);
    }

    [HttpPost("compare")]
    public async Task<ActionResult<ReconciliationComparisonResult>> CompareAudits([FromBody] CompareAuditsRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.ListA) || string.IsNullOrWhiteSpace(request.ListB))
        {
            return BadRequest(new { message = "Both Checklist 1 (Previous Audit) and Checklist 2 (Latest Audit) are required for comparison." });
        }

        var (uid, uname) = GetCurrentUserInfo();

        var result = await _engine.CompareAsync(
            request.ListA,
            request.ListB,
            title: request.Title ?? "Physical Device Inventory Reconciliation",
            checklistAName: request.ChecklistAName ?? "Previous Audit Checklist",
            checklistBName: request.ChecklistBName ?? "Latest Audit Checklist",
            persistSession: request.SaveSession,
            userId: uid,
            userName: uname
        );

        return Ok(result);
    }

    [HttpGet("sessions")]
    public async Task<ActionResult<object>> GetSessions()
    {
        var sessions = await _db.ReconciliationSessions
            .OrderByDescending(s => s.CreatedAtUtc)
            .Take(50)
            .Select(s => new
            {
                s.ReconciliationId,
                s.SessionCode,
                s.Title,
                AuditDateColombo = s.AuditDateUtc.AddHours(5.5).ToString("yyyy-MM-dd HH:mm"),
                s.Scope,
                s.ChecklistAName,
                s.ChecklistBName,
                s.TotalRawA,
                s.TotalUniqueA,
                s.DuplicateCountA,
                s.TotalRawB,
                s.TotalUniqueB,
                s.DuplicateCountB,
                s.CommonCount,
                s.AbsentCount,
                s.NewCount,
                s.ExplainedReturnCount,
                s.ExplainedReplaceCount,
                s.UnderInvestigationCount,
                s.ConfirmedLostCount,
                s.CreatedByName,
                s.Notes
            })
            .ToListAsync();

        return Ok(sessions);
    }

    [HttpGet("sessions/{id:int}")]
    public async Task<ActionResult<object>> GetSessionDetails(int id)
    {
        var session = await _db.ReconciliationSessions
            .Include(s => s.Items)
            .FirstOrDefaultAsync(s => s.ReconciliationId == id);

        if (session == null)
        {
            return NotFound(new { message = $"Reconciliation session with ID {id} was not found." });
        }

        return Ok(new
        {
            session.ReconciliationId,
            session.SessionCode,
            session.Title,
            AuditDateColombo = _timeService.FormatColombo(session.AuditDateUtc),
            session.Scope,
            session.ChecklistAName,
            session.ChecklistBName,
            session.TotalRawA,
            session.TotalUniqueA,
            session.DuplicateCountA,
            session.TotalRawB,
            session.TotalUniqueB,
            session.DuplicateCountB,
            session.CommonCount,
            session.AbsentCount,
            session.NewCount,
            session.ExplainedReturnCount,
            session.ExplainedReplaceCount,
            session.UnderInvestigationCount,
            session.ConfirmedLostCount,
            session.CreatedByName,
            session.Notes,
            items = session.Items.Select(item => new
            {
                item.ItemId,
                item.RawDeviceId,
                item.NormalizedDeviceId,
                item.MatchedDeviceId,
                item.DeviceName,
                item.BrandModel,
                item.IMEI,
                item.SerialNumber,
                item.PreviousEmployee,
                item.CurrentEmployee,
                item.PreviousStatus,
                item.CurrentStatus,
                item.PreviousLocation,
                item.CurrentLocation,
                LastReturnDateColombo = item.LastReturnDateUtc.HasValue ? _timeService.FormatColombo(item.LastReturnDateUtc.Value) : null,
                LastAssignmentDateColombo = item.LastAssignmentDateUtc.HasValue ? _timeService.FormatColombo(item.LastAssignmentDateUtc.Value) : null,
                LastVerifiedDateColombo = item.LastVerifiedDateUtc.HasValue ? _timeService.FormatColombo(item.LastVerifiedDateUtc.Value) : null,
                item.ReconciliationResult,
                item.InvestigationNotes,
                item.IsApproved
            }).ToList()
        });
    }

    [HttpPost("items/{itemId:int}/resolution")]
    public async Task<ActionResult<object>> UpdateItemResolution(int itemId, [FromBody] UpdateItemResolutionRequest request)
    {
        var item = await _db.ReconciliationItems.FirstOrDefaultAsync(i => i.ItemId == itemId);
        if (item == null)
        {
            return NotFound(new { message = "Reconciliation item not found." });
        }

        item.ReconciliationResult = request.ResolutionResult;
        if (!string.IsNullOrWhiteSpace(request.InvestigationNotes))
        {
            item.InvestigationNotes = $"{item.InvestigationNotes}\n[{_timeService.FormatColombo(_timeService.UtcNow)}] {request.InvestigationNotes.Trim()}".Trim();
        }
        item.IsApproved = request.IsApproved;

        // If item is linked to a device in database and status changed, update device lifecycle
        if (item.MatchedDeviceId.HasValue)
        {
            var device = await _db.MobileDevices.FirstOrDefaultAsync(d => d.DeviceId == item.MatchedDeviceId.Value);
            if (device != null)
            {
                var (_, adminName) = GetCurrentUserInfo();
                if (request.ResolutionResult == "Confirmed Lost")
                {
                    device.CurrentStatus = "ConfirmedLost";
                    _db.DeviceMovements.Add(new DeviceMovement
                    {
                        DeviceId = device.DeviceId,
                        MovementType = "Investigation",
                        FromStatus = device.CurrentStatus,
                        ToStatus = "ConfirmedLost",
                        Reason = request.InvestigationNotes ?? "Formally confirmed lost after full investigation.",
                        MovementDateUtc = DateTime.UtcNow,
                        PerformedByName = adminName
                    });
                }
                else if (request.ResolutionResult == "Recovered Device")
                {
                    device.CurrentStatus = "Available";
                    _db.DeviceMovements.Add(new DeviceMovement
                    {
                        DeviceId = device.DeviceId,
                        MovementType = "Recovery",
                        FromStatus = "UnderInvestigation",
                        ToStatus = "Available",
                        Reason = request.InvestigationNotes ?? "Device physically recovered and restored to inventory.",
                        MovementDateUtc = DateTime.UtcNow,
                        PerformedByName = adminName
                    });
                }
                device.UpdatedAtUtc = DateTime.UtcNow;
            }
        }

        await _db.SaveChangesAsync();

        return Ok(new { message = "Item resolution updated successfully.", itemId = item.ItemId, item.ReconciliationResult });
    }

    [HttpGet("balance-report")]
    public async Task<ActionResult<MathematicalBalanceReport>> GetBalanceReport()
    {
        var allDevices = await _db.MobileDevices.ToListAsync();

        var totalReg = allDevices.Count(d => d.IsActive);
        var avail = allDevices.Count(d => d.IsActive && (d.CurrentStatus == "Available" || (d.PhoneNumber == null || d.PhoneNumber == "")));
        var assigned = allDevices.Count(d => d.IsActive && d.CurrentStatus != "Available" && d.CurrentStatus != "Missing" && !string.IsNullOrWhiteSpace(d.PhoneNumber));
        var underMaint = allDevices.Count(d => d.IsActive && d.CurrentStatus == "UnderMaintenance");
        var underInvest = allDevices.Count(d => d.IsActive && (d.CurrentStatus == "UnderInvestigation" || d.CurrentStatus == "Missing"));
        var lost = allDevices.Count(d => d.IsActive && d.CurrentStatus == "ConfirmedLost");
        var retired = allDevices.Count(d => !d.IsActive || d.CurrentStatus == "Retired");

        var sumStatus = avail + assigned + underMaint + underInvest + lost + retired;

        return Ok(new MathematicalBalanceReport
        {
            TotalRegisteredDevices = totalReg,
            AvailableDevices = avail,
            AssignedDevices = assigned,
            UnderMaintenanceDevices = underMaint,
            UnderInvestigationDevices = underInvest,
            ConfirmedLostDevices = lost,
            RetiredDevices = retired,
            IsLifecycleBalanced = (sumStatus == totalReg),
            LifecycleDiscrepancy = totalReg - sumStatus,
            Explanation = $"Balanced: {totalReg} Total = {avail} Available + {assigned} Assigned + {underMaint} Under Maintenance + {underInvest} Under Investigation + {lost} Confirmed Lost + {retired} Retired."
        });
    }
}
