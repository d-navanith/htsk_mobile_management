namespace backend.DTOs;

// --- Auth DTOs ---
public record LoginRequest(string Username, string Password, string? ExpectedRole = null);

public record LoginResponse(
    string Token,
    int UserId,
    string Username,
    string FullName,
    string Role,
    string Email
);

public record UserDto(
    int UserId,
    string Username,
    string FullName,
    string Email,
    string Role,
    int RoleId,
    bool IsActive,
    string CreatedAtColombo
);

public record CreateUserRequest(
    string FullName,
    string Username,
    string Email,
    string Password,
    int RoleId
);

public record UpdateUserRequest(
    string FullName,
    string Email,
    int RoleId,
    bool IsActive,
    string? NewPassword
);

// --- Group DTOs ---
public record GroupDto(
    int GroupId,
    string GroupName,
    string? Description,
    bool IsActive,
    int TotalDevices,
    int AvailableDevices,
    int MissingDevices,
    string CreatedAtColombo,
    string UpdatedAtColombo
);

public record CreateGroupRequest(string GroupName, string? Description);
public record UpdateGroupRequest(string GroupName, string? Description, bool IsActive);

// --- Device DTOs ---
public record DeviceDto(
    int DeviceId,
    string MobileCode,
    int GroupId,
    string GroupName,
    string? MobileName,
    string? Brand,
    string? Model,
    string? IMEI,
    string? PhoneNumber,
    string? SerialNumber,
    string? Description,
    string CurrentStatus,
    bool IsActive,
    int ConsecutiveMissingCount,
    string CreatedAtColombo,
    string UpdatedAtColombo,
    string? LastCheckedAtColombo,
    string? LastCheckedByAdmin = null,
    int IdentificationNumber = 0,
    string? BankAccountName = null,
    string? AssignedEmployeeName = null
);

public record CreateDeviceRequest(
    int GroupId,
    string? MobileCode,
    string? MobileName,
    string? Brand,
    string? Model,
    string? IMEI,
    string? PhoneNumber,
    string? SerialNumber,
    string? Description,
    string? GroupName = null,
    string? BankAccountName = null,
    string? AssignedEmployeeName = null
);

public record UpdateDeviceRequest(
    int GroupId,
    string? MobileName,
    string? Brand,
    string? Model,
    string? IMEI,
    string? PhoneNumber,
    string? SerialNumber,
    string? Description,
    bool IsActive,
    string? MobileCode = null,
    string? GroupName = null,
    string? CurrentStatus = null,
    string? BankAccountName = null,
    string? AssignedEmployeeName = null
);

public record AssignEmployeeRequest(
    string EmployeeName,
    string? Department = null,
    string? Notes = null
);

// --- Session & Checking DTOs ---
public record StartSessionRequest(string? Notes);

public record RecordCheckRequest(
    int DeviceId,
    string DeviceStatus, // "Available" or "Missing"
    string? Notes
);

public record BatchCheckRequest(
    List<RecordCheckRequest> Checks
);

public record DeviceSessionCheckDto(
    int DeviceId,
    string MobileCode,
    string? MobileName,
    string? Brand,
    string? Model,
    int GroupId,
    string GroupName,
    string CurrentDeviceStatus,
    bool IsCheckedInSession,
    int? CheckRecordId,
    string? CheckedStatus, // "Available" or "Missing"
    string? CheckedAtColombo,
    string? CheckedByAdmin,
    string? CheckNotes,
    string? Description = null,
    bool PreviouslyMissing = false,
    string? LastSessionSummary = null,
    string? PhoneNumber = null,
    string? IMEI = null,
    string? SerialNumber = null,
    string? BankAccountName = null,
    string? AssignedEmployeeName = null
);

public record SessionDetailsDto(
    int SessionId,
    string StartedByAdmin,
    string StartedAtColombo,
    string? CompletedAtColombo,
    string SessionStatus,
    int TotalExpectedDevices,
    int CheckedCount,
    int AvailableCount,
    int MissingCount,
    int UncheckedCount,
    string? Notes,
    List<DeviceSessionCheckDto> Devices
);

public record SessionSummaryDto(
    int SessionId,
    string StartedByAdmin,
    string StartedAtColombo,
    string? CompletedAtColombo,
    string SessionStatus,
    int TotalDevices,
    int CheckedCount,
    int AvailableCount,
    int MissingCount,
    string? Notes
);

public record CompleteSessionRequest(string? Notes);

