using Microsoft.EntityFrameworkCore;
using backend.Models;

namespace backend.Data;

public static class DbInitializer
{
    public static async Task InitializeAsync(AppDbContext db)
    {
        await db.Database.EnsureCreatedAsync();

        // 1. Roles
        if (!await db.Roles.AnyAsync())
        {
            db.Roles.AddRange(
                new Role { RoleName = "Developer" },
                new Role { RoleName = "ITAdmin" },
                new Role { RoleName = "Employee" }
            );
            await db.SaveChangesAsync();
        }

        // 2. System Settings
        if (!await db.SystemSettings.AnyAsync())
        {
            db.SystemSettings.AddRange(
                new SystemSetting
                {
                    SettingKey = "CheckingIntervalMinutes",
                    SettingValue = "120",
                    Description = "Interval between mandatory mobile device checking sessions in minutes",
                    UpdatedAtUtc = DateTime.UtcNow
                },
                new SystemSetting
                {
                    SettingKey = "TimeZone",
                    SettingValue = "Asia/Colombo",
                    Description = "System operational timezone identifier (Sri Lanka Standard Time, UTC+05:30)",
                    UpdatedAtUtc = DateTime.UtcNow
                },
                new SystemSetting
                {
                    SettingKey = "ConsecutiveMissingThreshold",
                    SettingValue = "2",
                    Description = "Number of consecutive missing checks required to escalate an incident to high priority",
                    UpdatedAtUtc = DateTime.UtcNow
                }
            );
            await db.SaveChangesAsync();
        }

        // 3. Default Users
        if (!await db.Users.AnyAsync())
        {
            var devRole = await db.Roles.FirstAsync(r => r.RoleName == "Developer");
            var itAdminRole = await db.Roles.FirstAsync(r => r.RoleName == "ITAdmin");
            var employeeRole = await db.Roles.FirstAsync(r => r.RoleName == "Employee");

            db.Users.AddRange(
                new User
                {
                    RoleId = devRole.RoleId,
                    FullName = "Lead System Developer",
                    Username = "developer",
                    Email = "developer@company.com",
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("Developer@123"),
                    IsActive = true,
                    CreatedAtUtc = DateTime.UtcNow
                },
                new User
                {
                    RoleId = itAdminRole.RoleId,
                    FullName = "Chief IT Administrator",
                    Username = "itadmin",
                    Email = "itadmin@company.com",
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("Admin@123"),
                    IsActive = true,
                    CreatedAtUtc = DateTime.UtcNow
                },
                new User
                {
                    RoleId = employeeRole.RoleId,
                    FullName = "Staff Member",
                    Username = "employee",
                    Email = "employee@company.com",
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("Employee@123"),
                    IsActive = true,
                    CreatedAtUtc = DateTime.UtcNow
                }
            );
            await db.SaveChangesAsync();
        }
    }
}
