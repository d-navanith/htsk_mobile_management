using Microsoft.EntityFrameworkCore;
using backend.Data;
using backend.DTOs;
using backend.Models;

namespace backend.Services;

public interface IPermissionService
{
    Task<List<PermissionRowDto>> GetAllPermissionsAsync();
    Task<PermissionRowDto?> TogglePermissionAsync(string functionKey, string role, bool isEnabled);
    Task<PermissionRowDto> CreatePermissionAsync(CreatePermissionRequest request);
    Task<PermissionRowDto?> UpdatePermissionAsync(string functionKey, UpdatePermissionRequest request);
    Task<bool> DeletePermissionAsync(string functionKey);
    Task<List<PermissionRowDto>> ResetToDefaultsAsync();
    Task<bool> HasPermissionAsync(string? role, string functionKey);
}

public class PermissionService : IPermissionService
{
    private readonly AppDbContext _db;
    private readonly ITimeService _timeService;

    private record FunctionDef(
        string Key,
        string Name,
        string Description,
        bool DefaultDev,
        bool DefaultAdmin,
        bool DefaultEmp
    );

    private static readonly List<FunctionDef> Definitions = new()
    {
        new("view_dashboard", "View dashboard", "Access the main workspace overview, KPIs, and live session progress", true, true, true),
        new("add_user_accounts", "Add user accounts", "Create, edit, activate, and manage user accounts", true, false, false),
        new("manage_groups", "Manage groups", "Create, rename, and deactivate employee device groups", true, true, false),
        new("manage_mobile_phones", "Manage mobile phones", "Register new mobile phones, edit device details, and change groups", true, true, false),
        new("checking_sessions", "Checking sessions", "Access the checking sessions tab and view 2-hour session progress", true, true, true),
        new("start_checking_sessions", "Start checking sessions", "Manually start and complete 2-hour mobile phone checking sessions", true, true, false),
        new("mark_availability", "Mark availability", "Mark mobile phones as Available or Missing during active checking", true, true, false),
        new("notifications", "Notifications", "View and manage missing-phone alerts and system notifications", true, true, true),
        new("view_checking_history", "View checking history", "View and filter historical checking records across sessions", true, true, true),
        new("view_missing_reports", "View missing reports", "Access missing device incidents, escalations, and analytical reports", true, true, true)
    };

    public PermissionService(AppDbContext db, ITimeService timeService)
    {
        _db = db;
        _timeService = timeService;
    }

    private static string SettingKeyFor(string functionKey) => $"Perm:{functionKey}";

    private static string EncodeValue(bool dev, bool admin, bool emp)
        => $"Developer:{(dev ? 1 : 0)},ITAdmin:{(admin ? 1 : 0)},Employee:{(emp ? 1 : 0)}";

    private static string EncodeDescription(string name, string? desc)
        => $"{name.Trim()}||{(desc ?? string.Empty).Trim()}";

    private static (string name, string desc) DecodeDescription(string? rawDesc, FunctionDef? def, string key)
    {
        if (!string.IsNullOrWhiteSpace(rawDesc) && rawDesc.Contains("||"))
        {
            var parts = rawDesc.Split("||", 2);
            return (parts[0].Trim(), parts[1].Trim());
        }
        if (def != null)
        {
            return (def.Name, string.IsNullOrWhiteSpace(rawDesc) ? def.Description : rawDesc);
        }
        return (key, rawDesc ?? string.Empty);
    }

    private static (bool dev, bool admin, bool emp) DecodeValue(string? value, FunctionDef? def)
    {
        bool dev = def?.DefaultDev ?? true;
        bool admin = def?.DefaultAdmin ?? true;
        bool emp = def?.DefaultEmp ?? false;

        if (string.IsNullOrWhiteSpace(value))
            return (dev, admin, emp);

        foreach (var part in value.Split(',', StringSplitOptions.RemoveEmptyEntries))
        {
            var kv = part.Split(':');
            if (kv.Length != 2) continue;
            var r = kv[0].Trim();
            var enabled = kv[1].Trim() == "1" || kv[1].Trim().Equals("true", StringComparison.OrdinalIgnoreCase);

            if (r.Equals("Developer", StringComparison.OrdinalIgnoreCase)) dev = enabled;
            else if (r.Equals("ITAdmin", StringComparison.OrdinalIgnoreCase)) admin = enabled;
            else if (r.Equals("Employee", StringComparison.OrdinalIgnoreCase)) emp = enabled;
        }

        return (dev, admin, emp);
    }