// --- Incident DTOs ---
public record MissingIncidentDto(
    int IncidentId,
    int DeviceId,
    string MobileCode,
    string? MobileName,
    string GroupName,
    int ConsecutiveMissingCount,
    string IncidentStatus,
    string FirstMissingAtColombo,
    string? RecoveredAtColombo,
    string? ActionTaken,
    string? Notes,
    bool IsEscalated,
    string? Brand = null,
    string? Model = null,
    string? IMEI = null,
    string? SerialNumber = null,
    string? AssignedTo = null,
    string? LastKnownLocation = null,
    string? PreviousAssignmentDetails = null,
    string? LastVerifiedAtColombo = null,
    string? BankAccountName = null,
    string? AssignedEmployeeName = null
);

public record UpdateIncidentActionRequest(
    string? ActionTaken,
    string? Notes,
    string? Status
);

// --- Notification DTOs ---
public record NotificationDto(
    int NotificationId,
    int? DeviceId,
    string? MobileCode,
    int? IncidentId,
    string NotificationType,
    string Message,
    string Priority,
    bool IsRead,
    string CreatedAtColombo
);

// --- Dashboard DTOs ---
public record GroupSessionProgressDto(
    int GroupId,
    string GroupName,
    int CheckedCount,
    int TotalDevices,
    string Status // "Completed", "In progress", "Pending"
);

public record RecentActivityDto(
    string Id,
    string Title,
    string Subtitle,
    string TimeColombo,
    string Type // "available", "missing", "session"
);

public record DashboardDto(
    int TotalDevices,
    int AvailableDevices,
    int MissingDevices,
    int NotCheckedDevices,
    int TotalGroups,
    int TotalSessions,
    SessionSummaryDto? LatestSession,
    int UncheckedInCurrentSession,
    int RepeatedMissingAlertCount,
    List<MissingIncidentDto> HighPriorityAlerts,
    string CurrentColomboTime,
    string? NextSessionDueColomboTime,
    int CheckingIntervalMinutes,
    bool IsSessionOverdue,
    int MinutesUntilNextDue,
    List<GroupSessionProgressDto>? GroupProgress = null,
    List<RecentActivityDto>? RecentActivities = null,
    int ActiveIncidentsCount = 0,
    int UnreadNotificationsCount = 0,
    int AssignedDevices = 0,
    int AvailableUnassignedDevices = 0
);

// --- History DTO ---
public record CheckHistoryItemDto(
    int CheckRecordId,
    int SessionId,
    string MobileCode,
    string? MobileName,
    string GroupName,
    string DeviceStatus,
    string CheckedAtColombo,
    string CheckedByAdmin,
    string? Notes
);

// --- Reports DTO ---
public record DailyReportDto(
    string DateColombo,
    int SessionsRun,
    int TotalChecksRecorded,
    int AvailableCount,
    int MissingCount,
    int UniqueMissingDevices,
    int RecoveredCount
);

public record GroupAvailabilityReportDto(
    int GroupId,
    string GroupName,
    int TotalDevices,
    int AvailableDevices,
    int MissingDevices,
    double AvailabilityPercentage
);

public record AdminActivityReportDto(
    int UserId,
    string FullName,
    string Username,
    int SessionsStarted,
    int ChecksPerformed,
    string? LastActiveColombo
);

public record DateSessionItemDto(
    int SessionId,
    string SessionCode,
    string StartedAtColombo,
    string? CompletedAtColombo,
    string StartedByAdmin,
    string SessionStatus,
    int TotalDevices,
    int CheckedCount,
    int AvailableCount,
    int MissingCount,
    int UncheckedCount,
    string? Notes
);

public record DateMissingItemDto(
    int Id,
    int SessionId,
    string SessionCode,
    string MobileCode,
    string? MobileName,
    string GroupName,
    string CheckedAtColombo,
    string CheckedByAdmin,
    int ConsecutiveMissingCount,
    string IncidentStatus,
    string? Notes
);

public record CalendarDaySummaryDto(
    string DateColombo,
    int SessionsCount,
    int MissingCount
);

public record DateFilteredReportDto(
    string SelectedDateColombo,
    DailyReportDto Summary,
    List<DateSessionItemDto> Sessions,
    List<DateMissingItemDto> MissingItems,
    List<CheckHistoryItemDto> CheckTimes,
    List<CalendarDaySummaryDto> MonthActivity
);

// --- Role Permissions DTOs ---
public record PermissionRowDto(
    string FunctionKey,
    string FunctionName,
    string Description,
    bool Developer,
    bool ITAdmin,
    bool Employee,
    string UpdatedAtColombo,
    bool EmployeeCanEdit = false,
    List<string>? EmployeeCanDo = null,
    List<string>? EmployeeCannotDo = null
);

public record TogglePermissionRequest(
    string FunctionKey,
    string Role, // "Developer", "ITAdmin", or "Employee"
    bool IsEnabled,
    bool? EmployeeCanEdit = null,
    List<string>? EmployeeCanDo = null,
    List<string>? EmployeeCannotDo = null
);

