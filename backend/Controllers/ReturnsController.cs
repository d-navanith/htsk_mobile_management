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
public class ReturnsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ITimeService _timeService;
    private readonly IPermissionService _permissionService;

    public ReturnsController(AppDbContext db, ITimeService timeService, IPermissionService permissionService)
    {
        _db = db;
        _timeService = timeService;
        _permissionService = permissionService;
    }

    private string? GetCurrentRole() => User.FindFirstValue(ClaimTypes.Role);

    private async Task<(int UserId, string AdminName)> GetCurrentAdminAsync()
    {
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var uid = int.TryParse(userIdStr, out var parsed) ? parsed : 1;
        var user = await _db.Users.FindAsync(uid);
        var name = user?.FullName ?? User.FindFirstValue(ClaimTypes.Name) ?? "IT Administrator";
        return (uid, name);
    }

    private static string GenerateEmployeeId(string employeeName, int fallbackIndex = 1)
    {
        var clean = (employeeName ?? "").Trim();
        if (string.IsNullOrEmpty(clean)) return $"EMP-{fallbackIndex:D4}";
        int hash = 17;
        foreach (var ch in clean.ToUpperInvariant())
        {
            if (char.IsLetterOrDigit(ch))
            {
                hash = unchecked(hash * 31 + ch);
            }
        }
        var num = (Math.Abs(hash) % 8999) + 1000;
        return $"EMP-{num:D4}";
    }

    private async Task<ReturnReplacementCountsDto> GetLiveCountsAsync()
    {
        var total = await _db.MobileDevices.CountAsync(d => d.IsActive);
        var missing = await _db.MobileDevices.CountAsync(d => d.IsActive && d.CurrentStatus == "Missing");
        var assigned = await _db.MobileDevices.CountAsync(d =>
            d.IsActive && d.CurrentStatus != "Missing" && d.AssignedEmployeeName != null && d.AssignedEmployeeName != "");
        var available = await _db.MobileDevices.CountAsync(d =>
            d.IsActive && d.CurrentStatus != "Missing" && (d.AssignedEmployeeName == null || d.AssignedEmployeeName == ""));

        return new ReturnReplacementCountsDto(
            TotalDevices: total,
            AssignedDevices: assigned,
            AvailableDevices: available,
            MissingDevices: missing
        );
    }

    private DeviceReturnReplacementDto MapTransaction(DeviceReturnReplacement t)
    {
        return new DeviceReturnReplacementDto(
            TransactionId: t.TransactionId,
            TransactionType: t.TransactionType,
            EmployeeId: t.EmployeeId,
            EmployeeName: t.EmployeeName,
            GroupName: t.GroupName,
            PreviouslyAssignedDeviceId: t.PreviouslyAssignedDeviceId,
            PreviouslyAssignedMobileCode: t.PreviouslyAssignedMobileCode,
            PreviouslyAssignedDeviceModel: t.PreviouslyAssignedDeviceModel,
            ReturnedDeviceId: t.ReturnedDeviceId,
            ReturnedMobileCode: t.ReturnedMobileCode,
            ReturnedDeviceModel: t.ReturnedDeviceModel,
            ReturnDateColombo: t.ReturnDateUtc.HasValue ? _timeService.FormatColombo(t.ReturnDateUtc.Value) : null,
            DeviceCondition: t.DeviceCondition,
            ReturnProcessedByName: t.ReturnProcessedByName,
            ReplacementDeviceId: t.ReplacementDeviceId,
            ReplacementMobileCode: t.ReplacementMobileCode,
            ReplacementDeviceModel: t.ReplacementDeviceModel,
            NewAssignmentDateColombo: t.NewAssignmentDateUtc.HasValue ? _timeService.FormatColombo(t.NewAssignmentDateUtc.Value) : null,
            ReplacementAssignedByName: t.ReplacementAssignedByName,
            Remarks: t.Remarks,
            CreatedAtColombo: _timeService.FormatColombo(t.CreatedAtUtc)
        );
    }

    [HttpGet("counts")]
    public async Task<ActionResult<ReturnReplacementCountsDto>> GetCounts()
    {
        return Ok(await GetLiveCountsAsync());
    }

    [HttpGet("employees")]
    public async Task<ActionResult<List<EmployeeReturnOptionDto>>> GetEmployees([FromQuery] string? search)
    {
        var activeDevices = await _db.MobileDevices
            .Include(d => d.Group)
            .Where(d => d.IsActive && d.AssignedEmployeeName != null && d.AssignedEmployeeName != "")
            .OrderBy(d => d.AssignedEmployeeName)
            .ThenBy(d => d.MobileCode)
            .ToListAsync();

        var recentTransactions = await _db.DeviceReturnReplacements
            .OrderByDescending(t => t.CreatedAtUtc)
            .ToListAsync();

        var employeeMap = new Dictionary<string, EmployeeReturnOptionDto>(StringComparer.OrdinalIgnoreCase);

        foreach (var d in activeDevices)
        {
            var empName = d.AssignedEmployeeName!.Trim();
            if (!employeeMap.TryGetValue(empName, out var opt))
            {
                var empTx = recentTransactions.FirstOrDefault(t =>
                    string.Equals(t.EmployeeName, empName, StringComparison.OrdinalIgnoreCase));
                var empId = empTx?.EmployeeId ?? GenerateEmployeeId(empName, d.DeviceId);
                var pendingTx = recentTransactions.FirstOrDefault(t =>
                    string.Equals(t.EmployeeName, empName, StringComparison.OrdinalIgnoreCase) &&
                    t.ReturnedDeviceId.HasValue && !t.ReplacementDeviceId.HasValue);

                opt = new EmployeeReturnOptionDto(
                    EmployeeId: empId,
                    EmployeeName: empName,
                    GroupName: d.Group?.GroupName ?? "General",
                    AssignedDevices: new List<EmployeeAssignedDeviceDto>(),
                    PendingReturnTransactionId: pendingTx?.TransactionId,
                    LastReturnedMobileCode: pendingTx?.ReturnedMobileCode ?? empTx?.ReturnedMobileCode,
                    LastReturnedDeviceModel: pendingTx?.ReturnedDeviceModel ?? empTx?.ReturnedDeviceModel,
                    LastReturnDateColombo: pendingTx?.ReturnDateUtc != null
                        ? _timeService.FormatColombo(pendingTx.ReturnDateUtc.Value)
                        : null
                );
                employeeMap[empName] = opt;
            }

            opt.AssignedDevices.Add(new EmployeeAssignedDeviceDto(
                DeviceId: d.DeviceId,
                MobileCode: d.MobileCode,
                MobileName: d.MobileName,
                Brand: d.Brand,
                Model: d.Model,
                IMEI: d.IMEI,
                SerialNumber: d.SerialNumber,
                GroupId: d.GroupId,
                GroupName: d.Group?.GroupName ?? "General",
                Location: d.Description,
                CurrentStatus: "Active / Assigned",
                AssignedAtColombo: _timeService.FormatColombo(d.UpdatedAtUtc)
            ));
        }

        // Also include employees who recently returned their device and currently have 0 assigned devices (awaiting Step 2 replacement)
        foreach (var tx in recentTransactions)
        {
            var empName = tx.EmployeeName.Trim();
            if (!string.IsNullOrEmpty(empName) && !employeeMap.ContainsKey(empName))
            {
                var pendingTx = recentTransactions.FirstOrDefault(t =>
                    string.Equals(t.EmployeeName, empName, StringComparison.OrdinalIgnoreCase) &&
                    t.ReturnedDeviceId.HasValue && !t.ReplacementDeviceId.HasValue) ?? tx;

                employeeMap[empName] = new EmployeeReturnOptionDto(
                    EmployeeId: tx.EmployeeId,
                    EmployeeName: empName,
                    GroupName: tx.GroupName ?? "General",
                    AssignedDevices: new List<EmployeeAssignedDeviceDto>(),
                    PendingReturnTransactionId: pendingTx.ReplacementDeviceId == null ? pendingTx.TransactionId : null,
                    LastReturnedMobileCode: pendingTx.ReturnedMobileCode,
                    LastReturnedDeviceModel: pendingTx.ReturnedDeviceModel,
                    LastReturnDateColombo: pendingTx.ReturnDateUtc.HasValue
                        ? _timeService.FormatColombo(pendingTx.ReturnDateUtc.Value)
                        : null
                );
            }
        }

        var result = employeeMap.Values
            .OrderByDescending(e => e.PendingReturnTransactionId.HasValue && e.AssignedDevices.Count == 0)
            .ThenBy(e => e.EmployeeName)
            .ToList();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var q = search.Trim().ToLowerInvariant();
            result = result.Where(e =>
                e.EmployeeName.ToLowerInvariant().Contains(q) ||
                e.EmployeeId.ToLowerInvariant().Contains(q) ||
                e.GroupName.ToLowerInvariant().Contains(q) ||
                e.AssignedDevices.Any(d => d.MobileCode.ToLowerInvariant().Contains(q) ||
                                           (d.Model != null && d.Model.ToLowerInvariant().Contains(q)))
            ).ToList();
        }

        return Ok(result);
    }

    [HttpGet("available-devices")]
    public async Task<ActionResult<List<DeviceDto>>> GetAvailableDevices([FromQuery] string? search)
    {
        var query = _db.MobileDevices
            .Include(d => d.Group)
            .Include(d => d.CheckRecords)
                .ThenInclude(c => c.CheckedByUser)
            .Where(d => d.IsActive && d.CurrentStatus != "Missing" && (d.AssignedEmployeeName == null || d.AssignedEmployeeName == ""));

        if (!string.IsNullOrWhiteSpace(search))
        {
            var q = search.Trim().ToLower();
            query = query.Where(d =>
                d.MobileCode.ToLower().Contains(q) ||
                (d.MobileName != null && d.MobileName.ToLower().Contains(q)) ||
                (d.Brand != null && d.Brand.ToLower().Contains(q)) ||
                (d.Model != null && d.Model.ToLower().Contains(q)) ||
                (d.IMEI != null && d.IMEI.ToLower().Contains(q)) ||
                (d.SerialNumber != null && d.SerialNumber.ToLower().Contains(q)) ||
                (d.Group != null && d.Group.GroupName.ToLower().Contains(q)));
        }

        var devices = await query.OrderBy(d => d.MobileCode).ToListAsync();

        var dtos = devices.Select(d =>
        {
            var lastCheck = d.CheckRecords.OrderByDescending(c => c.CheckedAtUtc).FirstOrDefault();
            return new DeviceDto(
                DeviceId: d.DeviceId,
                MobileCode: d.MobileCode,
                GroupId: d.GroupId,
                GroupName: d.Group?.GroupName ?? "General",
                MobileName: d.MobileName,
                Brand: d.Brand,
                Model: d.Model,
                IMEI: d.IMEI,
                PhoneNumber: d.PhoneNumber,
                SerialNumber: d.SerialNumber,
                Description: d.Description,
                CurrentStatus: "Available",
                IsActive: d.IsActive,
                ConsecutiveMissingCount: 0,
                CreatedAtColombo: _timeService.FormatColombo(d.CreatedAtUtc),
                UpdatedAtColombo: _timeService.FormatColombo(d.UpdatedAtUtc),
                LastCheckedAtColombo: lastCheck != null ? _timeService.FormatColombo(lastCheck.CheckedAtUtc) : null,
                LastCheckedByAdmin: lastCheck?.CheckedByUser?.FullName ?? lastCheck?.CheckedByUser?.Username,
                IdentificationNumber: d.IdentificationNumber > 0 ? d.IdentificationNumber : d.DeviceId,
                BankAccountName: d.BankAccountName ?? d.PhoneNumber,
                AssignedEmployeeName: null
            );
        }).ToList();

        return Ok(dtos);
    }

    [HttpGet("history")]
    public async Task<ActionResult<List<DeviceReturnReplacementDto>>> GetHistory([FromQuery] string? search)
    {
        var query = _db.DeviceReturnReplacements.AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var q = search.Trim().ToLower();
            query = query.Where(t =>
                t.EmployeeName.ToLower().Contains(q) ||
                t.EmployeeId.ToLower().Contains(q) ||
                (t.ReturnedMobileCode != null && t.ReturnedMobileCode.ToLower().Contains(q)) ||
                (t.ReplacementMobileCode != null && t.ReplacementMobileCode.ToLower().Contains(q)) ||
                (t.PreviouslyAssignedMobileCode != null && t.PreviouslyAssignedMobileCode.ToLower().Contains(q)) ||
                (t.DeviceCondition != null && t.DeviceCondition.ToLower().Contains(q)) ||
                (t.Remarks != null && t.Remarks.ToLower().Contains(q)));
        }

        var list = await query
            .OrderByDescending(t => t.CreatedAtUtc)
            .ThenByDescending(t => t.TransactionId)
            .ToListAsync();

        return Ok(list.Select(MapTransaction).ToList());
    }

    [HttpPost("return")]
    public async Task<ActionResult<ReturnReplacementOperationResponse>> ProcessDeviceReturn([FromBody] ProcessDeviceReturnRequest request)
    {
        if (!await _permissionService.HasPermissionAsync(GetCurrentRole(), "manage_mobile_phones"))
        {
            return StatusCode(403, new { message = "You do not have permission to process device returns." });
        }

        if (string.IsNullOrWhiteSpace(request.EmployeeName))
        {
            return BadRequest(new { message = "Please select a valid employee returning the device." });
        }

        await using var transaction = await _db.Database.BeginTransactionAsync();
        try
        {
            var device = await _db.MobileDevices
                .Include(d => d.Group)
                .FirstOrDefaultAsync(d => d.DeviceId == request.DeviceId);

            if (device == null || !device.IsActive)
            {
                return NotFound(new { message = "Selected mobile device was not found or is inactive." });
            }

            // Prevent duplicate returns: verify the device is currently assigned
            if (string.IsNullOrWhiteSpace(device.AssignedEmployeeName))
            {
                return BadRequest(new
                {
                    message = $"Duplicate return prevented: Device '{device.MobileCode}' is not currently assigned to any employee."
                });
            }

            var currentHolder = device.AssignedEmployeeName.Trim();
            if (!string.Equals(currentHolder, request.EmployeeName.Trim(), StringComparison.OrdinalIgnoreCase))
            {
                return BadRequest(new
                {
                    message = $"Device '{device.MobileCode}' is currently assigned to '{currentHolder}', not '{request.EmployeeName.Trim()}'."
                });
            }

            var (adminId, adminName) = await GetCurrentAdminAsync();
            var nowUtc = _timeService.UtcNow;
            var empId = string.IsNullOrWhiteSpace(request.EmployeeId)
                ? GenerateEmployeeId(currentHolder, device.DeviceId)
                : request.EmployeeId.Trim();
            var condition = string.IsNullOrWhiteSpace(request.DeviceCondition) ? "Good" : request.DeviceCondition.Trim();
            var modelLabel = !string.IsNullOrWhiteSpace(device.Model)
                ? $"{device.Brand ?? ""} {device.Model}".Trim()
                : (device.MobileName ?? "Mobile Device");

            // Update device status from Active / Assigned -> Available or UnderMaintenance depending on condition
            bool isDamaged = condition.Contains("Damage", StringComparison.OrdinalIgnoreCase) ||
                             condition.Contains("Repair", StringComparison.OrdinalIgnoreCase) ||
                             condition.Contains("Broken", StringComparison.OrdinalIgnoreCase);

            var targetStatus = isDamaged ? "UnderMaintenance" : "Available";

            device.AssignedEmployeeName = null;
            device.AssignedEmployeeId = null;
            device.EmployeeId = null;
            device.CurrentStatus = targetStatus;
            device.LastReturnDateUtc = nowUtc;
            device.UpdatedAtUtc = nowUtc;

            _db.DeviceMovements.Add(new DeviceMovement
            {
                DeviceId = device.DeviceId,
                MovementType = "Return",
                FromStatus = "Assigned",
                ToStatus = targetStatus,
                FromEmployee = currentHolder,
                ToEmployee = null,
                FromLocation = device.Description,
                ToLocation = isDamaged ? "IT Maintenance Workshop" : "Inventory Stockroom",
                Reason = $"Device returned. Condition: {condition}. {request.Remarks}".Trim(),
                MovementDateUtc = nowUtc,
                PerformedByUserId = adminId,
                PerformedByName = adminName,
                CreatedAtUtc = nowUtc
            });

            var txRecord = new DeviceReturnReplacement
            {
                TransactionType = "Return",
                EmployeeId = empId,
                EmployeeName = currentHolder,
                GroupName = device.Group?.GroupName ?? "General",
                PreviouslyAssignedDeviceId = device.DeviceId,
                PreviouslyAssignedMobileCode = device.MobileCode,
                PreviouslyAssignedDeviceModel = modelLabel,
                ReturnedDeviceId = device.DeviceId,
                ReturnedMobileCode = device.MobileCode,
                ReturnedDeviceModel = modelLabel,
                ReturnDateUtc = nowUtc,
                DeviceCondition = condition,
                ReturnProcessedByUserId = adminId,
                ReturnProcessedByName = adminName,
                Remarks = request.Remarks?.Trim(),
                CreatedAtUtc = nowUtc
            };

            _db.DeviceReturnReplacements.Add(txRecord);

            _db.AuditLogs.Add(new AuditLog
            {
                UserId = adminId,
                UserName = adminName,
                UserRole = GetCurrentRole(),
                Action = "DeviceReturn",
                EntityName = "MobileDevice",
                EntityId = device.DeviceId.ToString(),
                Details = $"Device Return: Device #{device.IdentificationNumber} ({device.MobileCode}) returned by {currentHolder} ({empId}). Condition: '{condition}'. Status set to {targetStatus}.",
                TimestampUtc = nowUtc
            });

            _db.Notifications.Add(new Notification
            {
                DeviceId = device.DeviceId,
                NotificationType = "DeviceReturn",
                Message = $"Device Return: {device.MobileCode} ({modelLabel}) returned by {currentHolder} ({empId}) in '{condition}' condition. Processed by {adminName}. Status updated to Available.",
                Priority = condition.Contains("Damaged", StringComparison.OrdinalIgnoreCase) || condition.Contains("Repair", StringComparison.OrdinalIgnoreCase) ? "Medium" : "Low",
                IsRead = false,
                CreatedAtUtc = nowUtc
            });

            await _db.SaveChangesAsync();
            await transaction.CommitAsync();

            var counts = await GetLiveCountsAsync();
            return Ok(new ReturnReplacementOperationResponse(
                Message: $"Device '{device.MobileCode}' returned by {currentHolder} and is now Available in company inventory.",
                Transaction: MapTransaction(txRecord),
                Counts: counts
            ));
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            return StatusCode(500, new { message = $"Device return failed and was safely rolled back: {ex.Message}" });
        }
    }

    [HttpPost("replace")]
    public async Task<ActionResult<ReturnReplacementOperationResponse>> ProcessDeviceReplacement([FromBody] ProcessDeviceReplacementRequest request)
    {
        if (!await _permissionService.HasPermissionAsync(GetCurrentRole(), "manage_mobile_phones"))
        {
            return StatusCode(403, new { message = "You do not have permission to assign replacement devices." });
        }

        if (string.IsNullOrWhiteSpace(request.EmployeeName))
        {
            return BadRequest(new { message = "Please select a valid employee to receive the replacement device." });
        }

        await using var transaction = await _db.Database.BeginTransactionAsync();
        try
        {
            var replacementDevice = await _db.MobileDevices
                .Include(d => d.Group)
                .FirstOrDefaultAsync(d => d.DeviceId == request.ReplacementDeviceId);

            if (replacementDevice == null || !replacementDevice.IsActive)
            {
                return NotFound(new { message = "Selected replacement device was not found or is inactive." });
            }

            // Business Rule: Only devices with Available status and not assigned to anyone can be assigned
            if (replacementDevice.CurrentStatus == "Missing")
            {
                return BadRequest(new
                {
                    message = $"Cannot assign '{replacementDevice.MobileCode}' because it is currently marked as Missing."
                });
            }

            if (!string.IsNullOrWhiteSpace(replacementDevice.AssignedEmployeeName))
            {
                return BadRequest(new
                {
                    message = $"Duplicate assignment prevented: Device '{replacementDevice.MobileCode}' is already assigned to '{replacementDevice.AssignedEmployeeName}'."
                });
            }

            var (adminId, adminName) = await GetCurrentAdminAsync();
            var nowUtc = _timeService.UtcNow;
            var empName = request.EmployeeName.Trim();
            var empId = string.IsNullOrWhiteSpace(request.EmployeeId)
                ? GenerateEmployeeId(empName, replacementDevice.DeviceId)
                : request.EmployeeId.Trim();

            var newModelLabel = !string.IsNullOrWhiteSpace(replacementDevice.Model)
                ? $"{replacementDevice.Brand ?? ""} {replacementDevice.Model}".Trim()
                : (replacementDevice.MobileName ?? "Mobile Device");

            // Check if there is an existing Return transaction to link with this replacement
            DeviceReturnReplacement? linkedReturn = null;
            if (request.ReturnTransactionId.HasValue)
            {
                linkedReturn = await _db.DeviceReturnReplacements
                    .FirstOrDefaultAsync(t => t.TransactionId == request.ReturnTransactionId.Value);
            }
            if (linkedReturn == null)
            {
                linkedReturn = await _db.DeviceReturnReplacements
                    .Where(t => t.EmployeeName.ToLower() == empName.ToLower() &&
                                t.ReturnedDeviceId.HasValue &&
                                !t.ReplacementDeviceId.HasValue)
                    .OrderByDescending(t => t.CreatedAtUtc)
                    .FirstOrDefaultAsync();
            }

            // Update replacement device status from Available -> Active / Assigned
            replacementDevice.AssignedEmployeeName = empName;
            replacementDevice.AssignedEmployeeId = empId;
            replacementDevice.CurrentStatus = "Assigned";
            replacementDevice.LastAssignmentDateUtc = nowUtc;
            replacementDevice.UpdatedAtUtc = nowUtc;

            _db.DeviceMovements.Add(new DeviceMovement
            {
                DeviceId = replacementDevice.DeviceId,
                MovementType = "Replacement",
                FromStatus = "Available",
                ToStatus = "Assigned",
                FromEmployee = null,
                ToEmployee = empName,
                FromLocation = "Inventory Stockroom",
                ToLocation = replacementDevice.Description,
                Reason = $"Device assigned as replacement to {empName}. {request.Remarks}".Trim(),
                MovementDateUtc = nowUtc,
                PerformedByUserId = adminId,
                PerformedByName = adminName,
                CreatedAtUtc = nowUtc
            });

            DeviceReturnReplacement finalTx;

            if (linkedReturn != null && !linkedReturn.ReplacementDeviceId.HasValue)
            {
                linkedReturn.TransactionType = "ReturnAndReplacement";
                linkedReturn.ReplacementDeviceId = replacementDevice.DeviceId;
                linkedReturn.ReplacementMobileCode = replacementDevice.MobileCode;
                linkedReturn.ReplacementDeviceModel = newModelLabel;
                linkedReturn.NewAssignmentDateUtc = nowUtc;
                linkedReturn.ReplacementAssignedByUserId = adminId;
                linkedReturn.ReplacementAssignedByName = adminName;
                if (!string.IsNullOrWhiteSpace(request.Remarks))
                {
                    linkedReturn.Remarks = string.IsNullOrWhiteSpace(linkedReturn.Remarks)
                        ? request.Remarks.Trim()
                        : $"{linkedReturn.Remarks} | Replacement: {request.Remarks.Trim()}";
                }
                finalTx = linkedReturn;
            }
            else
            {
                MobileDevice? prevDevice = null;
                if (request.PreviouslyAssignedDeviceId.HasValue)
                {
                    prevDevice = await _db.MobileDevices.FindAsync(request.PreviouslyAssignedDeviceId.Value);
                }

                var lastHistory = await _db.DeviceReturnReplacements
                    .Where(t => t.EmployeeName.ToLower() == empName.ToLower())
                    .OrderByDescending(t => t.CreatedAtUtc)
                    .FirstOrDefaultAsync();

                var prevModelLabel = prevDevice != null
                    ? (!string.IsNullOrWhiteSpace(prevDevice.Model) ? $"{prevDevice.Brand ?? ""} {prevDevice.Model}".Trim() : prevDevice.MobileName)
                    : (lastHistory?.ReturnedDeviceModel ?? lastHistory?.PreviouslyAssignedDeviceModel);

                finalTx = new DeviceReturnReplacement
                {
                    TransactionType = "Replacement",
                    EmployeeId = empId,
                    EmployeeName = empName,
                    GroupName = request.GroupName ?? replacementDevice.Group?.GroupName ?? lastHistory?.GroupName ?? "General",
                    PreviouslyAssignedDeviceId = prevDevice?.DeviceId ?? lastHistory?.ReturnedDeviceId ?? lastHistory?.PreviouslyAssignedDeviceId,
                    PreviouslyAssignedMobileCode = prevDevice?.MobileCode ?? lastHistory?.ReturnedMobileCode ?? lastHistory?.PreviouslyAssignedMobileCode,
                    PreviouslyAssignedDeviceModel = prevModelLabel,
                    ReturnedDeviceId = lastHistory?.ReturnedDeviceId,
                    ReturnedMobileCode = lastHistory?.ReturnedMobileCode,
                    ReturnedDeviceModel = lastHistory?.ReturnedDeviceModel,
                    ReturnDateUtc = lastHistory?.ReturnDateUtc,
                    DeviceCondition = lastHistory?.DeviceCondition,
                    ReturnProcessedByUserId = lastHistory?.ReturnProcessedByUserId,
                    ReturnProcessedByName = lastHistory?.ReturnProcessedByName,
                    ReplacementDeviceId = replacementDevice.DeviceId,
                    ReplacementMobileCode = replacementDevice.MobileCode,
                    ReplacementDeviceModel = newModelLabel,
                    NewAssignmentDateUtc = nowUtc,
                    ReplacementAssignedByUserId = adminId,
                    ReplacementAssignedByName = adminName,
                    Remarks = request.Remarks?.Trim(),
                    CreatedAtUtc = nowUtc
                };
                _db.DeviceReturnReplacements.Add(finalTx);
            }

            _db.Notifications.Add(new Notification
            {
                DeviceId = replacementDevice.DeviceId,
                NotificationType = "DeviceReplacement",
                Message = $"Device Replacement: {replacementDevice.MobileCode} ({newModelLabel}) assigned to {empName} ({empId}) by {adminName}. Status updated to Active / Assigned.",
                Priority = "Low",
                IsRead = false,
                CreatedAtUtc = nowUtc
            });

            _db.AuditLogs.Add(new AuditLog
            {
                UserId = adminId,
                UserName = adminName,
                UserRole = GetCurrentRole(),
                Action = "DeviceReplacement",
                EntityName = "MobileDevice",
                EntityId = replacementDevice.DeviceId.ToString(),
                Details = $"Device Replacement: Device #{replacementDevice.IdentificationNumber} ({replacementDevice.MobileCode}, {newModelLabel}) assigned to {empName} ({empId}).",
                TimestampUtc = nowUtc
            });

            await _db.SaveChangesAsync();
            await transaction.CommitAsync();

            var counts = await GetLiveCountsAsync();
            return Ok(new ReturnReplacementOperationResponse(
                Message: $"Replacement device '{replacementDevice.MobileCode}' assigned to {empName}. Status is now Active / Assigned.",
                Transaction: MapTransaction(finalTx),
                Counts: counts
            ));
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            return StatusCode(500, new { message = $"Replacement assignment failed and was rolled back to keep inventory consistent: {ex.Message}" });
        }
    }

    [HttpPost("return-and-replace")]
    public async Task<ActionResult<ReturnReplacementOperationResponse>> ProcessReturnAndReplace([FromBody] ProcessReturnAndReplaceRequest request)
    {
        if (!await _permissionService.HasPermissionAsync(GetCurrentRole(), "manage_mobile_phones"))
        {
            return StatusCode(403, new { message = "You do not have permission to process device returns and replacements." });
        }

        if (string.IsNullOrWhiteSpace(request.EmployeeName))
        {
            return BadRequest(new { message = "Please select a valid employee." });
        }

        if (request.ReturnedDeviceId == request.ReplacementDeviceId)
        {
            return BadRequest(new { message = "Returned device and replacement device must be different devices." });
        }

        await using var transaction = await _db.Database.BeginTransactionAsync();
        try
        {
            var returnedDevice = await _db.MobileDevices
                .Include(d => d.Group)
                .FirstOrDefaultAsync(d => d.DeviceId == request.ReturnedDeviceId);

            if (returnedDevice == null || !returnedDevice.IsActive)
            {
                return NotFound(new { message = "Returned mobile device was not found or is inactive." });
            }

            if (string.IsNullOrWhiteSpace(returnedDevice.AssignedEmployeeName))
            {
                return BadRequest(new
                {
                    message = $"Device '{returnedDevice.MobileCode}' is already unassigned/Available and cannot be returned again."
                });
            }

            var currentHolder = returnedDevice.AssignedEmployeeName.Trim();
            if (!string.Equals(currentHolder, request.EmployeeName.Trim(), StringComparison.OrdinalIgnoreCase))
            {
                return BadRequest(new
                {
                    message = $"Device '{returnedDevice.MobileCode}' is currently assigned to '{currentHolder}', not '{request.EmployeeName.Trim()}'."
                });
            }

            var replacementDevice = await _db.MobileDevices
                .Include(d => d.Group)
                .FirstOrDefaultAsync(d => d.DeviceId == request.ReplacementDeviceId);

            if (replacementDevice == null || !replacementDevice.IsActive)
            {
                return NotFound(new { message = "Selected replacement device was not found or is inactive." });
            }

            if (replacementDevice.CurrentStatus == "Missing")
            {
                return BadRequest(new
                {
                    message = $"Cannot assign '{replacementDevice.MobileCode}' because it is currently marked as Missing."
                });
            }

            if (!string.IsNullOrWhiteSpace(replacementDevice.AssignedEmployeeName))
            {
                return BadRequest(new
                {
                    message = $"Device '{replacementDevice.MobileCode}' is already assigned to '{replacementDevice.AssignedEmployeeName}'. Only Available devices can be assigned."
                });
            }

            var (adminId, adminName) = await GetCurrentAdminAsync();
            var nowUtc = _timeService.UtcNow;
            var empId = string.IsNullOrWhiteSpace(request.EmployeeId)
                ? GenerateEmployeeId(currentHolder, returnedDevice.DeviceId)
                : request.EmployeeId.Trim();
            var condition = string.IsNullOrWhiteSpace(request.DeviceCondition) ? "Good" : request.DeviceCondition.Trim();

            var retModelLabel = !string.IsNullOrWhiteSpace(returnedDevice.Model)
                ? $"{returnedDevice.Brand ?? ""} {returnedDevice.Model}".Trim()
                : (returnedDevice.MobileName ?? "Mobile Device");
            var repModelLabel = !string.IsNullOrWhiteSpace(replacementDevice.Model)
                ? $"{replacementDevice.Brand ?? ""} {replacementDevice.Model}".Trim()
                : (replacementDevice.MobileName ?? "Mobile Device");

            // Step 1: Receive Returned Device -> becomes Available
            returnedDevice.AssignedEmployeeName = null;
            returnedDevice.AssignedEmployeeId = null;
            returnedDevice.EmployeeId = null;
            returnedDevice.CurrentStatus = "Available";
            returnedDevice.UpdatedAtUtc = nowUtc;

            // Step 2: Assign Replacement Device -> becomes Active / Assigned
            replacementDevice.AssignedEmployeeName = currentHolder;
            replacementDevice.AssignedEmployeeId = empId;
            replacementDevice.CurrentStatus = "Assigned";
            replacementDevice.UpdatedAtUtc = nowUtc;

            var txRecord = new DeviceReturnReplacement
            {
                TransactionType = "ReturnAndReplacement",
                EmployeeId = empId,
                EmployeeName = currentHolder,
                GroupName = returnedDevice.Group?.GroupName ?? replacementDevice.Group?.GroupName ?? "General",
                PreviouslyAssignedDeviceId = returnedDevice.DeviceId,
                PreviouslyAssignedMobileCode = returnedDevice.MobileCode,
                PreviouslyAssignedDeviceModel = retModelLabel,
                ReturnedDeviceId = returnedDevice.DeviceId,
                ReturnedMobileCode = returnedDevice.MobileCode,
                ReturnedDeviceModel = retModelLabel,
                ReturnDateUtc = nowUtc,
                DeviceCondition = condition,
                ReturnProcessedByUserId = adminId,
                ReturnProcessedByName = adminName,
                ReplacementDeviceId = replacementDevice.DeviceId,
                ReplacementMobileCode = replacementDevice.MobileCode,
                ReplacementDeviceModel = repModelLabel,
                NewAssignmentDateUtc = nowUtc,
                ReplacementAssignedByUserId = adminId,
                ReplacementAssignedByName = adminName,
                Remarks = request.Remarks?.Trim(),
                CreatedAtUtc = nowUtc
            };

            _db.DeviceReturnReplacements.Add(txRecord);

            _db.AuditLogs.Add(new AuditLog
            {
                UserId = adminId,
                UserName = adminName,
                UserRole = GetCurrentRole(),
                Action = "ReturnAndReplacement",
                EntityName = "MobileDevice",
                EntityId = returnedDevice.DeviceId.ToString(),
                Details = $"Return & Replace: Device #{returnedDevice.IdentificationNumber} ({returnedDevice.MobileCode}) returned by {currentHolder} ({empId}) and replaced with #{replacementDevice.IdentificationNumber} ({replacementDevice.MobileCode}).",
                TimestampUtc = nowUtc
            });

            _db.Notifications.Add(new Notification
            {
                DeviceId = replacementDevice.DeviceId,
                NotificationType = "ReturnAndReplacement",
                Message = $"Return & Replacement Completed for {currentHolder} ({empId}): Returned {returnedDevice.MobileCode} ({condition}, now Available) and assigned {replacementDevice.MobileCode} (now Active / Assigned) by {adminName}.",
                Priority = "Low",
                IsRead = false,
                CreatedAtUtc = nowUtc
            });

            await _db.SaveChangesAsync();
            await transaction.CommitAsync();

            var counts = await GetLiveCountsAsync();
            return Ok(new ReturnReplacementOperationResponse(
                Message: $"Returned '{returnedDevice.MobileCode}' (now Available) and assigned replacement '{replacementDevice.MobileCode}' (now Active / Assigned) to {currentHolder}.",
                Transaction: MapTransaction(txRecord),
                Counts: counts
            ));
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            return StatusCode(500, new { message = $"Return & Replacement failed and was completely rolled back: {ex.Message}" });
        }
    }
}
