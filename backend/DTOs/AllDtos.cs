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
    string? LastCheckedByAdmin = null
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
    string? GroupName = null
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
    string? GroupName = null
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
    string? LastSessionSummary = null
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
    bool IsEscalated
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
    int UnreadNotificationsCount = 0
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


