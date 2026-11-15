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

    private string? GetCurrentRole() => User.FindFirstValue(ClaimTypes.Role) ?? User.FindFirst("role")?.Value;

    private int GetCurrentUserId()
    {
        var idStr = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirst("nameid")?.Value;
        return int.TryParse(idStr, out var id) ? id : 1;
    }

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
                LastCheckedByAdmin: lastCheck?.CheckedByUser?.FullName ?? lastCheck?.CheckedByUser?.Username,
                IdentificationNumber: d.IdentificationNumber > 0 ? d.IdentificationNumber : d.DeviceId,
                BankAccountName: d.BankAccountName ?? d.PhoneNumber,
                AssignedEmployeeName: d.AssignedEmployeeName
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
            LastCheckedByAdmin: lastCheck?.CheckedByUser?.FullName ?? lastCheck?.CheckedByUser?.Username,
            IdentificationNumber: d.IdentificationNumber > 0 ? d.IdentificationNumber : d.DeviceId,
            BankAccountName: d.BankAccountName ?? d.PhoneNumber,
            AssignedEmployeeName: d.AssignedEmployeeName
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

        var maxId = await _db.MobileDevices.MaxAsync(d => (int?)d.IdentificationNumber) ?? 0;
        int nextIdNum = maxId + 1;

        var bankAccount = !string.IsNullOrWhiteSpace(request.BankAccountName)
            ? request.BankAccountName.Trim()
            : request.PhoneNumber?.Trim();

        var assignedEmployee = !string.IsNullOrWhiteSpace(request.AssignedEmployeeName)
            ? request.AssignedEmployeeName.Trim()
            : null;

        var device = new MobileDevice
        {
            IdentificationNumber = nextIdNum,
            MobileCode = mobileCode,
            GroupId = group.GroupId,
            MobileName = request.MobileName?.Trim(),
            Brand = request.Brand?.Trim(),
            Model = request.Model?.Trim(),
            IMEI = request.IMEI?.Trim(),
            PhoneNumber = bankAccount,
            BankAccountName = bankAccount,
            AssignedEmployeeName = assignedEmployee,
            SerialNumber = request.SerialNumber?.Trim(),
            Description = request.Description?.Trim(),
            CurrentStatus = "Available",
            IsActive = true,
            CreatedAtUtc = _timeService.UtcNow,
            UpdatedAtUtc = _timeService.UtcNow
        };

        // BCNF Normalization: Model linkage
        if (!string.IsNullOrWhiteSpace(device.Model))
        {
            var brandName = device.Brand ?? "Apple";
            var modelEntity = await _db.DeviceModels.FirstOrDefaultAsync(m => m.ModelName.ToLower() == device.Model.ToLower());
            if (modelEntity == null)
            {
                modelEntity = new DeviceModel { Brand = brandName, ModelName = device.Model, DeviceType = "SmartPhone", CreatedAtUtc = DateTime.UtcNow };
                _db.DeviceModels.Add(modelEntity);
                await _db.SaveChangesAsync();
            }
            device.ModelId = modelEntity.ModelId;
        }

        // BCNF Normalization: Manual Employee linkage
        if (!string.IsNullOrWhiteSpace(assignedEmployee))
        {
            var empEntity = await _db.Employees.FirstOrDefaultAsync(e => e.FullName.ToLower() == assignedEmployee.ToLower());
            if (empEntity == null)
            {
                var empCount = await _db.Employees.CountAsync();
                empEntity = new Employee { EmployeeCode = $"EMP-{(empCount + 1):D4}", FullName = assignedEmployee, Department = "Operations", CreatedAtUtc = DateTime.UtcNow, UpdatedAtUtc = DateTime.UtcNow };
                _db.Employees.Add(empEntity);
                await _db.SaveChangesAsync();
            }
            device.EmployeeId = empEntity.EmployeeId;
            device.AssignedEmployeeName = empEntity.FullName;
            device.AssignedEmployeeId = empEntity.EmployeeCode;
        }

        _db.MobileDevices.Add(device);
        await _db.SaveChangesAsync();

        _db.AuditLogs.Add(new AuditLog
        {
            UserId = GetCurrentUserId(),
            UserName = User.Identity?.Name ?? "Administrator",
            UserRole = GetCurrentRole(),
            Action = "CreateDevice",
            EntityName = "MobileDevice",
            EntityId = device.DeviceId.ToString(),
            Details = $"Registered mobile device #{device.IdentificationNumber} ({device.MobileCode}), Model: {device.Brand} {device.Model}, IMEI: {device.IMEI}",
            TimestampUtc = DateTime.UtcNow
        });
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
            LastCheckedAtColombo: null,
            LastCheckedByAdmin: null,
            IdentificationNumber: device.IdentificationNumber,
            BankAccountName: device.BankAccountName ?? device.PhoneNumber,
            AssignedEmployeeName: device.AssignedEmployeeName
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

        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var currentUserId = int.TryParse(userIdStr, out var uid) ? uid : 1;
        var currentUsername = User.FindFirstValue(ClaimTypes.Name) ?? "Authorized User";

        var oldAssigned = device.PhoneNumber ?? "Unassigned";
        var newAssigned = request.PhoneNumber?.Trim() ?? "Unassigned";
        var oldLocation = device.Description ?? "Unspecified";
        var newLocation = request.Description?.Trim() ?? "Unspecified";

        var changeParts = new List<string>();
        if (!string.Equals(oldAssigned, newAssigned, StringComparison.OrdinalIgnoreCase))
        {
            changeParts.Add($"Handover: {oldAssigned} → {newAssigned}");
        }
        if (!string.Equals(oldLocation, newLocation, StringComparison.OrdinalIgnoreCase))
        {
            changeParts.Add($"Location: {oldLocation} → {newLocation}");
        }
        if (!string.Equals(device.MobileName ?? "", request.MobileName?.Trim() ?? "", StringComparison.OrdinalIgnoreCase))
        {
            changeParts.Add($"Device: {device.MobileName ?? "-"} → {request.MobileName?.Trim() ?? "-"}");
        }
        if (device.GroupId != group.GroupId)
        {
            changeParts.Add($"Group changed to {group.GroupName}");
        }

        if (!string.IsNullOrWhiteSpace(request.CurrentStatus))
        {
            var requestedStatus = request.CurrentStatus.Trim();
            if (string.Equals(requestedStatus, "Available", StringComparison.OrdinalIgnoreCase) ||
                string.Equals(requestedStatus, "Found", StringComparison.OrdinalIgnoreCase))
            {
                if (device.CurrentStatus != "Available")
                {
                    changeParts.Add($"Status: {device.CurrentStatus} → Available (FOUND)");
                    device.CurrentStatus = "Available";

                    // Automatically resolve any open MissingIncidents for this device
                    var openIncidents = await _db.MissingIncidents
                        .Where(i => i.DeviceId == device.DeviceId && i.IncidentStatus != "Recovered" && i.IncidentStatus != "Closed")
                        .ToListAsync();
                    foreach (var inc in openIncidents)
                    {
                        inc.IncidentStatus = "Recovered";
                        inc.RecoveredAtUtc = _timeService.UtcNow;
                        inc.ConsecutiveMissingCount = 0;
                        inc.ActionTaken = $"Device updated to Available (FOUND) by {currentUsername}";
                    }

                    // Update recent missing check records
                    var recentMissingChecks = await _db.DeviceCheckRecords
                        .Where(r => r.DeviceId == device.DeviceId && r.DeviceStatus == "Missing")
                        .ToListAsync();
                    foreach (var rec in recentMissingChecks)
                    {
                        rec.DeviceStatus = "Available";
                        rec.CheckedAtUtc = _timeService.UtcNow;
                        rec.Notes = $"Marked Available (FOUND) by {currentUsername}";
                    }
                }
            }
            else if (string.Equals(requestedStatus, "Missing", StringComparison.OrdinalIgnoreCase))
            {
                if (device.CurrentStatus != "Missing")
                {
                    changeParts.Add($"Status: {device.CurrentStatus} → Missing");
                    device.CurrentStatus = "Missing";
                }
            }
        }

        device.GroupId = group.GroupId;
        device.MobileName = request.MobileName?.Trim();
        device.Brand = request.Brand?.Trim();
        device.Model = request.Model?.Trim();
        device.IMEI = request.IMEI?.Trim();

        var bankAccount = !string.IsNullOrWhiteSpace(request.BankAccountName)
            ? request.BankAccountName.Trim()
            : request.PhoneNumber?.Trim();

        if (bankAccount != null)
        {
            device.BankAccountName = bankAccount;
            device.PhoneNumber = bankAccount;
        }

        if (request.AssignedEmployeeName != null)
        {
            var empName = request.AssignedEmployeeName.Trim();
            if (string.IsNullOrWhiteSpace(empName) || empName.Equals("Unassigned", StringComparison.OrdinalIgnoreCase))
            {
                device.AssignedEmployeeName = null;
                device.AssignedEmployeeId = null;
                device.EmployeeId = null;
            }
            else
            {
                var empEntity = await _db.Employees.FirstOrDefaultAsync(e => e.FullName.ToLower() == empName.ToLower());
                if (empEntity == null)
                {
                    var empCount = await _db.Employees.CountAsync();
                    empEntity = new Employee { EmployeeCode = $"EMP-{(empCount + 1):D4}", FullName = empName, Department = "Operations", CreatedAtUtc = DateTime.UtcNow, UpdatedAtUtc = DateTime.UtcNow };
                    _db.Employees.Add(empEntity);
                    await _db.SaveChangesAsync();
                }
                device.EmployeeId = empEntity.EmployeeId;
                device.AssignedEmployeeName = empEntity.FullName;
                device.AssignedEmployeeId = empEntity.EmployeeCode;
            }
        }

        device.SerialNumber = request.SerialNumber?.Trim();
        device.Description = request.Description?.Trim();
        device.IsActive = request.IsActive;
        device.UpdatedAtUtc = _timeService.UtcNow;

        var auditSummary = changeParts.Count > 0
            ? $"Updated by {currentUsername}: {string.Join(" | ", changeParts)}"
            : $"Device info updated ({device.MobileCode}) by {currentUsername}";

        var latestCheck = await _db.DeviceCheckRecords
            .Where(r => r.DeviceId == id)
            .OrderByDescending(r => r.CheckedAtUtc)
            .FirstOrDefaultAsync();
        if (latestCheck != null)
        {
            latestCheck.GroupId = group.GroupId;
            latestCheck.CheckedAtUtc = _timeService.UtcNow;
            latestCheck.CheckedByUserId = currentUserId;
            latestCheck.Notes = auditSummary;
        }

        _db.Notifications.Add(new Notification
        {
            DeviceId = device.DeviceId,
            NotificationType = "DeviceUpdate",
            Message = $"{device.MobileCode}: {auditSummary}",
            Priority = "Low",
            IsRead = false,
            CreatedAtUtc = _timeService.UtcNow
        });

        _db.AuditLogs.Add(new AuditLog
        {
            UserId = currentUserId,
            UserName = currentUsername,
            UserRole = GetCurrentRole(),
            Action = "UpdateDevice",
            EntityName = "MobileDevice",
            EntityId = device.DeviceId.ToString(),
            Details = $"Updated Device #{device.IdentificationNumber} ({device.MobileCode}): {auditSummary}",
            TimestampUtc = DateTime.UtcNow
        });

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

        _db.AuditLogs.Add(new AuditLog
        {
            UserId = GetCurrentUserId(),
            UserName = User.Identity?.Name ?? "Administrator",
            UserRole = GetCurrentRole(),
            Action = "DeleteDevice",
            EntityName = "MobileDevice",
            EntityId = device.DeviceId.ToString(),
            Details = $"Permanently deleted device #{device.IdentificationNumber} ({device.MobileCode})",
            TimestampUtc = DateTime.UtcNow
        });

        await _db.SaveChangesAsync();

        return Ok(new { message = $"Device {device.MobileCode} has been deleted." });
    }

    [HttpPost("{id}/assign")]
    public async Task<ActionResult> AssignEmployee(int id, [FromBody] AssignEmployeeRequest request)
    {
        if (!await _permissionService.HasPermissionAsync(GetCurrentRole(), "manage_mobile_phones"))
        {
            return StatusCode(403, new { message = "Manage mobile phones permission is currently disabled for your role." });
        }

        var device = await _db.MobileDevices.FindAsync(id);
        if (device == null) return NotFound();

        var empName = request.EmployeeName?.Trim();
        if (string.IsNullOrWhiteSpace(empName))
        {
            return BadRequest(new { message = "Employee name is required." });
        }

        var prevEmp = device.AssignedEmployeeName ?? "Unassigned";

        // Find or create employee entity
        var empEntity = await _db.Employees.FirstOrDefaultAsync(e => e.FullName.ToLower() == empName.ToLower());
        if (empEntity == null)
        {
            var empCount = await _db.Employees.CountAsync();
            empEntity = new Employee
            {
                EmployeeCode = $"EMP-{(empCount + 1):D4}",
                FullName = empName,
                Department = request.Department?.Trim() ?? "Operations",
                IsActive = true,
                CreatedAtUtc = DateTime.UtcNow,
                UpdatedAtUtc = DateTime.UtcNow
            };
            _db.Employees.Add(empEntity);
            await _db.SaveChangesAsync();
        }

        device.EmployeeId = empEntity.EmployeeId;
        device.AssignedEmployeeName = empEntity.FullName;
        device.AssignedEmployeeId = empEntity.EmployeeCode;
        if (!string.IsNullOrWhiteSpace(request.Department))
        {
            device.Department = request.Department.Trim();
        }
        device.LastAssignmentDateUtc = _timeService.UtcNow;
        device.UpdatedAtUtc = _timeService.UtcNow;

        var currentUserId = GetCurrentUserId();
        var currentUsername = User.Identity?.Name ?? "Administrator";

        // Record movement / handover history
        _db.DeviceMovements.Add(new DeviceMovement
        {
            DeviceId = device.DeviceId,
            MovementType = "Assignment",
            FromStatus = "InStock",
            ToStatus = "Assigned",
            FromEmployee = prevEmp,
            ToEmployee = empEntity.FullName,
            Reason = request.Notes ?? "Manual assignment to employee",
            MovementDateUtc = _timeService.UtcNow,
            PerformedByUserId = currentUserId,
            PerformedByName = currentUsername,
            CreatedAtUtc = _timeService.UtcNow
        });

        _db.AuditLogs.Add(new AuditLog
        {
            UserId = currentUserId,
            UserName = currentUsername,
            UserRole = GetCurrentRole(),
            Action = "AssignDevice",
            EntityName = "MobileDevice",
            EntityId = device.DeviceId.ToString(),
            Details = $"Assigned Device #{device.IdentificationNumber} ({device.MobileCode}, Bank: {device.BankAccountName}) to Employee '{empEntity.FullName}' (was: {prevEmp})",
            TimestampUtc = DateTime.UtcNow
        });

        await _db.SaveChangesAsync();
        return Ok(new { message = $"Device #{device.IdentificationNumber} successfully assigned to {empEntity.FullName}." });
    }

    [HttpPost("{id}/unassign")]
    public async Task<ActionResult> UnassignEmployee(int id)
    {
        if (!await _permissionService.HasPermissionAsync(GetCurrentRole(), "manage_mobile_phones"))
        {
            return StatusCode(403, new { message = "Manage mobile phones permission is currently disabled for your role." });
        }

        var device = await _db.MobileDevices.FindAsync(id);
        if (device == null) return NotFound();

        var prevEmp = device.AssignedEmployeeName ?? "Unassigned";
        device.AssignedEmployeeName = null;
        device.AssignedEmployeeId = null;
        device.EmployeeId = null;
        device.LastReturnDateUtc = _timeService.UtcNow;
        device.UpdatedAtUtc = _timeService.UtcNow;

        var currentUserId = GetCurrentUserId();
        var currentUsername = User.Identity?.Name ?? "Administrator";

        _db.DeviceMovements.Add(new DeviceMovement
        {
            DeviceId = device.DeviceId,
            MovementType = "Unassignment",
            FromStatus = "Assigned",
            ToStatus = "InStock",
            FromEmployee = prevEmp,
            ToEmployee = "Unassigned (Company Stock)",
            Reason = "Manual unassignment / return to stock",
            MovementDateUtc = _timeService.UtcNow,
            PerformedByUserId = currentUserId,
            PerformedByName = currentUsername,
            CreatedAtUtc = _timeService.UtcNow
        });

        _db.AuditLogs.Add(new AuditLog
        {
            UserId = currentUserId,
            UserName = currentUsername,
            UserRole = GetCurrentRole(),
            Action = "UnassignDevice",
            EntityName = "MobileDevice",
            EntityId = device.DeviceId.ToString(),
            Details = $"Unassigned Device #{device.IdentificationNumber} ({device.MobileCode}, Bank: {device.BankAccountName}) from Employee '{prevEmp}' - returned to inventory stock",
            TimestampUtc = DateTime.UtcNow
        });

        await _db.SaveChangesAsync();
        return Ok(new { message = $"Device #{device.IdentificationNumber} returned to inventory as unassigned stock." });
    }

    [HttpPost("seed-excel")]
    [Authorize(Roles = "Developer,ITAdmin")]
    public async Task<ActionResult> SeedExcelInventory()
    {
        await DbInitializer.SeedExcelInventoryAsync(_db);
        var total = await _db.MobileDevices.CountAsync(d => d.IsActive);
        return Ok(new { message = "Company Excel inventory seeded.", totalDevices = total });
    }
}
