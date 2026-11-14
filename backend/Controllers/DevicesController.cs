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
public class DevicesController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ITimeService _timeService;
    private readonly IPermissionService _permissionService;

    public DevicesController(AppDbContext db, ITimeService timeService, IPermissionService permissionService)
    {
        _db = db;
        _timeService = timeService;
        _permissionService = permissionService;
    }

    private string? GetCurrentRole() => User.FindFirstValue(ClaimTypes.Role);

    [HttpGet]
    public async Task<ActionResult<List<DeviceDto>>> GetDevices(
        [FromQuery] string? search,
        [FromQuery] int? groupId,
        [FromQuery] string? status,
        [FromQuery] bool? isActive)
    {
        var query = _db.MobileDevices
            .Include(d => d.Group)
            .Include(d => d.MissingIncidents)
            .Include(d => d.CheckRecords)
                .ThenInclude(c => c.CheckedByUser)
            .AsQueryable();

        if (isActive.HasValue)
        {
            query = query.Where(d => d.IsActive == isActive.Value);
        }

        if (groupId.HasValue)
        {
            query = query.Where(d => d.GroupId == groupId.Value);
        }

        if (!string.IsNullOrWhiteSpace(status))
        {
            query = query.Where(d => d.CurrentStatus.ToLower() == status.Trim().ToLower());
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            query = query.Where(d =>
                d.MobileCode.ToLower().Contains(s) ||
                (d.MobileName != null && d.MobileName.ToLower().Contains(s)) ||
                (d.Brand != null && d.Brand.ToLower().Contains(s)) ||
                (d.Model != null && d.Model.ToLower().Contains(s)) ||
                (d.IMEI != null && d.IMEI.ToLower().Contains(s)) ||
                (d.PhoneNumber != null && d.PhoneNumber.ToLower().Contains(s)) ||
                (d.Group != null && d.Group.GroupName.ToLower().Contains(s))
            );
        }

        var devices = await query
            .OrderByDescending(d => d.CreatedAtUtc)
            .ToListAsync();

        var dtoList = devices.Select(d =>
        {
            var activeIncident = d.MissingIncidents.FirstOrDefault(i => i.IncidentStatus == "Open" || i.IncidentStatus == "Escalated");
            var lastCheck = d.CheckRecords.OrderByDescending(c => c.CheckedAtUtc).FirstOrDefault();

            return new DeviceDto(
                DeviceId: d.DeviceId,
                MobileCode: d.MobileCode,
                GroupId: d.GroupId,
                GroupName: d.Group?.GroupName ?? "Unassigned",
                MobileName: d.MobileName,
                Brand: d.Brand,
                Model: d.Model,
                IMEI: d.IMEI,
                PhoneNumber: d.PhoneNumber,
                SerialNumber: d.SerialNumber,
                Description: d.Description,
                CurrentStatus: d.CurrentStatus,
                IsActive: d.IsActive,
                ConsecutiveMissingCount: activeIncident?.ConsecutiveMissingCount ?? 0,
                CreatedAtColombo: _timeService.FormatColombo(d.CreatedAtUtc),
                UpdatedAtColombo: _timeService.FormatColombo(d.UpdatedAtUtc),
                LastCheckedAtColombo: lastCheck != null ? _timeService.FormatColombo(lastCheck.CheckedAtUtc) : null,
                LastCheckedByAdmin: lastCheck?.CheckedByUser?.FullName ?? lastCheck?.CheckedByUser?.Username
            );
        }).ToList();

        return Ok(dtoList);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<DeviceDto>> GetDevice(int id)
    {
        var d = await _db.MobileDevices
            .Include(x => x.Group)
            .Include(x => x.MissingIncidents)
            .Include(x => x.CheckRecords)
                .ThenInclude(c => c.CheckedByUser)
            .FirstOrDefaultAsync(x => x.DeviceId == id);

        if (d == null) return NotFound();

        var activeIncident = d.MissingIncidents.FirstOrDefault(i => i.IncidentStatus == "Open" || i.IncidentStatus == "Escalated");
        var lastCheck = d.CheckRecords.OrderByDescending(c => c.CheckedAtUtc).FirstOrDefault();

        return Ok(new DeviceDto(
            DeviceId: d.DeviceId,
            MobileCode: d.MobileCode,
            GroupId: d.GroupId,
            GroupName: d.Group?.GroupName ?? "Unassigned",
            MobileName: d.MobileName,
            Brand: d.Brand,
            Model: d.Model,
            IMEI: d.IMEI,
            PhoneNumber: d.PhoneNumber,
            SerialNumber: d.SerialNumber,
            Description: d.Description,
            CurrentStatus: d.CurrentStatus,
            IsActive: d.IsActive,
            ConsecutiveMissingCount: activeIncident?.ConsecutiveMissingCount ?? 0,
            CreatedAtColombo: _timeService.FormatColombo(d.CreatedAtUtc),
            UpdatedAtColombo: _timeService.FormatColombo(d.UpdatedAtUtc),
            LastCheckedAtColombo: lastCheck != null ? _timeService.FormatColombo(lastCheck.CheckedAtUtc) : null,
            LastCheckedByAdmin: lastCheck?.CheckedByUser?.FullName ?? lastCheck?.CheckedByUser?.Username
        ));
    }

    [HttpPost]
    public async Task<ActionResult<DeviceDto>> CreateDevice([FromBody] CreateDeviceRequest request)
    {
        if (!await _permissionService.HasPermissionAsync(GetCurrentRole(), "manage_mobile_phones"))
        {
            return StatusCode(403, new { message = "Manage mobile phones permission is currently disabled for your role." });
        }

        Group? group = null;
        if (!string.IsNullOrWhiteSpace(request.GroupName))
        {
            var gName = request.GroupName.Trim();
            group = await _db.Groups.FirstOrDefaultAsync(g => g.GroupName.ToLower() == gName.ToLower());
            if (group == null)
            {
                group = new Group
                {
                    GroupName = gName,
                    Description = "Created during phone registration",
                    IsActive = true,
                    CreatedAtUtc = _timeService.UtcNow,
                    UpdatedAtUtc = _timeService.UtcNow
                };
                _db.Groups.Add(group);
                await _db.SaveChangesAsync();
            }
            else if (!group.IsActive)
            {
                group.IsActive = true;
                group.UpdatedAtUtc = _timeService.UtcNow;
                await _db.SaveChangesAsync();
            }
        }
        else if (request.GroupId > 0)
        {
            group = await _db.Groups.FindAsync(request.GroupId);
        }

        if (group == null)
        {
            return BadRequest(new { message = "Please provide or select a valid group." });
        }

        string mobileCode;
        if (!string.IsNullOrWhiteSpace(request.MobileCode))
        {
            mobileCode = request.MobileCode.Trim();
            if (await _db.MobileDevices.AnyAsync(d => d.MobileCode.ToLower() == mobileCode.ToLower()))
            {
                return BadRequest(new { message = $"Mobile ID '{mobileCode}' already exists." });
            }
        }
        else
        {
            return BadRequest(new { message = "Mobile ID is required." });
        }

        var device = new MobileDevice
        {
            MobileCode = mobileCode,
            GroupId = group.GroupId,
            MobileName = request.MobileName?.Trim(),
            Brand = request.Brand?.Trim(),
            Model = request.Model?.Trim(),
            IMEI = request.IMEI?.Trim(),
            PhoneNumber = request.PhoneNumber?.Trim(),
            SerialNumber = request.SerialNumber?.Trim(),
            Description = request.Description?.Trim(),
            CurrentStatus = "Available",
            IsActive = true,
            CreatedAtUtc = _timeService.UtcNow,
            UpdatedAtUtc = _timeService.UtcNow
        };

        _db.MobileDevices.Add(device);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetDevice), new { id = device.DeviceId }, new DeviceDto(
            DeviceId: device.DeviceId,
            MobileCode: device.MobileCode,
            GroupId: device.GroupId,
            GroupName: group.GroupName,
            MobileName: device.MobileName,
            Brand: device.Brand,
            Model: device.Model,
            IMEI: device.IMEI,
            PhoneNumber: device.PhoneNumber,
            SerialNumber: device.SerialNumber,
            Description: device.Description,
            CurrentStatus: device.CurrentStatus,
            IsActive: device.IsActive,
            ConsecutiveMissingCount: 0,
            CreatedAtColombo: _timeService.FormatColombo(device.CreatedAtUtc),
            UpdatedAtColombo: _timeService.FormatColombo(device.UpdatedAtUtc),
            LastCheckedAtColombo: null
        ));
    }

    [HttpPut("{id}")]
    public async Task<ActionResult> UpdateDevice(int id, [FromBody] UpdateDeviceRequest request)
    {
        if (!await _permissionService.HasPermissionAsync(GetCurrentRole(), "manage_mobile_phones"))
        {
            return StatusCode(403, new { message = "Manage mobile phones permission is currently disabled for your role." });
        }

        var device = await _db.MobileDevices.FindAsync(id);
        if (device == null) return NotFound();

        Group? group = null;
        if (!string.IsNullOrWhiteSpace(request.GroupName))
        {
            var gName = request.GroupName.Trim();
            group = await _db.Groups.FirstOrDefaultAsync(g => g.GroupName.ToLower() == gName.ToLower());
            if (group == null)
            {
                group = new Group
                {
                    GroupName = gName,
                    Description = "Created during phone update",
                    IsActive = true,
                    CreatedAtUtc = _timeService.UtcNow,
                    UpdatedAtUtc = _timeService.UtcNow
                };
                _db.Groups.Add(group);
                await _db.SaveChangesAsync();
            }
            else if (!group.IsActive)
            {
                group.IsActive = true;
                group.UpdatedAtUtc = _timeService.UtcNow;
                await _db.SaveChangesAsync();
            }
        }
        else if (request.GroupId > 0)
        {
            group = await _db.Groups.FindAsync(request.GroupId);
        }

        if (group == null)
        {
            return BadRequest(new { message = "Please provide or select a valid group." });
        }

        if (!string.IsNullOrWhiteSpace(request.MobileCode))
        {
            var newCode = request.MobileCode.Trim();
            if (!string.Equals(device.MobileCode, newCode, StringComparison.OrdinalIgnoreCase))
            {
                if (await _db.MobileDevices.AnyAsync(d => d.DeviceId != id && d.MobileCode.ToLower() == newCode.ToLower()))
                {
                    return BadRequest(new { message = $"Mobile ID '{newCode}' already exists." });
                }
                device.MobileCode = newCode;
            }
        }

        device.GroupId = group.GroupId;
        device.MobileName = request.MobileName?.Trim();
        device.Brand = request.Brand?.Trim();
        device.Model = request.Model?.Trim();
        device.IMEI = request.IMEI?.Trim();
        device.PhoneNumber = request.PhoneNumber?.Trim();
        device.SerialNumber = request.SerialNumber?.Trim();
        device.Description = request.Description?.Trim();
        device.IsActive = request.IsActive;
        device.UpdatedAtUtc = _timeService.UtcNow;

        var latestCheck = await _db.DeviceCheckRecords
            .Where(r => r.DeviceId == id)
            .OrderByDescending(r => r.CheckedAtUtc)
            .FirstOrDefaultAsync();
        if (latestCheck != null)
        {
            latestCheck.GroupId = group.GroupId;
            latestCheck.CheckedAtUtc = _timeService.UtcNow;
            latestCheck.Notes = $"Phone details updated ({device.MobileCode})";
        }

        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult> DeleteDevice(int id)
    {
        if (!await _permissionService.HasPermissionAsync(GetCurrentRole(), "manage_mobile_phones"))
        {
            return StatusCode(403, new { message = "Manage mobile phones permission is currently disabled for your role." });
        }

        var device = await _db.MobileDevices.FindAsync(id);
        if (device == null) return NotFound();

        // Remove dependent notifications, incidents, and check records so Developer can permanently delete a phone
        var notifications = await _db.Notifications.Where(n => n.DeviceId == id).ToListAsync();
        if (notifications.Count > 0) _db.Notifications.RemoveRange(notifications);

        var incidents = await _db.MissingIncidents.Where(i => i.DeviceId == id).ToListAsync();
        if (incidents.Count > 0) _db.MissingIncidents.RemoveRange(incidents);

        var checkRecords = await _db.DeviceCheckRecords.Where(c => c.DeviceId == id).ToListAsync();
        if (checkRecords.Count > 0) _db.DeviceCheckRecords.RemoveRange(checkRecords);

        _db.MobileDevices.Remove(device);
        await _db.SaveChangesAsync();

        return Ok(new { message = $"Device {device.MobileCode} has been deleted." });
    }
}
