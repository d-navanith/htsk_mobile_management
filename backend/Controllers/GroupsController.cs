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
public class GroupsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ITimeService _timeService;
    private readonly IPermissionService _permissionService;

    public GroupsController(AppDbContext db, ITimeService timeService, IPermissionService permissionService)
    {
        _db = db;
        _timeService = timeService;
        _permissionService = permissionService;
    }

    private string? GetCurrentRole() => User.FindFirstValue(ClaimTypes.Role);

    [HttpGet]
    public async Task<ActionResult<List<GroupDto>>> GetGroups([FromQuery] bool? isActive)
    {
        var query = _db.Groups.Include(g => g.Devices).AsQueryable();

        if (isActive.HasValue)
        {
            query = query.Where(g => g.IsActive == isActive.Value);
        }

        var groups = await query.OrderBy(g => g.GroupName).ToListAsync();

        var dtoList = groups.Select(g => new GroupDto(
            GroupId: g.GroupId,
            GroupName: g.GroupName,
            Description: g.Description,
            IsActive: g.IsActive,
            TotalDevices: g.Devices.Count(d => d.IsActive),
            AvailableDevices: g.Devices.Count(d => d.IsActive && d.CurrentStatus == "Available"),
            MissingDevices: g.Devices.Count(d => d.IsActive && d.CurrentStatus == "Missing"),
            CreatedAtColombo: _timeService.FormatColombo(g.CreatedAtUtc),
            UpdatedAtColombo: _timeService.FormatColombo(g.UpdatedAtUtc)
        )).ToList();

        return Ok(dtoList);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<GroupDto>> GetGroup(int id)
    {
        var g = await _db.Groups.Include(x => x.Devices).FirstOrDefaultAsync(x => x.GroupId == id);
        if (g == null) return NotFound();

        return Ok(new GroupDto(
            GroupId: g.GroupId,
            GroupName: g.GroupName,
            Description: g.Description,
            IsActive: g.IsActive,
            TotalDevices: g.Devices.Count(d => d.IsActive),
            AvailableDevices: g.Devices.Count(d => d.IsActive && d.CurrentStatus == "Available"),
            MissingDevices: g.Devices.Count(d => d.IsActive && d.CurrentStatus == "Missing"),
            CreatedAtColombo: _timeService.FormatColombo(g.CreatedAtUtc),
            UpdatedAtColombo: _timeService.FormatColombo(g.UpdatedAtUtc)
        ));
    }

    [HttpPost]
    public async Task<ActionResult<GroupDto>> CreateGroup([FromBody] CreateGroupRequest request)
    {
        if (!await _permissionService.HasPermissionAsync(GetCurrentRole(), "manage_groups"))
        {
            return StatusCode(403, new { message = "Manage groups permission is currently disabled for your role." });
        }

        if (string.IsNullOrWhiteSpace(request.GroupName))
        {
            return BadRequest(new { message = "Group name is required." });
        }

        var name = request.GroupName.Trim();
        if (await _db.Groups.AnyAsync(g => g.GroupName.ToLower() == name.ToLower()))
        {
            return BadRequest(new { message = $"Group '{name}' already exists." });
        }

        var group = new Group
        {
            GroupName = name,
            Description = request.Description?.Trim(),
            IsActive = true,
            CreatedAtUtc = _timeService.UtcNow,
            UpdatedAtUtc = _timeService.UtcNow
        };

        _db.Groups.Add(group);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetGroup), new { id = group.GroupId }, new GroupDto(
            GroupId: group.GroupId,
            GroupName: group.GroupName,
            Description: group.Description,
            IsActive: group.IsActive,
            TotalDevices: 0,
            AvailableDevices: 0,
            MissingDevices: 0,
            CreatedAtColombo: _timeService.FormatColombo(group.CreatedAtUtc),
            UpdatedAtColombo: _timeService.FormatColombo(group.UpdatedAtUtc)
        ));
    }

    [HttpPut("{id}")]
    public async Task<ActionResult> UpdateGroup(int id, [FromBody] UpdateGroupRequest request)
    {
        if (!await _permissionService.HasPermissionAsync(GetCurrentRole(), "manage_groups"))
        {
            return StatusCode(403, new { message = "Manage groups permission is currently disabled for your role." });
        }

        var group = await _db.Groups.FindAsync(id);
        if (group == null) return NotFound();

        var name = request.GroupName.Trim();
        if (await _db.Groups.AnyAsync(g => g.GroupId != id && g.GroupName.ToLower() == name.ToLower()))
        {
            return BadRequest(new { message = $"Another group with name '{name}' already exists." });
        }

        group.GroupName = name;
        group.Description = request.Description?.Trim();
        group.IsActive = request.IsActive;
        group.UpdatedAtUtc = _timeService.UtcNow;

        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult> DeleteGroup(int id)
    {
        if (!await _permissionService.HasPermissionAsync(GetCurrentRole(), "manage_groups"))
        {
            return StatusCode(403, new { message = "Manage groups permission is currently disabled for your role." });
        }

        var group = await _db.Groups.Include(g => g.Devices).FirstOrDefaultAsync(g => g.GroupId == id);
        if (group == null) return NotFound();

        if (group.Devices.Count == 0)
        {
            _db.Groups.Remove(group);
            await _db.SaveChangesAsync();
            return Ok(new { message = $"Group '{group.GroupName}' has been permanently deleted." });
        }

        group.IsActive = false;
        group.UpdatedAtUtc = _timeService.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(new { message = $"Group '{group.GroupName}' has {group.Devices.Count} assigned phone(s) and has been deactivated." });
    }
}
