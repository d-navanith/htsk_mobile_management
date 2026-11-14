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
public class UsersController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ITimeService _timeService;
    private readonly IPermissionService _permissionService;

    public UsersController(AppDbContext db, ITimeService timeService, IPermissionService permissionService)
    {
        _db = db;
        _timeService = timeService;
        _permissionService = permissionService;
    }

    private string? GetCurrentRole() => User.FindFirstValue(ClaimTypes.Role);

    [HttpGet]
    public async Task<ActionResult<List<UserDto>>> GetUsers()
    {
        if (!await _permissionService.HasPermissionAsync(GetCurrentRole(), "add_user_accounts"))
        {
            return StatusCode(403, new { message = "Add user accounts permission is currently disabled for your role." });
        }

        var users = await _db.Users
            .Include(u => u.Role)
            .OrderBy(u => u.Username)
            .ToListAsync();

        var list = users.Select(u => new UserDto(
            UserId: u.UserId,
            Username: u.Username,
            FullName: u.FullName,
            Email: u.Email,
            Role: u.Role?.RoleName ?? "Employee",
            RoleId: u.RoleId,
            IsActive: u.IsActive,
            CreatedAtColombo: _timeService.FormatColombo(u.CreatedAtUtc)
        )).ToList();

        return Ok(list);
    }

    [HttpPost]
    public async Task<ActionResult<UserDto>> CreateUser([FromBody] CreateUserRequest request)
    {
        if (!await _permissionService.HasPermissionAsync(GetCurrentRole(), "add_user_accounts"))
        {
            return StatusCode(403, new { message = "Add user accounts permission is currently disabled for your role." });
        }

        if (string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Password))
        {
            return BadRequest(new { message = "Username and password are required." });
        }

        var username = request.Username.Trim().ToLower();
        if (await _db.Users.AnyAsync(u => u.Username.ToLower() == username))
        {
            return BadRequest(new { message = $"Username '{request.Username}' is already taken." });
        }

        var role = await _db.Roles.FindAsync(request.RoleId);
        if (role == null)
        {
            return BadRequest(new { message = "Invalid role ID." });
        }

        var user = new User
        {
            FullName = request.FullName.Trim(),
            Username = username,
            Email = request.Email.Trim(),
            RoleId = request.RoleId,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            IsActive = true,
            CreatedAtUtc = _timeService.UtcNow
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        return Ok(new UserDto(
            UserId: user.UserId,
            Username: user.Username,
            FullName: user.FullName,
            Email: user.Email,
            Role: role.RoleName,
            RoleId: user.RoleId,
            IsActive: user.IsActive,
            CreatedAtColombo: _timeService.FormatColombo(user.CreatedAtUtc)
        ));
    }

    [HttpPut("{id}")]
    public async Task<ActionResult> UpdateUser(int id, [FromBody] UpdateUserRequest request)
    {
        if (!await _permissionService.HasPermissionAsync(GetCurrentRole(), "add_user_accounts"))
        {
            return StatusCode(403, new { message = "Add user accounts permission is currently disabled for your role." });
        }

        var user = await _db.Users.FindAsync(id);
        if (user == null) return NotFound();

        var role = await _db.Roles.FindAsync(request.RoleId);
        if (role == null)
        {
            return BadRequest(new { message = "Invalid role ID." });
        }

        user.FullName = request.FullName.Trim();
        user.Email = request.Email.Trim();
        user.RoleId = request.RoleId;
        user.IsActive = request.IsActive;

        if (!string.IsNullOrWhiteSpace(request.NewPassword))
        {
            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
        }

        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult> DeleteUser(int id)
    {
        if (!await _permissionService.HasPermissionAsync(GetCurrentRole(), "add_user_accounts"))
        {
            return StatusCode(403, new { message = "Add user accounts permission is currently disabled for your role." });
        }

        var currentIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (int.TryParse(currentIdStr, out var currentId) && currentId == id)
        {
            return BadRequest(new { message = "You cannot delete your own currently logged-in account." });
        }

        var user = await _db.Users.FindAsync(id);
        if (user == null) return NotFound();

        var hasSessions = await _db.CheckSessions.AnyAsync(s => s.StartedByUserId == id);
        var hasChecks = await _db.DeviceCheckRecords.AnyAsync(c => c.CheckedByUserId == id);
        if (hasSessions || hasChecks)
        {
            // Cleanly reassign or remove user's check/session references if developer wants full delete, or fallback to current user
            var fallbackUserId = int.TryParse(currentIdStr, out var cid) ? cid : 1;
            if (fallbackUserId != id)
            {
                var sessions = await _db.CheckSessions.Where(s => s.StartedByUserId == id).ToListAsync();
                foreach (var s in sessions) s.StartedByUserId = fallbackUserId;

                var checks = await _db.DeviceCheckRecords.Where(c => c.CheckedByUserId == id).ToListAsync();
                foreach (var c in checks) c.CheckedByUserId = fallbackUserId;
            }
        }

        _db.Users.Remove(user);
        await _db.SaveChangesAsync();
        return Ok(new { message = $"User '{user.Username}' deleted." });
    }
}
