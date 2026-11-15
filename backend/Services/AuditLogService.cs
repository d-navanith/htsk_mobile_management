using backend.Data;
using backend.Models;

namespace backend.Services;

public interface IAuditLogService
{
    Task LogAsync(int? userId, string userName, string userRole, string action, string entityName, string? entityId, string? details, string? ipAddress = null);
}

public class AuditLogService : IAuditLogService
{
    private readonly AppDbContext _db;

    public AuditLogService(AppDbContext db)
    {
        _db = db;
    }

    public async Task LogAsync(
        int? userId,
        string userName,
        string userRole,
        string action,
        string entityName,
        string? entityId,
        string? details,
        string? ipAddress = null)
    {
        try
        {
            var log = new AuditLog
            {
                UserId = userId,
                UserName = string.IsNullOrWhiteSpace(userName) ? "System" : userName,
                UserRole = string.IsNullOrWhiteSpace(userRole) ? "System" : userRole,
                Action = action,
                EntityName = entityName,
                EntityId = entityId,
                Details = details,
                IpAddress = ipAddress ?? "127.0.0.1",
                TimestampUtc = DateTime.UtcNow
            };

            _db.AuditLogs.Add(log);
            await _db.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            // Do not break user transaction if audit log fails
            Console.WriteLine($"[AuditLogService Error]: {ex.Message}");
        }
    }
}