public record CreatePermissionRequest(
    string FunctionKey,
    string FunctionName,
    string? Description,
    bool Developer = true,
    bool ITAdmin = true,
    bool Employee = false,
    bool EmployeeCanEdit = false,
    List<string>? EmployeeCanDo = null,
    List<string>? EmployeeCannotDo = null
);

public record UpdatePermissionRequest(
    string FunctionName,
    string? Description,
    bool Developer,
    bool ITAdmin,
    bool Employee,
    bool? EmployeeCanEdit = null,
    List<string>? EmployeeCanDo = null,
    List<string>? EmployeeCannotDo = null
);

public record UpdateSessionRequest(
    string? SessionStatus,
    string? Notes
);

public record CreateIncidentRequest(
    int DeviceId,
    string? IncidentStatus,
    int ConsecutiveMissingCount = 1,
    string? ActionTaken = null,
    string? Notes = null
);

public record CreateNotificationRequest(
    string Message,
    string? NotificationType = "SystemAlert",
    string? Priority = "High",
    int? DeviceId = null
);

public record UpdateNotificationRequest(
    string Message,
    string? Priority,
    bool IsRead
);

public record UpdateHistoryRecordRequest(
    string DeviceStatus,
    string? Notes
);

public record CreateSettingRequest(
    string SettingKey,
    string SettingValue,
    string? Description
);

// --- Device Return & Replacement DTOs ---
public record EmployeeAssignedDeviceDto(
    int DeviceId,
    string MobileCode,
    string? MobileName,
    string? Brand,
    string? Model,
    string? IMEI,
    string? SerialNumber,
    int GroupId,
    string GroupName,
    string? Location,
    string CurrentStatus,
    string AssignedAtColombo
);

public record EmployeeReturnOptionDto(
    string EmployeeId,
    string EmployeeName,
    string GroupName,
    List<EmployeeAssignedDeviceDto> AssignedDevices,
    int? PendingReturnTransactionId = null,
    string? LastReturnedMobileCode = null,
    string? LastReturnedDeviceModel = null,
    string? LastReturnDateColombo = null
);

public record ProcessDeviceReturnRequest(
    string EmployeeId,
    string EmployeeName,
    int DeviceId,
    string DeviceCondition,
    string? Remarks
);

public record ProcessDeviceReplacementRequest(
    string EmployeeId,
    string EmployeeName,
    int ReplacementDeviceId,
    int? ReturnTransactionId = null,
    int? PreviouslyAssignedDeviceId = null,
    string? GroupName = null,
    string? Remarks = null
);

public record ProcessReturnAndReplaceRequest(
    string EmployeeId,
    string EmployeeName,
    int ReturnedDeviceId,
    string DeviceCondition,
    int ReplacementDeviceId,
    string? Remarks = null
);

public record DeviceReturnReplacementDto(
    int TransactionId,
    string TransactionType,
    string EmployeeId,
    string EmployeeName,
    string? GroupName,
    int? PreviouslyAssignedDeviceId,
    string? PreviouslyAssignedMobileCode,
    string? PreviouslyAssignedDeviceModel,
    int? ReturnedDeviceId,
    string? ReturnedMobileCode,
    string? ReturnedDeviceModel,
    string? ReturnDateColombo,
    string? DeviceCondition,
    string? ReturnProcessedByName,
    int? ReplacementDeviceId,
    string? ReplacementMobileCode,
    string? ReplacementDeviceModel,
    string? NewAssignmentDateColombo,
    string? ReplacementAssignedByName,
    string? Remarks,
    string CreatedAtColombo
);

public record ReturnReplacementCountsDto(
    int TotalDevices,
    int AssignedDevices,
    int AvailableDevices,
    int MissingDevices
);

public record ReturnReplacementOperationResponse(
    string Message,
    DeviceReturnReplacementDto Transaction,
    ReturnReplacementCountsDto Counts
);

// --- Shift Handover & Employee Accountability DTOs ---
public record DeviceShiftHandoverRequest(
    string OutgoingEmployeeName,
    string IncomingEmployeeName,
    string? IncomingGroup = "Group D",
    string? OutgoingShift = "Morning Shift",
    string? IncomingShift = "Night Shift",
    string? HandoverTime = null,
    string? Condition = "Working",
    string? IssuesRemarks = "None",
    string? Accessories = null,
    string? HandoverNotes = null,
    bool OutgoingConfirmed = true,
    bool IncomingConfirmed = true,
    bool AdminConfirmed = false,
    string? AdminApprover = null
);

public record DeviceLateHandoverRequest(
    string ActualReceiver,
    string? ActualTime,
    string Reason,
    string EnteredBy,
    string ApprovedBy,
    string? Notes = null
);



