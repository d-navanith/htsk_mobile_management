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
    public string MobileCode { get; set; } = string.Empty; // Unique generated ID (e.g. MOB-0001)
    public int GroupId { get; set; }
    public string? MobileName { get; set; }
    public string? Brand { get; set; }
    public string? Model { get; set; }
    public string? IMEI { get; set; }
    public string? PhoneNumber { get; set; }
    public string? SerialNumber { get; set; }
    public string? Description { get; set; }
    public string CurrentStatus { get; set; } = "NotChecked"; // Available, Missing, NotChecked
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;

    public Group? Group { get; set; }
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
