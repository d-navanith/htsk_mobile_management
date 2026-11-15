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
public class NotificationsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ITimeService _timeService;
    private readonly IPermissionService _permissionService;

    public NotificationsController(AppDbContext db, ITimeService timeService, IPermissionService permissionService)
    {
        _db = db;
        _timeService = timeService;
        _permissionService = permissionService;
    }

    private async Task<bool> CanEditNotificationsAsync()
    {
        if (User.IsInRole("Developer")) return true;
        if (User.IsInRole("Employee"))
        {
            var perms = await _permissionService.GetAllPermissionsAsync();
            var notifPerm = perms.FirstOrDefault(p => p.FunctionKey.Equals("notifications", StringComparison.OrdinalIgnoreCase));
            return notifPerm != null && notifPerm.Employee && notifPerm.EmployeeCanEdit;
        }
        return false;
    }

    [HttpGet]
    public async Task<ActionResult<List<NotificationDto>>> GetNotifications([FromQuery] bool? unreadOnly)
    {
        var query = _db.Notifications
            .Include(n => n.Device)
            .AsQueryable();

        if (unreadOnly == true)
        {
            query = query.Where(n => !n.IsRead);
        }

        var list = await query
            .OrderByDescending(n => n.CreatedAtUtc)
            .Take(50)
            .ToListAsync();

        var dtos = list.Select(n => new NotificationDto(
            NotificationId: n.NotificationId,
            DeviceId: n.DeviceId,
            MobileCode: n.Device?.MobileCode,
            IncidentId: n.IncidentId,
            NotificationType: n.NotificationType,
            Message: n.Message,
            Priority: n.Priority,
            IsRead: n.IsRead,
            CreatedAtColombo: _timeService.FormatColombo(n.CreatedAtUtc)
        )).ToList();

        return Ok(dtos);
    }

    [HttpPost]
    public async Task<ActionResult<NotificationDto>> CreateNotification([FromBody] CreateNotificationRequest request)
    {
        if (!await CanEditNotificationsAsync())
        {
            return StatusCode(403, new { message = "Only Developer has full access to create or edit notifications." });
        }

        if (string.IsNullOrWhiteSpace(request.Message))
        {
            return BadRequest(new { message = "Notification message is required." });
        }

        var notif = new Notification
        {
            DeviceId = request.DeviceId,
            NotificationType = string.IsNullOrWhiteSpace(request.NotificationType) ? "SystemAlert" : request.NotificationType.Trim(),
            Message = request.Message.Trim(),
            Priority = string.IsNullOrWhiteSpace(request.Priority) ? "High" : request.Priority.Trim(),
            IsRead = false,
            CreatedAtUtc = _timeService.UtcNow
        };

        _db.Notifications.Add(notif);
        await _db.SaveChangesAsync();

        var device = request.DeviceId.HasValue ? await _db.MobileDevices.FindAsync(request.DeviceId.Value) : null;

        return Ok(new NotificationDto(
            NotificationId: notif.NotificationId,
            DeviceId: notif.DeviceId,
            MobileCode: device?.MobileCode,
            IncidentId: notif.IncidentId,
            NotificationType: notif.NotificationType,
            Message: notif.Message,
            Priority: notif.Priority,
            IsRead: notif.IsRead,
            CreatedAtColombo: _timeService.FormatColombo(notif.CreatedAtUtc)
        ));
    }

    [HttpPut("{id}")]
    public async Task<ActionResult> UpdateNotification(int id, [FromBody] UpdateNotificationRequest request)
    {
        if (!await CanEditNotificationsAsync())
        {
            return StatusCode(403, new { message = "Only Developer has full access to edit notifications." });
        }

        var n = await _db.Notifications.FindAsync(id);
        if (n == null) return NotFound();

        if (!string.IsNullOrWhiteSpace(request.Message))
            n.Message = request.Message.Trim();
        if (!string.IsNullOrWhiteSpace(request.Priority))
            n.Priority = request.Priority.Trim();
        n.IsRead = request.IsRead;

        await _db.SaveChangesAsync();
        return Ok(new { message = "Notification updated." });
    }

    [HttpPut("{id}/read")]
    public async Task<ActionResult> MarkRead(int id)
    {
        var n = await _db.Notifications.FindAsync(id);
        if (n == null) return NotFound();
        n.IsRead = true;
        await _db.SaveChangesAsync();
        return Ok(new { message = "Notification marked as read." });
    }

    [HttpPut("read-all")]
    public async Task<ActionResult> MarkAllRead()
    {
        var unread = await _db.Notifications.Where(n => !n.IsRead).ToListAsync();
        foreach (var n in unread)
        {
            n.IsRead = true;
        }
        await _db.SaveChangesAsync();
        return Ok(new { message = "All notifications marked as read." });
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult> DeleteNotification(int id)
    {
        if (!await CanEditNotificationsAsync())
        {
            return StatusCode(403, new { message = "Only Developer has full access to delete notifications." });
        }

        var n = await _db.Notifications.FindAsync(id);
        if (n == null) return NotFound();

        _db.Notifications.Remove(n);
        await _db.SaveChangesAsync();
        return Ok(new { message = "Notification deleted." });
    }
}
