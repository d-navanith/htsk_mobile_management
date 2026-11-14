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
public class SettingsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ITimeService _timeService;

    public SettingsController(AppDbContext db, ITimeService timeService)
    {
        _db = db;
        _timeService = timeService;
    }

    [HttpGet]
    public async Task<ActionResult<List<SystemSetting>>> GetSettings()
    {
        var settings = await _db.SystemSettings
            .Where(s => !s.SettingKey.StartsWith("Perm:"))
            .ToListAsync();
        return Ok(settings);
    }

    [HttpPost]
    [Authorize(Roles = "Developer")]
    public async Task<ActionResult<SystemSetting>> CreateSetting([FromBody] CreateSettingRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.SettingKey))
        {
            return BadRequest(new { message = "Setting key is required." });
        }

        var key = request.SettingKey.Trim();
        if (await _db.SystemSettings.AnyAsync(s => s.SettingKey.ToLower() == key.ToLower()))
        {
            return BadRequest(new { message = $"Setting '{key}' already exists." });
        }

        var setting = new SystemSetting
        {
            SettingKey = key,
            SettingValue = request.SettingValue?.Trim() ?? string.Empty,
            Description = request.Description?.Trim(),
            UpdatedAtUtc = _timeService.UtcNow
        };

        _db.SystemSettings.Add(setting);
        await _db.SaveChangesAsync();
        return Ok(setting);
    }

    [HttpPut("{key}")]
    [Authorize(Roles = "Developer")]
    public async Task<ActionResult> UpdateSetting(string key, [FromBody] SystemSetting update)
    {
        var setting = await _db.SystemSettings.FirstOrDefaultAsync(s => s.SettingKey.ToLower() == key.ToLower());
        if (setting == null) return NotFound();

        setting.SettingValue = update.SettingValue;
        if (update.Description != null)
            setting.Description = update.Description;
        setting.UpdatedAtUtc = _timeService.UtcNow;

        await _db.SaveChangesAsync();
        return Ok(setting);
    }

    [HttpDelete("{key}")]
    [Authorize(Roles = "Developer")]
    public async Task<ActionResult> DeleteSetting(string key)
    {
        var setting = await _db.SystemSettings.FirstOrDefaultAsync(s => s.SettingKey.ToLower() == key.ToLower());
        if (setting == null) return NotFound();

        _db.SystemSettings.Remove(setting);
        await _db.SaveChangesAsync();
        return Ok(new { message = $"Setting '{key}' deleted." });
    }
}
