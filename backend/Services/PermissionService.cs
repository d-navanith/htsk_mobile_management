using Microsoft.EntityFrameworkCore;
using backend.Data;
using backend.DTOs;
using backend.Models;

namespace backend.Services;

public interface IPermissionService
{
    Task<List<PermissionRowDto>> GetAllPermissionsAsync();
    Task<PermissionRowDto?> TogglePermissionAsync(TogglePermissionRequest request);
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
        bool DefaultEmp,
        List<string> DefaultEmpCanDo,
        List<string> DefaultEmpCannotDo
    );

    private static readonly List<FunctionDef> Definitions = new()
    {
        new(
            "view_dashboard",
            "View dashboard",
            "Access the main workspace overview, KPIs, and live session progress",
            true, true, true,
            new List<string>
            {
                "View live mobile phone availability KPIs and counts",
                "View active 2-hour checking session progress and group status",
                "View recent checking activity feed"
            },
            new List<string>
            {
                "Cannot start or cancel 2-hour checking sessions from dashboard",
                "Cannot modify dashboard KPIs or global interval settings (Developer only)"
            }
        ),
        new(
            "add_user_accounts",
            "Add user accounts",
            "Create, edit, activate, and manage user accounts",
            true, false, false,
            new List<string>
            {
                "View user account directory and assigned roles"
            },
            new List<string>
            {
                "Cannot create, edit, or delete Developer accounts (Developer only)",
                "Cannot modify role permissions or system configuration (Developer only)"
            }
        ),
        new(
            "manage_groups",
            "Manage groups",
            "Create, rename, and deactivate employee device groups",
            true, true, false,
            new List<string>
            {
                "View department and employee device groups",
                "Inspect total, available, and missing phones per group"
            },
            new List<string>
            {
                "Cannot create, rename, or delete device groups (unless Edit access is unlocked)",
                "Cannot permanently delete group check records (Developer only)"
            }
        ),
        new(
            "manage_mobile_phones",
            "Manage mobile phones",
            "Register new mobile phones, edit device details, and change groups",
            true, true, false,
            new List<string>
            {
                "View all company mobile phones and search by Mobile ID",
                "Filter mobile phones by group and availability status"
            },
            new List<string>
            {
                "Cannot register, edit, or delete mobile phones (unless Edit access is unlocked)",
                "Cannot purge device audit history (Developer only)"
            }
        ),
        new(
            "checking_sessions",
            "Checking sessions",
            "Access the checking sessions tab and view 2-hour session progress",
            true, true, true,
            new List<string>
            {
                "Access the Checking Sessions tab and view active 2-hour session progress",
                "View recent checking sessions summary and completion counts",
                "Filter session phones by group and check status"
            },
            new List<string>
            {
                "Cannot edit or delete checking session records (Developer only)",
                "Cannot start or complete 2-hour sessions (unless Start Checking Sessions is enabled)",
                "Cannot mark phones Available or Missing (unless Mark Availability is enabled)"
            }
        ),
        new(
            "start_checking_sessions",
            "Start checking sessions",
            "Manually start and complete 2-hour mobile phone checking sessions",
            true, true, false,
            new List<string>
            {
                "Start a new 2-hour mobile phone checking session",
                "Complete an active checking session with summary notes"
            },
            new List<string>
            {
                "Cannot edit or delete completed session records (Developer only)",
                "Cannot change global 2-hour checking interval settings (Developer only)"
            }
        ),
        new(
            "mark_availability",
            "Mark availability",
            "Mark mobile phones as Available or Missing during active checking",
            true, true, false,
            new List<string>
            {
                "Mark mobile phones as Available or Missing during an active checking session",
                "Add inspection notes for individual phones during checking"
            },
            new List<string>
            {
                "Cannot delete historical check logs or alter past sessions (Developer only)"
            }
        ),
        new(
            "notifications",
            "Notifications",
            "View and manage missing-phone alerts and system notifications",
            true, true, true,
            new List<string>
            {
                "View real-time missing-phone alerts and system notifications",
                "Filter notifications by unread status",
                "Mark notifications as read"
            },
            new List<string>
            {
                "Cannot create new system notification alerts (Developer only)",
                "Cannot edit notification messages, alert types, or priority (Developer only)",
                "Cannot delete notifications from the notification panel (Developer only)"
            }
        ),
        new(
            "view_checking_history",
            "View checking history",
            "View and filter historical checking records across sessions",
            true, true, true,
            new List<string>
            {
                "View historical checking records across all 2-hour sessions",
                "Filter checking history by Mobile ID, group, status, and date"
            },
            new List<string>
            {
                "Cannot edit historical check status or notes (Developer only)",
                "Cannot delete checking history records (Developer only)"
            }
        ),
        new(
            "view_missing_reports",
            "View missing reports",
            "Access missing device incidents, escalations, and analytical reports",
            true, true, true,
            new List<string>
            {
                "View Missing Incidents list and Daily Check Reports calendar",
                "Select any calendar date to filter checking sessions, times, and missing items"
            },
            new List<string>
            {
                "Cannot create, edit, or delete missing incident records (Developer only)",
                "Cannot change incident status (Open / Recovered / Escalated)"
            }
        )
    };

    public PermissionService(AppDbContext db, ITimeService timeService)
    {
        _db = db;
        _timeService = timeService;
    }

    private static string SettingKeyFor(string functionKey) => $"Perm:{functionKey}";
    private static string RuleSettingKeyFor(string functionKey) => $"PermRule:{functionKey}";

    private static string EncodeValue(bool dev, bool admin, bool emp, bool empEdit = false)
        => $"Developer:{(dev ? 1 : 0)},ITAdmin:{(admin ? 1 : 0)},Employee:{(emp ? 1 : 0)},EmpEdit:{(empEdit ? 1 : 0)}";

    private static string EncodeDescription(string name, string? desc)
    {
        var raw = $"{name.Trim()}||{(desc ?? string.Empty).Trim()}";
        return raw.Length > 490 ? raw.Substring(0, 490) : raw;
    }

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

    private static (bool dev, bool admin, bool emp, bool empEdit) DecodeValue(string? value, FunctionDef? def)
    {
        bool dev = def?.DefaultDev ?? true;
        bool admin = def?.DefaultAdmin ?? true;
        bool emp = def?.DefaultEmp ?? false;
        bool empEdit = false;

        if (string.IsNullOrWhiteSpace(value))
            return (dev, admin, emp, empEdit);

        foreach (var part in value.Split(',', StringSplitOptions.RemoveEmptyEntries))
        {
            var kv = part.Split(':');
            if (kv.Length != 2) continue;
            var r = kv[0].Trim();
            var enabled = kv[1].Trim() == "1" || kv[1].Trim().Equals("true", StringComparison.OrdinalIgnoreCase);

            if (r.Equals("Developer", StringComparison.OrdinalIgnoreCase)) dev = enabled;
            else if (r.Equals("ITAdmin", StringComparison.OrdinalIgnoreCase)) admin = enabled;
            else if (r.Equals("Employee", StringComparison.OrdinalIgnoreCase)) emp = enabled;
            else if (r.Equals("EmpEdit", StringComparison.OrdinalIgnoreCase)) empEdit = enabled;
        }

        return (dev, admin, emp, empEdit);
    }

    private static List<string> DefaultCanDoFor(FunctionDef? def, string functionName)
    {
        if (def != null && def.DefaultEmpCanDo.Count > 0)
            return new List<string>(def.DefaultEmpCanDo);

        return new List<string>
        {
            $"View and access the {functionName} section in read-only mode",
            $"Filter and inspect records in {functionName}"
        };
    }

    private static List<string> DefaultCannotDoFor(FunctionDef? def, string functionName)
    {
        if (def != null && def.DefaultEmpCannotDo.Count > 0)
            return new List<string>(def.DefaultEmpCannotDo);

        return new List<string>
        {
            $"Cannot create, edit, or delete records in {functionName} (Developer only)",
            $"Cannot modify administrative settings for {functionName} (Developer only)"
        };
    }

    private static string EncodeRules(List<string>? canDo, List<string>? cannotDo)
    {
        var canList = (canDo ?? new List<string>())
            .Select(s => s.Replace("||", " ").Replace(";;", ";").Trim())
            .Where(s => !string.IsNullOrWhiteSpace(s));
        var cannotList = (cannotDo ?? new List<string>())
            .Select(s => s.Replace("||", " ").Replace(";;", ";").Trim())
            .Where(s => !string.IsNullOrWhiteSpace(s));

        var encoded = $"{string.Join(";;", canList)}||{string.Join(";;", cannotList)}";
        return encoded.Length > 495 ? encoded.Substring(0, 495) : encoded;
    }

    private static (List<string> canDo, List<string> cannotDo) DecodeRules(
        string? rawRules,
        FunctionDef? def,
        string functionName)
    {
        if (!string.IsNullOrWhiteSpace(rawRules) && rawRules.Contains("||"))
        {
            var parts = rawRules.Split("||", 2);
            var canList = parts[0]
                .Split(";;", StringSplitOptions.RemoveEmptyEntries)
                .Select(s => s.Trim())
                .Where(s => !string.IsNullOrWhiteSpace(s))
                .ToList();
            var cannotList = parts[1]
                .Split(";;", StringSplitOptions.RemoveEmptyEntries)
                .Select(s => s.Trim())
                .Where(s => !string.IsNullOrWhiteSpace(s))
                .ToList();

            return (
                canList.Count > 0 ? canList : DefaultCanDoFor(def, functionName),
                cannotList.Count > 0 ? cannotList : DefaultCannotDoFor(def, functionName)
            );
        }

        return (DefaultCanDoFor(def, functionName), DefaultCannotDoFor(def, functionName));
    }

    private async Task SaveRuleSettingAsync(
        string fnKey,
        bool empEdit,
        List<string>? canDo,
        List<string>? cannotDo,
        FunctionDef? def,
        string fnName)
    {
        var rKey = RuleSettingKeyFor(fnKey);
        var ruleSetting = await _db.SystemSettings.FirstOrDefaultAsync(s => s.SettingKey.ToLower() == rKey.ToLower());

        var finalCan = (canDo != null && canDo.Count > 0) ? canDo : DefaultCanDoFor(def, fnName);
        var finalCannot = (cannotDo != null && cannotDo.Count > 0) ? cannotDo : DefaultCannotDoFor(def, fnName);

        if (ruleSetting == null)
        {
            ruleSetting = new SystemSetting
            {
                SettingKey = rKey,
                SettingValue = $"EmpEdit:{(empEdit ? 1 : 0)}",
                Description = EncodeRules(finalCan, finalCannot),
                UpdatedAtUtc = _timeService.UtcNow
            };
            _db.SystemSettings.Add(ruleSetting);
        }
        else
        {
            ruleSetting.SettingValue = $"EmpEdit:{(empEdit ? 1 : 0)}";
            ruleSetting.Description = EncodeRules(finalCan, finalCannot);
            ruleSetting.UpdatedAtUtc = _timeService.UtcNow;
        }
    }

    public async Task<List<PermissionRowDto>> GetAllPermissionsAsync()
    {
        var existingSettings = await _db.SystemSettings
            .Where(s => s.SettingKey.StartsWith("Perm:") || s.SettingKey.StartsWith("PermRule:"))
            .ToListAsync();

        var permMap = existingSettings
            .Where(s => s.SettingKey.StartsWith("Perm:", StringComparison.OrdinalIgnoreCase))
            .ToDictionary(s => s.SettingKey, s => s, StringComparer.OrdinalIgnoreCase);

        var ruleMap = existingSettings
            .Where(s => s.SettingKey.StartsWith("PermRule:", StringComparison.OrdinalIgnoreCase))
            .ToDictionary(s => s.SettingKey, s => s, StringComparer.OrdinalIgnoreCase);

        var result = new List<PermissionRowDto>();
        bool addedAny = false;

        // 1. Built-in definitions in order
        foreach (var def in Definitions)
        {
            var sKey = SettingKeyFor(def.Key);
            if (!permMap.TryGetValue(sKey, out var setting))
            {
                setting = new SystemSetting
                {
                    SettingKey = sKey,
                    SettingValue = EncodeValue(def.DefaultDev, def.DefaultAdmin, def.DefaultEmp, false),
                    Description = EncodeDescription(def.Name, def.Description),
                    UpdatedAtUtc = _timeService.UtcNow
                };
                _db.SystemSettings.Add(setting);
                permMap[sKey] = setting;
                addedAny = true;
            }

            var (dev, admin, emp, empEdit) = DecodeValue(setting.SettingValue, def);
            var (name, desc) = DecodeDescription(setting.Description, def, def.Key);
            ruleMap.TryGetValue(RuleSettingKeyFor(def.Key), out var ruleSetting);
            var (canDo, cannotDo) = DecodeRules(ruleSetting?.Description, def, name);

            result.Add(new PermissionRowDto(
                FunctionKey: def.Key,
                FunctionName: name,
                Description: desc,
                Developer: dev,
                ITAdmin: admin,
                Employee: emp,
                UpdatedAtColombo: _timeService.FormatColombo(setting.UpdatedAtUtc),
                EmployeeCanEdit: empEdit,
                EmployeeCanDo: canDo,
                EmployeeCannotDo: cannotDo
            ));
        }

        // 2. Any custom functions created by Developer
        var builtInKeys = Definitions.Select(d => SettingKeyFor(d.Key)).ToHashSet(StringComparer.OrdinalIgnoreCase);
        foreach (var kv in permMap)
        {
            if (builtInKeys.Contains(kv.Key)) continue;
            var setting = kv.Value;
            var fnKey = setting.SettingKey.Substring("Perm:".Length);
            var (dev, admin, emp, empEdit) = DecodeValue(setting.SettingValue, null);
            var (name, desc) = DecodeDescription(setting.Description, null, fnKey);
            ruleMap.TryGetValue(RuleSettingKeyFor(fnKey), out var ruleSetting);
            var (canDo, cannotDo) = DecodeRules(ruleSetting?.Description, null, name);

            result.Add(new PermissionRowDto(
                FunctionKey: fnKey,
                FunctionName: name,
                Description: desc,
                Developer: dev,
                ITAdmin: admin,
                Employee: emp,
                UpdatedAtColombo: _timeService.FormatColombo(setting.UpdatedAtUtc),
                EmployeeCanEdit: empEdit,
                EmployeeCanDo: canDo,
                EmployeeCannotDo: cannotDo
            ));
        }

        if (addedAny)
        {
            await _db.SaveChangesAsync();
        }

        return result;
    }

    public async Task<PermissionRowDto?> TogglePermissionAsync(TogglePermissionRequest request)
    {
        var functionKey = request.FunctionKey;
        var role = request.Role;
        var isEnabled = request.IsEnabled;

        var def = Definitions.FirstOrDefault(d => d.Key.Equals(functionKey, StringComparison.OrdinalIgnoreCase));
        var fnKey = def?.Key ?? functionKey.Trim();
        var sKey = SettingKeyFor(fnKey);
        var setting = await _db.SystemSettings.FirstOrDefaultAsync(s => s.SettingKey.ToLower() == sKey.ToLower());

        if (setting == null)
        {
            if (def == null) return null;
            setting = new SystemSetting
            {
                SettingKey = sKey,
                SettingValue = EncodeValue(def.DefaultDev, def.DefaultAdmin, def.DefaultEmp, false),
                Description = EncodeDescription(def.Name, def.Description),
                UpdatedAtUtc = _timeService.UtcNow
            };
            _db.SystemSettings.Add(setting);
        }

        var (dev, admin, emp, empEdit) = DecodeValue(setting.SettingValue, def);

        if (role.Equals("Developer", StringComparison.OrdinalIgnoreCase))
            dev = isEnabled;
        else if (role.Equals("ITAdmin", StringComparison.OrdinalIgnoreCase) || role.Equals("IT Admin", StringComparison.OrdinalIgnoreCase))
            admin = isEnabled;
        else if (role.Equals("Employee", StringComparison.OrdinalIgnoreCase))
            emp = isEnabled;
        else
            return null;

        if (request.EmployeeCanEdit.HasValue)
        {
            empEdit = request.EmployeeCanEdit.Value;
        }
        if (!emp)
        {
            empEdit = false;
        }

        setting.SettingValue = EncodeValue(dev, admin, emp, empEdit);
        setting.UpdatedAtUtc = _timeService.UtcNow;

        var (name, desc) = DecodeDescription(setting.Description, def, fnKey);

        if (request.EmployeeCanDo != null || request.EmployeeCannotDo != null || request.EmployeeCanEdit.HasValue)
        {
            await SaveRuleSettingAsync(fnKey, empEdit, request.EmployeeCanDo, request.EmployeeCannotDo, def, name);
        }

        await _db.SaveChangesAsync();

        var rKey = RuleSettingKeyFor(fnKey);
        var ruleSetting = await _db.SystemSettings.FirstOrDefaultAsync(s => s.SettingKey.ToLower() == rKey.ToLower());
        var (canDo, cannotDo) = DecodeRules(ruleSetting?.Description, def, name);

        return new PermissionRowDto(
            FunctionKey: fnKey,
            FunctionName: name,
            Description: desc,
            Developer: dev,
            ITAdmin: admin,
            Employee: emp,
            UpdatedAtColombo: _timeService.FormatColombo(setting.UpdatedAtUtc),
            EmployeeCanEdit: empEdit,
            EmployeeCanDo: canDo,
            EmployeeCannotDo: cannotDo
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

        var empEdit = request.Employee && request.EmployeeCanEdit;
        var setting = new SystemSetting
        {
            SettingKey = sKey,
            SettingValue = EncodeValue(request.Developer, request.ITAdmin, request.Employee, empEdit),
            Description = EncodeDescription(request.FunctionName, request.Description),
            UpdatedAtUtc = _timeService.UtcNow
        };

        _db.SystemSettings.Add(setting);
        var (name, desc) = DecodeDescription(setting.Description, null, rawKey);

        await SaveRuleSettingAsync(rawKey, empEdit, request.EmployeeCanDo, request.EmployeeCannotDo, null, name);
        await _db.SaveChangesAsync();

        var rKey = RuleSettingKeyFor(rawKey);
        var ruleSetting = await _db.SystemSettings.FirstOrDefaultAsync(s => s.SettingKey.ToLower() == rKey.ToLower());
        var (canDo, cannotDo) = DecodeRules(ruleSetting?.Description, null, name);

        return new PermissionRowDto(
            FunctionKey: rawKey,
            FunctionName: name,
            Description: desc,
            Developer: request.Developer,
            ITAdmin: request.ITAdmin,
            Employee: request.Employee,
            UpdatedAtColombo: _timeService.FormatColombo(setting.UpdatedAtUtc),
            EmployeeCanEdit: empEdit,
            EmployeeCanDo: canDo,
            EmployeeCannotDo: cannotDo
        );
    }

    public async Task<PermissionRowDto?> UpdatePermissionAsync(string functionKey, UpdatePermissionRequest request)
    {
        var def = Definitions.FirstOrDefault(d => d.Key.Equals(functionKey, StringComparison.OrdinalIgnoreCase));
        var fnKey = def?.Key ?? functionKey.Trim();
        var sKey = SettingKeyFor(fnKey);
        var setting = await _db.SystemSettings.FirstOrDefaultAsync(s => s.SettingKey.ToLower() == sKey.ToLower());
        if (setting == null) return null;

        var (_, _, _, existingEmpEdit) = DecodeValue(setting.SettingValue, def);
        var empEdit = request.Employee && (request.EmployeeCanEdit ?? existingEmpEdit);

        setting.SettingValue = EncodeValue(request.Developer, request.ITAdmin, request.Employee, empEdit);
        setting.Description = EncodeDescription(request.FunctionName, request.Description);
        setting.UpdatedAtUtc = _timeService.UtcNow;

        var (name, desc) = DecodeDescription(setting.Description, def, fnKey);

        if (request.EmployeeCanDo != null || request.EmployeeCannotDo != null || request.EmployeeCanEdit.HasValue)
        {
            await SaveRuleSettingAsync(fnKey, empEdit, request.EmployeeCanDo, request.EmployeeCannotDo, def, name);
        }

        await _db.SaveChangesAsync();

        var rKey = RuleSettingKeyFor(fnKey);
        var ruleSetting = await _db.SystemSettings.FirstOrDefaultAsync(s => s.SettingKey.ToLower() == rKey.ToLower());
        var (canDo, cannotDo) = DecodeRules(ruleSetting?.Description, def, name);

        return new PermissionRowDto(
            FunctionKey: fnKey,
            FunctionName: name,
            Description: desc,
            Developer: request.Developer,
            ITAdmin: request.ITAdmin,
            Employee: request.Employee,
            UpdatedAtColombo: _timeService.FormatColombo(setting.UpdatedAtUtc),
            EmployeeCanEdit: empEdit,
            EmployeeCanDo: canDo,
            EmployeeCannotDo: cannotDo
        );
    }

    public async Task<bool> DeletePermissionAsync(string functionKey)
    {
        var sKey = SettingKeyFor(functionKey.Trim());
        var rKey = RuleSettingKeyFor(functionKey.Trim());
        var setting = await _db.SystemSettings.FirstOrDefaultAsync(s => s.SettingKey.ToLower() == sKey.ToLower());
        if (setting == null) return false;

        _db.SystemSettings.Remove(setting);
        var ruleSetting = await _db.SystemSettings.FirstOrDefaultAsync(s => s.SettingKey.ToLower() == rKey.ToLower());
        if (ruleSetting != null)
        {
            _db.SystemSettings.Remove(ruleSetting);
        }

        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<List<PermissionRowDto>> ResetToDefaultsAsync()
    {
        var existingSettings = await _db.SystemSettings
            .Where(s => s.SettingKey.StartsWith("Perm:") || s.SettingKey.StartsWith("PermRule:"))
            .ToListAsync();

        var map = existingSettings
            .Where(s => s.SettingKey.StartsWith("Perm:", StringComparison.OrdinalIgnoreCase))
            .ToDictionary(s => s.SettingKey, s => s, StringComparer.OrdinalIgnoreCase);

        var rules = existingSettings
            .Where(s => s.SettingKey.StartsWith("PermRule:", StringComparison.OrdinalIgnoreCase))
            .ToList();

        if (rules.Count > 0)
        {
            _db.SystemSettings.RemoveRange(rules);
        }

        foreach (var def in Definitions)
        {
            var sKey = SettingKeyFor(def.Key);
            if (map.TryGetValue(sKey, out var setting))
            {
                setting.SettingValue = EncodeValue(def.DefaultDev, def.DefaultAdmin, def.DefaultEmp, false);
                setting.Description = EncodeDescription(def.Name, def.Description);
                setting.UpdatedAtUtc = _timeService.UtcNow;
            }
            else
            {
                _db.SystemSettings.Add(new SystemSetting
                {
                    SettingKey = sKey,
                    SettingValue = EncodeValue(def.DefaultDev, def.DefaultAdmin, def.DefaultEmp, false),
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
