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
public class AuthController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ITokenService _tokenService;
    private readonly ITimeService _timeService;

    public AuthController(AppDbContext db, ITokenService tokenService, ITimeService timeService)
    {
        _db = db;
        _tokenService = tokenService;
        _timeService = timeService;
    }

    [HttpPost("login")]
    public async Task<ActionResult<LoginResponse>> Login([FromBody] LoginRequest request)
    {
        return await AuthenticateWithRoleCheck(request, request.ExpectedRole);
    }

    [HttpPost("login/employee")]
    public async Task<ActionResult<LoginResponse>> LoginEmployee([FromBody] LoginRequest request)
    {
        return await AuthenticateWithRoleCheck(request, "Employee");
    }

    [HttpPost("login/itadmin")]
    public async Task<ActionResult<LoginResponse>> LoginITAdmin([FromBody] LoginRequest request)
    {
        return await AuthenticateWithRoleCheck(request, "ITAdmin");
    }

    [HttpPost("login/developer")]
    public async Task<ActionResult<LoginResponse>> LoginDeveloper([FromBody] LoginRequest request)
    {
        return await AuthenticateWithRoleCheck(request, "Developer");
    }

    private async Task<ActionResult<LoginResponse>> AuthenticateWithRoleCheck(LoginRequest request, string? expectedRole)
    {
        if (string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Password))
        {
            return BadRequest(new { message = "Username and password are required." });
        }

        var user = await _db.Users
            .Include(u => u.Role)
            .FirstOrDefaultAsync(u => u.Username.ToLower() == request.Username.Trim().ToLower());

        if (user == null || !user.IsActive)
        {
            return Unauthorized(new { message = "Invalid username or password, or account is deactivated." });
        }

        var validPassword = BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash);
        if (!validPassword)
        {
            return Unauthorized(new { message = "Invalid username or password." });
        }

        var actualRole = user.Role?.RoleName ?? "Employee";
        if (!string.IsNullOrWhiteSpace(expectedRole) &&
            !string.Equals(actualRole, expectedRole.Trim(), StringComparison.OrdinalIgnoreCase))
        {
            var portalLabel = expectedRole.Trim() switch
            {
                "ITAdmin" => "IT Admin",
                "Developer" => "Developer / System Owner",
                "Employee" => "Employee",
                _ => expectedRole.Trim()
            };
            return StatusCode(403, new
            {
                message = $"Access denied: This account does not belong to the {portalLabel} login portal."
            });
        }

        var token = _tokenService.GenerateToken(user);

        return Ok(new LoginResponse(
            Token: token,
            UserId: user.UserId,
            Username: user.Username,
            FullName: user.FullName,
            Role: actualRole,
            Email: user.Email
        ));
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<ActionResult<UserDto>> GetCurrentUser()
    {
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!int.TryParse(userIdStr, out var userId))
        {
            return Unauthorized();
        }

        var user = await _db.Users
            .Include(u => u.Role)
            .FirstOrDefaultAsync(u => u.UserId == userId);

        if (user == null) return NotFound();

        return Ok(new UserDto(
            UserId: user.UserId,
            Username: user.Username,
            FullName: user.FullName,
            Email: user.Email,
            Role: user.Role?.RoleName ?? "Employee",
            RoleId: user.RoleId,
            IsActive: user.IsActive,
            CreatedAtColombo: _timeService.FormatColombo(user.CreatedAtUtc)
        ));
    }
}
