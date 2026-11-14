using System.Security.Claims;
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
public class SessionsController : ControllerBase
{
    private readonly ICheckSessionService _sessionService;
    private readonly AppDbContext _db;
    private readonly IPermissionService _permissionService;

    public SessionsController(ICheckSessionService sessionService, AppDbContext db, IPermissionService permissionService)
    {
        _sessionService = sessionService;
        _db = db;
        _permissionService = permissionService;
    }

    private int GetCurrentUserId()
    {
        var idStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return int.TryParse(idStr, out var id) ? id : 1;
    }

    private string? GetCurrentRole() => User.FindFirstValue(ClaimTypes.Role);

    [HttpPost("start")]
    public async Task<ActionResult<SessionSummaryDto>> StartSession([FromBody] StartSessionRequest? request)
    {
        if (!await _permissionService.HasPermissionAsync(GetCurrentRole(), "start_checking_sessions"))
        {
            return StatusCode(403, new { message = "Start checking sessions permission is currently disabled for your role." });
        }

        var userId = GetCurrentUserId();
        var session = await _sessionService.StartSessionAsync(userId, request?.Notes);
        return Ok(session);
    }

    [HttpGet("active")]
    public async Task<ActionResult<SessionDetailsDto>> GetActiveSession()
    {
        var active = await _db.CheckSessions
            .Where(s => s.SessionStatus == "InProgress")
            .OrderByDescending(s => s.StartedAtUtc)
            .FirstOrDefaultAsync();

        if (active == null) return NotFound(new { message = "No session currently in progress." });

        var details = await _sessionService.GetSessionDetailsAsync(active.SessionId);
        return Ok(details);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<SessionDetailsDto>> GetSession(int id)
    {
        var details = await _sessionService.GetSessionDetailsAsync(id);
        if (details == null) return NotFound();
        return Ok(details);
    }

    [HttpPost("{id}/check")]
    public async Task<ActionResult> RecordCheck(int id, [FromBody] RecordCheckRequest request)
    {
        if (!await _permissionService.HasPermissionAsync(GetCurrentRole(), "mark_availability"))
        {
            return StatusCode(403, new { message = "Mark availability permission is currently disabled for your role." });
        }

        if (request.DeviceStatus != "Available" && request.DeviceStatus != "Missing")
        {
            return BadRequest(new { message = "Status must be either 'Available' or 'Missing'." });
        }

        try
        {
            var userId = GetCurrentUserId();
            var record = await _sessionService.RecordDeviceCheckAsync(id, userId, request);
            return Ok(new { message = "Device check recorded successfully.", checkRecordId = record.CheckRecordId });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{id}/batch-check")]
    public async Task<ActionResult> RecordBatchCheck(int id, [FromBody] BatchCheckRequest request)
    {
        if (!await _permissionService.HasPermissionAsync(GetCurrentRole(), "mark_availability"))
        {
            return StatusCode(403, new { message = "Mark availability permission is currently disabled for your role." });
        }

        if (request.Checks == null || request.Checks.Count == 0)
        {
            return BadRequest(new { message = "No device checks provided." });
        }

        try
        {
            var userId = GetCurrentUserId();
            var records = await _sessionService.RecordBatchCheckAsync(id, userId, request);
            return Ok(new { message = $"Successfully recorded {records.Count} device checks." });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{id}/complete")]
    public async Task<ActionResult<SessionSummaryDto>> CompleteSession(int id, [FromBody] CompleteSessionRequest? request)
    {
        if (!await _permissionService.HasPermissionAsync(GetCurrentRole(), "start_checking_sessions"))
        {
            return StatusCode(403, new { message = "Start checking sessions permission is currently disabled for your role." });
        }

        try
        {
            var summary = await _sessionService.CompleteSessionAsync(id, request?.Notes);
            return Ok(summary);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{id}/cancel")]
    public async Task<ActionResult<SessionSummaryDto>> CancelSession(int id)
    {
        if (!await _permissionService.HasPermissionAsync(GetCurrentRole(), "start_checking_sessions"))
        {
            return StatusCode(403, new { message = "Start checking sessions permission is currently disabled for your role." });
        }

        try
        {
            var summary = await _sessionService.CancelSessionAsync(id);
            return Ok(summary);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("recent")]
    public async Task<ActionResult<List<SessionSummaryDto>>> GetRecentSessions([FromQuery] int limit = 10)
    {
        var list = await _sessionService.GetRecentSessionsAsync(limit);
        return Ok(list);
    }

    [HttpPut("{id}")]
    public async Task<ActionResult> UpdateSession(int id, [FromBody] UpdateSessionRequest request)
    {
        if (!await _permissionService.HasPermissionAsync(GetCurrentRole(), "checking_sessions"))
        {
            return StatusCode(403, new { message = "Checking sessions permission is currently disabled for your role." });
        }

        var session = await _db.CheckSessions.FindAsync(id);
        if (session == null) return NotFound();

        if (!string.IsNullOrWhiteSpace(request.SessionStatus))
        {
            session.SessionStatus = request.SessionStatus.Trim();
            if (session.SessionStatus == "Completed" && !session.CompletedAtUtc.HasValue)
            {
                session.CompletedAtUtc = DateTime.UtcNow;
            }
        }

        session.Notes = request.Notes?.Trim();
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult> DeleteSession(int id)
    {
        if (!await _permissionService.HasPermissionAsync(GetCurrentRole(), "checking_sessions"))
        {
            return StatusCode(403, new { message = "Checking sessions permission is currently disabled for your role." });
        }

        var session = await _db.CheckSessions
            .Include(s => s.CheckRecords)
            .FirstOrDefaultAsync(s => s.SessionId == id);
        if (session == null) return NotFound();

        var recordIds = session.CheckRecords.Select(r => r.CheckRecordId).ToList();
        if (recordIds.Count > 0)
        {
            var incidents = await _db.MissingIncidents
                .Where(i => (i.FirstMissingCheckId.HasValue && recordIds.Contains(i.FirstMissingCheckId.Value)) ||
                            (i.LastMissingCheckId.HasValue && recordIds.Contains(i.LastMissingCheckId.Value)))
                .ToListAsync();
            foreach (var inc in incidents)
            {
                if (inc.FirstMissingCheckId.HasValue && recordIds.Contains(inc.FirstMissingCheckId.Value))
                    inc.FirstMissingCheckId = null;
                if (inc.LastMissingCheckId.HasValue && recordIds.Contains(inc.LastMissingCheckId.Value))
                    inc.LastMissingCheckId = null;
            }
            _db.DeviceCheckRecords.RemoveRange(session.CheckRecords);
        }

        _db.CheckSessions.Remove(session);
        await _db.SaveChangesAsync();
        return Ok(new { message = $"Checking session #{id} deleted." });
    }
}