    public async Task<List<PermissionRowDto>> GetAllPermissionsAsync()
    {
        var existingSettings = await _db.SystemSettings
            .Where(s => s.SettingKey.StartsWith("Perm:"))
            .ToListAsync();

        var map = existingSettings.ToDictionary(s => s.SettingKey, s => s, StringComparer.OrdinalIgnoreCase);
        var result = new List<PermissionRowDto>();
        bool addedAny = false;

        // 1. Built-in definitions in order
        foreach (var def in Definitions)
        {
            var sKey = SettingKeyFor(def.Key);
            if (!map.TryGetValue(sKey, out var setting))
            {
                setting = new SystemSetting
                {
                    SettingKey = sKey,
                    SettingValue = EncodeValue(def.DefaultDev, def.DefaultAdmin, def.DefaultEmp),
                    Description = EncodeDescription(def.Name, def.Description),
                    UpdatedAtUtc = _timeService.UtcNow
                };
                _db.SystemSettings.Add(setting);
                map[sKey] = setting;
                addedAny = true;
            }

            var (dev, admin, emp) = DecodeValue(setting.SettingValue, def);
            var (name, desc) = DecodeDescription(setting.Description, def, def.Key);
            result.Add(new PermissionRowDto(
                FunctionKey: def.Key,
                FunctionName: name,
                Description: desc,
                Developer: dev,
                ITAdmin: admin,
                Employee: emp,
                UpdatedAtColombo: _timeService.FormatColombo(setting.UpdatedAtUtc)
            ));
        }

        // 2. Any custom functions created by Developer
        var builtInKeys = Definitions.Select(d => SettingKeyFor(d.Key)).ToHashSet(StringComparer.OrdinalIgnoreCase);
        foreach (var kv in map)
        {
            if (builtInKeys.Contains(kv.Key)) continue;
            var setting = kv.Value;
            var fnKey = setting.SettingKey.Substring("Perm:".Length);
            var (dev, admin, emp) = DecodeValue(setting.SettingValue, null);
            var (name, desc) = DecodeDescription(setting.Description, null, fnKey);
            result.Add(new PermissionRowDto(
                FunctionKey: fnKey,
                FunctionName: name,
                Description: desc,
                Developer: dev,
                ITAdmin: admin,
                Employee: emp,
                UpdatedAtColombo: _timeService.FormatColombo(setting.UpdatedAtUtc)
            ));
        }

        if (addedAny)
        {
            await _db.SaveChangesAsync();
        }

        return result;
    }

    public async Task<PermissionRowDto?> TogglePermissionAsync(string functionKey, string role, bool isEnabled)
    {
        var def = Definitions.FirstOrDefault(d => d.Key.Equals(functionKey, StringComparison.OrdinalIgnoreCase));
        var sKey = SettingKeyFor(def?.Key ?? functionKey.Trim());
        var setting = await _db.SystemSettings.FirstOrDefaultAsync(s => s.SettingKey.ToLower() == sKey.ToLower());

        if (setting == null)
        {
            if (def == null) return null;
            setting = new SystemSetting
            {
                SettingKey = sKey,
                SettingValue = EncodeValue(def.DefaultDev, def.DefaultAdmin, def.DefaultEmp),
                Description = EncodeDescription(def.Name, def.Description),
                UpdatedAtUtc = _timeService.UtcNow
            };
            _db.SystemSettings.Add(setting);
        }

        var (dev, admin, emp) = DecodeValue(setting.SettingValue, def);

        if (role.Equals("Developer", StringComparison.OrdinalIgnoreCase))
            dev = isEnabled;
        else if (role.Equals("ITAdmin", StringComparison.OrdinalIgnoreCase) || role.Equals("IT Admin", StringComparison.OrdinalIgnoreCase))
            admin = isEnabled;
        else if (role.Equals("Employee", StringComparison.OrdinalIgnoreCase))
            emp = isEnabled;
        else
            return null;

        setting.SettingValue = EncodeValue(dev, admin, emp);
        setting.UpdatedAtUtc = _timeService.UtcNow;
        await _db.SaveChangesAsync();

        var fnKey = setting.SettingKey.Substring("Perm:".Length);
        var (name, desc) = DecodeDescription(setting.Description, def, fnKey);

        return new PermissionRowDto(
            FunctionKey: fnKey,
            FunctionName: name,
            Description: desc,
            Developer: dev,
            ITAdmin: admin,
            Employee: emp,
            UpdatedAtColombo: _timeService.FormatColombo(setting.UpdatedAtUtc)
        );
    }

