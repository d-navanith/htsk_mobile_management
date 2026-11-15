namespace backend.Models;

public class Role
{
    public int RoleId { get; set; }
    public string RoleName { get; set; } = string.Empty; // Developer, ITAdmin, Employee
    
    public ICollection<User> Users { get; set; } = new List<User>();
}

public class User
{
    public int UserId { get; set; }
    public int RoleId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    public Role? Role { get; set; }
    public ICollection<CheckSession> StartedSessions { get; set; } = new List<CheckSession>();
    public ICollection<DeviceCheckRecord> CheckRecords { get; set; } = new List<DeviceCheckRecord>();
}

public class Group
{
    public int GroupId { get; set; }
    public string GroupName { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;

    public ICollection<MobileDevice> Devices { get; set; } = new List<MobileDevice>();
    public ICollection<DeviceCheckRecord> CheckRecords { get; set; } = new List<DeviceCheckRecord>();
}

public class MobileDevice
{
    public int DeviceId { get; set; }
    public int IdentificationNumber { get; set; } // 1 to infinity sequential identification number (BCNF atomic key)
    public string MobileCode { get; set; } = string.Empty; // Unique generated ID (e.g. MOB-0001, Phone 2)
    public int GroupId { get; set; }
    public int? ModelId { get; set; } // BCNF Normalization: Foreign Key to DeviceModels
    public int? EmployeeId { get; set; } // BCNF Normalization: Foreign Key to Employees
    public string? MobileName { get; set; }
    public string? Brand { get; set; }
    public string? Model { get; set; }
    public string? IMEI { get; set; }
    public string? PhoneNumber { get; set; }
    public string? SerialNumber { get; set; }
    public string? Description { get; set; }
    public string CurrentStatus { get; set; } = "NotChecked"; // Available, Assigned, UnderMaintenance, UnderInvestigation, ConfirmedLost, Retired
    public string? AssignedEmployeeName { get; set; }
    public string? AssignedEmployeeId { get; set; }
    public string? Department { get; set; }
    public string? LastKnownLocation { get; set; }
    public DateTime? LastAssignmentDateUtc { get; set; }
    public DateTime? LastReturnDateUtc { get; set; }
    public DateTime? LastVerifiedDateUtc { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;

    public Group? Group { get; set; }
    public DeviceModel? DeviceModel { get; set; }
    public Employee? AssignedEmployee { get; set; }
    public ICollection<DeviceCheckRecord> CheckRecords { get; set; } = new List<DeviceCheckRecord>();
    public ICollection<MissingIncident> MissingIncidents { get; set; } = new List<MissingIncident>();
    public ICollection<Notification> Notifications { get; set; } = new List<Notification>();
}

public class CheckSession
{
    public int SessionId { get; set; }
    public int StartedByUserId { get; set; }
    public DateTime StartedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime? CompletedAtUtc { get; set; }
    public string SessionStatus { get; set; } = "InProgress"; // InProgress, Completed, Cancelled
    public int TotalDevices { get; set; }
    public string? Notes { get; set; }

    public User? StartedByUser { get; set; }
    public ICollection<DeviceCheckRecord> CheckRecords { get; set; } = new List<DeviceCheckRecord>();
}

public class DeviceCheckRecord
{
    public int CheckRecordId { get; set; }
    public int SessionId { get; set; }
    public int DeviceId { get; set; }
    public int GroupId { get; set; }
    public int CheckedByUserId { get; set; }
    public string DeviceStatus { get; set; } = "Available"; // Available, Missing
    public DateTime CheckedAtUtc { get; set; } = DateTime.UtcNow;
    public string? Notes { get; set; }

    public CheckSession? Session { get; set; }
    public MobileDevice? Device { get; set; }
    public Group? Group { get; set; }
    public User? CheckedByUser { get; set; }
}

public class MissingIncident
{
    public int IncidentId { get; set; }
    public int DeviceId { get; set; }
    public int? FirstMissingCheckId { get; set; }
    public int? LastMissingCheckId { get; set; }
    public int ConsecutiveMissingCount { get; set; } = 1;
    public string IncidentStatus { get; set; } = "Open"; // Open, Escalated, Recovered, Closed
    public DateTime FirstMissingAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime? RecoveredAtUtc { get; set; }
    public string? ActionTaken { get; set; }
    public string? Notes { get; set; }

    public MobileDevice? Device { get; set; }
    public DeviceCheckRecord? FirstMissingCheck { get; set; }
    public DeviceCheckRecord? LastMissingCheck { get; set; }
    public ICollection<Notification> Notifications { get; set; } = new List<Notification>();
}

public class Notification
{
    public int NotificationId { get; set; }
    public int? DeviceId { get; set; }
    public int? IncidentId { get; set; }
    public string NotificationType { get; set; } = string.Empty; // FirstMissing, ConsecutiveMissing, Recovered
    public string Message { get; set; } = string.Empty;
    public string Priority { get; set; } = "Medium"; // Low, Medium, High
    public bool IsRead { get; set; } = false;
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    public MobileDevice? Device { get; set; }
    public MissingIncident? Incident { get; set; }
}

public class SystemSetting
{
    public int SettingId { get; set; }
    public string SettingKey { get; set; } = string.Empty;
    public string SettingValue { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
}

public class DeviceReturnReplacement
{
    public int TransactionId { get; set; }
    public string TransactionType { get; set; } = "Return"; // "Return", "Replacement", "ReturnAndReplacement"
    public string EmployeeId { get; set; } = string.Empty;
    public string EmployeeName { get; set; } = string.Empty;
    public string? GroupName { get; set; }

