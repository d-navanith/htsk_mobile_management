using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using backend.Data;
using backend.Models;
using backend.Services;

namespace backend.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AuditLogsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ColomboTimeService _timeService;

    public AuditLogsController(AppDbContext db, ColomboTimeService timeService)
    {
        _db = db;
        _timeService = timeService;
    }

    private string GetCurrentRole() =>
        User.FindFirst("http://schemas.microsoft.com/ws/2008/06/identity/claims/role")?.Value
        ?? User.FindFirst(ClaimTypes.Role)?.Value
        ?? User.FindFirst("role")?.Value
        ?? "Employee";

    [HttpGet]
    public async Task<ActionResult<object>> GetLogs(
        [FromQuery] string? search,
        [FromQuery] string? actionType,
        [FromQuery] string? entityName,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        // Enforce Developer-only access to system audit logs per specification
        var role = GetCurrentRole();
        if (!string.Equals(role, "Developer", StringComparison.OrdinalIgnoreCase))
        {
            return StatusCode(403, new { message = "Access Denied: System Audit Log inspection is restricted exclusively to System Developers." });
        }

        var query = _db.AuditLogs
            .Where(l => !l.Action.StartsWith("BCNF") && !l.Action.Contains("Migration"))
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var q = search.Trim().ToLower();
            query = query.Where(l =>
                l.UserName.ToLower().Contains(q) ||
                l.Action.ToLower().Contains(q) ||
                l.EntityName.ToLower().Contains(q) ||
                (l.EntityId != null && l.EntityId.ToLower().Contains(q)) ||
                (l.Details != null && l.Details.ToLower().Contains(q)));
        }

        if (!string.IsNullOrWhiteSpace(actionType) && actionType != "ALL")
        {
            query = query.Where(l => l.Action == actionType);
        }

        if (!string.IsNullOrWhiteSpace(entityName) && entityName != "ALL")
        {
            query = query.Where(l => l.EntityName == entityName);
        }

        var totalCount = await query.CountAsync();
        var safePage = Math.Max(1, page);
        var safePageSize = Math.Clamp(pageSize, 5, 100);

        var logs = await query
            .OrderByDescending(l => l.TimestampUtc)
            .Skip((safePage - 1) * safePageSize)
            .Take(safePageSize)
            .Select(l => new
            {
                l.LogId,
                l.UserId,
                l.UserName,
                l.UserRole,
                l.Action,
                l.EntityName,
                l.EntityId,
                l.Details,
                l.IpAddress,
                TimestampUtc = l.TimestampUtc,
                TimestampColombo = l.TimestampUtc.AddHours(5.5).ToString("yyyy-MM-dd HH:mm:ss")
            })
            .ToListAsync();

        return Ok(new
        {
            totalCount,
            page = safePage,
            pageSize = safePageSize,
            totalPages = (int)Math.Ceiling(totalCount / (double)safePageSize),
            logs
        });
    }

    [HttpGet("stats")]
    public async Task<ActionResult<object>> GetStats()
    {
        var role = GetCurrentRole();
        if (!string.Equals(role, "Developer", StringComparison.OrdinalIgnoreCase))
        {
            return StatusCode(403, new { message = "Access Denied: Restricted to System Developers." });
        }

        var total = await _db.AuditLogs.CountAsync();
        var todayStart = DateTime.UtcNow.Date;
        var todayCount = await _db.AuditLogs.CountAsync(l => l.TimestampUtc >= todayStart);

        var actionCounts = await _db.AuditLogs
            .GroupBy(l => l.Action)
            .Select(g => new { Action = g.Key, Count = g.Count() })
            .OrderByDescending(x => x.Count)
            .Take(6)
            .ToListAsync();

        var recentActivities = await _db.AuditLogs
            .OrderByDescending(l => l.TimestampUtc)
            .Take(5)
            .Select(l => new
            {
                l.LogId,
                l.UserName,
                l.UserRole,
                l.Action,
                l.EntityName,
                l.Details,
                TimestampColombo = l.TimestampUtc.AddHours(5.5).ToString("HH:mm:ss")
            })
            .ToListAsync();

        return Ok(new
        {
            totalAuditLogs = total,
            logsToday = todayCount,
            actionBreakdown = actionCounts,
            recentActivities
        });
    }
}