    public async Task<PermissionRowDto> CreatePermissionAsync(CreatePermissionRequest request)
    {
        var rawKey = string.IsNullOrWhiteSpace(request.FunctionKey)
            ? request.FunctionName.Trim().ToLowerInvariant().Replace(' ', '_')
            : request.FunctionKey.Trim().ToLowerInvariant().Replace(' ', '_');

        var sKey = SettingKeyFor(rawKey);
        var existing = await _db.SystemSettings.FirstOrDefaultAsync(s => s.SettingKey.ToLower() == sKey.ToLower());
        if (existing != null)
        {
            throw new InvalidOperationException($"Function '{rawKey}' already exists.");
        }

        var setting = new SystemSetting
        {
            SettingKey = sKey,
            SettingValue = EncodeValue(request.Developer, request.ITAdmin, request.Employee),
            Description = EncodeDescription(request.FunctionName, request.Description),
            UpdatedAtUtc = _timeService.UtcNow
        };

        _db.SystemSettings.Add(setting);
        await _db.SaveChangesAsync();

        var (name, desc) = DecodeDescription(setting.Description, null, rawKey);
        return new PermissionRowDto(
            FunctionKey: rawKey,
            FunctionName: name,
            Description: desc,
            Developer: request.Developer,
            ITAdmin: request.ITAdmin,
            Employee: request.Employee,
            UpdatedAtColombo: _timeService.FormatColombo(setting.UpdatedAtUtc)
        );
    }

    public async Task<PermissionRowDto?> UpdatePermissionAsync(string functionKey, UpdatePermissionRequest request)
    {
        var def = Definitions.FirstOrDefault(d => d.Key.Equals(functionKey, StringComparison.OrdinalIgnoreCase));
        var sKey = SettingKeyFor(def?.Key ?? functionKey.Trim());
        var setting = await _db.SystemSettings.FirstOrDefaultAsync(s => s.SettingKey.ToLower() == sKey.ToLower());
        if (setting == null) return null;

        setting.SettingValue = EncodeValue(request.Developer, request.ITAdmin, request.Employee);
        setting.Description = EncodeDescription(request.FunctionName, request.Description);
        setting.UpdatedAtUtc = _timeService.UtcNow;

        await _db.SaveChangesAsync();

        var fnKey = setting.SettingKey.Substring("Perm:".Length);
        var (name, desc) = DecodeDescription(setting.Description, def, fnKey);

        return new PermissionRowDto(
            FunctionKey: fnKey,
            FunctionName: name,
            Description: desc,
            Developer: request.Developer,
            ITAdmin: request.ITAdmin,
            Employee: request.Employee,
            UpdatedAtColombo: _timeService.FormatColombo(setting.UpdatedAtUtc)
        );
    }

    public async Task<bool> DeletePermissionAsync(string functionKey)
    {
        var sKey = SettingKeyFor(functionKey.Trim());
        var setting = await _db.SystemSettings.FirstOrDefaultAsync(s => s.SettingKey.ToLower() == sKey.ToLower());
        if (setting == null) return false;

        _db.SystemSettings.Remove(setting);
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<List<PermissionRowDto>> ResetToDefaultsAsync()
    {
        var existingSettings = await _db.SystemSettings
            .Where(s => s.SettingKey.StartsWith("Perm:"))
            .ToListAsync();

        var map = existingSettings.ToDictionary(s => s.SettingKey, s => s, StringComparer.OrdinalIgnoreCase);

        foreach (var def in Definitions)
        {
            var sKey = SettingKeyFor(def.Key);
            if (map.TryGetValue(sKey, out var setting))
            {
                setting.SettingValue = EncodeValue(def.DefaultDev, def.DefaultAdmin, def.DefaultEmp);
                setting.Description = EncodeDescription(def.Name, def.Description);
                setting.UpdatedAtUtc = _timeService.UtcNow;
            }
            else
            {
                _db.SystemSettings.Add(new SystemSetting
                {
                    SettingKey = sKey,
                    SettingValue = EncodeValue(def.DefaultDev, def.DefaultAdmin, def.DefaultEmp),
                    Description = EncodeDescription(def.Name, def.Description),
                    UpdatedAtUtc = _timeService.UtcNow
                });
            }
        }

        await _db.SaveChangesAsync();
        return await GetAllPermissionsAsync();
    }

    public async Task<bool> HasPermissionAsync(string? role, string functionKey)
    {
        if (string.IsNullOrWhiteSpace(role)) return false;
        var all = await GetAllPermissionsAsync();
        var row = all.FirstOrDefault(r => r.FunctionKey.Equals(functionKey, StringComparison.OrdinalIgnoreCase));
        if (row == null) return role == "Developer";

        if (role.Equals("Developer", StringComparison.OrdinalIgnoreCase)) return row.Developer;
        if (role.Equals("ITAdmin", StringComparison.OrdinalIgnoreCase)) return row.ITAdmin;
        if (role.Equals("Employee", StringComparison.OrdinalIgnoreCase)) return row.Employee;
        return false;
    }
}