    public int? PreviouslyAssignedDeviceId { get; set; }
    public string? PreviouslyAssignedMobileCode { get; set; }
    public string? PreviouslyAssignedDeviceModel { get; set; }

    public int? ReturnedDeviceId { get; set; }
    public string? ReturnedMobileCode { get; set; }
    public string? ReturnedDeviceModel { get; set; }
    public DateTime? ReturnDateUtc { get; set; }
    public string? DeviceCondition { get; set; }
    public int? ReturnProcessedByUserId { get; set; }
    public string? ReturnProcessedByName { get; set; }

    public int? ReplacementDeviceId { get; set; }
    public string? ReplacementMobileCode { get; set; }
    public string? ReplacementDeviceModel { get; set; }
    public DateTime? NewAssignmentDateUtc { get; set; }
    public int? ReplacementAssignedByUserId { get; set; }
    public string? ReplacementAssignedByName { get; set; }

    public string? Remarks { get; set; }
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}

public class ReconciliationSession
{
    public int ReconciliationId { get; set; }
    public string SessionCode { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public DateTime AuditDateUtc { get; set; } = DateTime.UtcNow;
    public string Scope { get; set; } = "Full Company Inventory";
    public string ChecklistAName { get; set; } = "Previous Audit Checklist";
    public string ChecklistBName { get; set; } = "Latest Audit Checklist";
    public int TotalRawA { get; set; }
    public int TotalUniqueA { get; set; }
    public int DuplicateCountA { get; set; }
    public int TotalRawB { get; set; }
    public int TotalUniqueB { get; set; }
    public int DuplicateCountB { get; set; }
    public int CommonCount { get; set; }
    public int AbsentCount { get; set; }
    public int NewCount { get; set; }
    public int ExplainedReturnCount { get; set; }
    public int ExplainedReplaceCount { get; set; }
    public int ExplainedTransferCount { get; set; }
    public int UnderInvestigationCount { get; set; }
    public int ConfirmedLostCount { get; set; }
    public int? CreatedByUserId { get; set; }
    public string? CreatedByName { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    public ICollection<ReconciliationItem> Items { get; set; } = new List<ReconciliationItem>();
}

public class ReconciliationItem
{
    public int ItemId { get; set; }
    public int ReconciliationId { get; set; }
    public string RawDeviceId { get; set; } = string.Empty;
    public string NormalizedDeviceId { get; set; } = string.Empty;
    public int? MatchedDeviceId { get; set; }
    public string? DeviceName { get; set; }
    public string? BrandModel { get; set; }
    public string? IMEI { get; set; }
    public string? SerialNumber { get; set; }
    public string? PreviousEmployee { get; set; }
    public string? CurrentEmployee { get; set; }
    public string? PreviousStatus { get; set; }
    public string? CurrentStatus { get; set; }
    public string? PreviousLocation { get; set; }
    public string? CurrentLocation { get; set; }
    public DateTime? LastReturnDateUtc { get; set; }
    public DateTime? LastAssignmentDateUtc { get; set; }
    public DateTime? LastVerifiedDateUtc { get; set; }
    public string ReconciliationResult { get; set; } = string.Empty;
    public string? InvestigationNotes { get; set; }
    public bool IsApproved { get; set; } = false;
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    public ReconciliationSession? Reconciliation { get; set; }
}

public class DeviceMovement
{
    public int MovementId { get; set; }
    public int DeviceId { get; set; }
    public string MovementType { get; set; } = "Assignment"; // Assignment, Return, Replacement, Maintenance, Investigation, Recovery, AuditVerification
    public string? FromStatus { get; set; }
    public string? ToStatus { get; set; }
    public string? FromEmployee { get; set; }
    public string? ToEmployee { get; set; }
    public string? FromLocation { get; set; }
    public string? ToLocation { get; set; }
    public string? Reason { get; set; }
    public DateTime MovementDateUtc { get; set; } = DateTime.UtcNow;
    public int? PerformedByUserId { get; set; }
    public string? PerformedByName { get; set; }
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    public MobileDevice? Device { get; set; }
}

public class Employee
{
    public int EmployeeId { get; set; }
    public string EmployeeCode { get; set; } = string.Empty; // Unique code e.g. EMP-001
    public string FullName { get; set; } = string.Empty;
    public string? Department { get; set; }
    public string? Email { get; set; }
    public string? PhoneNumber { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;

    public ICollection<MobileDevice> AssignedDevices { get; set; } = new List<MobileDevice>();
}

public class DeviceModel
{
    public int ModelId { get; set; }
    public string Brand { get; set; } = string.Empty;
    public string ModelName { get; set; } = string.Empty;
    public string DeviceType { get; set; } = "SmartPhone";
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    public ICollection<MobileDevice> Devices { get; set; } = new List<MobileDevice>();
}

public class AuditLog
{
    public int LogId { get; set; }
    public int? UserId { get; set; }
    public string UserName { get; set; } = string.Empty;
    public string UserRole { get; set; } = string.Empty; // Developer, ITAdmin, Employee
    public string Action { get; set; } = string.Empty; // e.g. "CreateDevice", "UpdateDevice", "DeviceReturn", "DeviceReplacement", "PhysicalCheck", "ResolutionUpdate"
    public string EntityName { get; set; } = string.Empty; // "MobileDevice", "CheckSession", "DeviceReturnReplacement", "User"
    public string? EntityId { get; set; }
    public string? Details { get; set; }
    public string? IpAddress { get; set; }
    public DateTime TimestampUtc { get; set; } = DateTime.UtcNow;

    public User? User { get; set; }
}
