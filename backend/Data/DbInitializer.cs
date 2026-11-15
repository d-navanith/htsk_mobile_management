using Microsoft.EntityFrameworkCore;
using backend.Models;

namespace backend.Data;

public static class DbInitializer
{
    public static async Task InitializeAsync(AppDbContext db)
    {
        await db.Database.EnsureCreatedAsync();

        // Ensure DeviceReturnReplacements, ReconciliationSessions, ReconciliationItems, DeviceMovements tables and columns exist
        await db.Database.ExecuteSqlRawAsync(@"
            IF OBJECT_ID('dbo.DeviceReturnReplacements', 'U') IS NULL
            BEGIN
                CREATE TABLE [dbo].[DeviceReturnReplacements] (
                    [TransactionId] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
                    [TransactionType] NVARCHAR(40) NOT NULL,
                    [EmployeeId] NVARCHAR(50) NOT NULL,
                    [EmployeeName] NVARCHAR(150) NOT NULL,
                    [GroupName] NVARCHAR(100) NULL,
                    [PreviouslyAssignedDeviceId] INT NULL,
                    [PreviouslyAssignedMobileCode] NVARCHAR(50) NULL,
                    [PreviouslyAssignedDeviceModel] NVARCHAR(150) NULL,
                    [ReturnedDeviceId] INT NULL,
                    [ReturnedMobileCode] NVARCHAR(50) NULL,
                    [ReturnedDeviceModel] NVARCHAR(150) NULL,
                    [ReturnDateUtc] DATETIME2 NULL,
                    [DeviceCondition] NVARCHAR(100) NULL,
                    [ReturnProcessedByUserId] INT NULL,
                    [ReturnProcessedByName] NVARCHAR(150) NULL,
                    [ReplacementDeviceId] INT NULL,
                    [ReplacementMobileCode] NVARCHAR(50) NULL,
                    [ReplacementDeviceModel] NVARCHAR(150) NULL,
                    [NewAssignmentDateUtc] DATETIME2 NULL,
                    [ReplacementAssignedByUserId] INT NULL,
                    [ReplacementAssignedByName] NVARCHAR(150) NULL,
                    [Remarks] NVARCHAR(1000) NULL,
                    [CreatedAtUtc] DATETIME2 NOT NULL
                );
            END

            IF OBJECT_ID('dbo.ReconciliationSessions', 'U') IS NULL
            BEGIN
                CREATE TABLE [dbo].[ReconciliationSessions] (
                    [ReconciliationId] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
                    [SessionCode] NVARCHAR(50) NOT NULL UNIQUE,
                    [Title] NVARCHAR(150) NOT NULL,
                    [AuditDateUtc] DATETIME2 NOT NULL,
                    [Scope] NVARCHAR(100) NULL,
                    [ChecklistAName] NVARCHAR(150) NULL,
                    [ChecklistBName] NVARCHAR(150) NULL,
                    [TotalRawA] INT NOT NULL DEFAULT 0,
                    [TotalUniqueA] INT NOT NULL DEFAULT 0,
                    [DuplicateCountA] INT NOT NULL DEFAULT 0,
                    [TotalRawB] INT NOT NULL DEFAULT 0,
                    [TotalUniqueB] INT NOT NULL DEFAULT 0,
                    [DuplicateCountB] INT NOT NULL DEFAULT 0,
                    [CommonCount] INT NOT NULL DEFAULT 0,
                    [AbsentCount] INT NOT NULL DEFAULT 0,
                    [NewCount] INT NOT NULL DEFAULT 0,
                    [ExplainedReturnCount] INT NOT NULL DEFAULT 0,
                    [ExplainedReplaceCount] INT NOT NULL DEFAULT 0,
                    [ExplainedTransferCount] INT NOT NULL DEFAULT 0,
                    [UnderInvestigationCount] INT NOT NULL DEFAULT 0,
                    [ConfirmedLostCount] INT NOT NULL DEFAULT 0,
                    [CreatedByUserId] INT NULL,
                    [CreatedByName] NVARCHAR(150) NULL,
                    [Notes] NVARCHAR(1000) NULL,
                    [CreatedAtUtc] DATETIME2 NOT NULL
                );
            END

            IF OBJECT_ID('dbo.ReconciliationItems', 'U') IS NULL
            BEGIN
                CREATE TABLE [dbo].[ReconciliationItems] (
                    [ItemId] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
                    [ReconciliationId] INT NOT NULL,
                    [RawDeviceId] NVARCHAR(100) NOT NULL,
                    [NormalizedDeviceId] NVARCHAR(100) NOT NULL,
                    [MatchedDeviceId] INT NULL,
                    [DeviceName] NVARCHAR(150) NULL,
                    [BrandModel] NVARCHAR(150) NULL,
                    [IMEI] NVARCHAR(100) NULL,
                    [SerialNumber] NVARCHAR(100) NULL,
                    [PreviousEmployee] NVARCHAR(150) NULL,
                    [CurrentEmployee] NVARCHAR(150) NULL,
                    [PreviousStatus] NVARCHAR(50) NULL,
                    [CurrentStatus] NVARCHAR(50) NULL,
                    [PreviousLocation] NVARCHAR(150) NULL,
                    [CurrentLocation] NVARCHAR(150) NULL,
                    [LastReturnDateUtc] DATETIME2 NULL,
                    [LastAssignmentDateUtc] DATETIME2 NULL,
                    [LastVerifiedDateUtc] DATETIME2 NULL,
                    [ReconciliationResult] NVARCHAR(60) NOT NULL,
                    [InvestigationNotes] NVARCHAR(1000) NULL,
                    [IsApproved] BIT NOT NULL DEFAULT 0,
                    [CreatedAtUtc] DATETIME2 NOT NULL,
                    CONSTRAINT FK_ReconciliationItems_Session FOREIGN KEY ([ReconciliationId]) REFERENCES [dbo].[ReconciliationSessions]([ReconciliationId]) ON DELETE CASCADE
                );
            END

            IF OBJECT_ID('dbo.DeviceMovements', 'U') IS NULL
            BEGIN
                CREATE TABLE [dbo].[DeviceMovements] (
                    [MovementId] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
                    [DeviceId] INT NOT NULL,
                    [MovementType] NVARCHAR(50) NOT NULL,
                    [FromStatus] NVARCHAR(50) NULL,
                    [ToStatus] NVARCHAR(50) NULL,
                    [FromEmployee] NVARCHAR(150) NULL,
                    [ToEmployee] NVARCHAR(150) NULL,
                    [FromLocation] NVARCHAR(150) NULL,
                    [ToLocation] NVARCHAR(150) NULL,
                    [Reason] NVARCHAR(500) NULL,
                    [MovementDateUtc] DATETIME2 NOT NULL,
                    [PerformedByUserId] INT NULL,
                    [PerformedByName] NVARCHAR(150) NULL,
                    [CreatedAtUtc] DATETIME2 NOT NULL,
                    CONSTRAINT FK_DeviceMovements_Device FOREIGN KEY ([DeviceId]) REFERENCES [dbo].[MobileDevices]([DeviceId]) ON DELETE CASCADE
                );
            END

            IF COL_LENGTH('dbo.MobileDevices', 'PhoneNumber') < 300
            BEGIN
                ALTER TABLE [dbo].[MobileDevices] ALTER COLUMN [PhoneNumber] NVARCHAR(150) NULL;
            END

            IF COL_LENGTH('dbo.MobileDevices', 'CurrentStatus') < 100
            BEGIN
                ALTER TABLE [dbo].[MobileDevices] ALTER COLUMN [CurrentStatus] NVARCHAR(50) NOT NULL;
            END

            IF COL_LENGTH('dbo.MobileDevices', 'AssignedEmployeeName') IS NULL
            BEGIN
                ALTER TABLE [dbo].[MobileDevices] ADD [AssignedEmployeeName] NVARCHAR(150) NULL;
            END

            IF COL_LENGTH('dbo.MobileDevices', 'AssignedEmployeeId') IS NULL
            BEGIN
                ALTER TABLE [dbo].[MobileDevices] ADD [AssignedEmployeeId] NVARCHAR(50) NULL;
            END

            IF COL_LENGTH('dbo.MobileDevices', 'Department') IS NULL
            BEGIN
                ALTER TABLE [dbo].[MobileDevices] ADD [Department] NVARCHAR(100) NULL;
            END

            IF COL_LENGTH('dbo.MobileDevices', 'LastKnownLocation') IS NULL
            BEGIN
                ALTER TABLE [dbo].[MobileDevices] ADD [LastKnownLocation] NVARCHAR(150) NULL;
            END

            IF COL_LENGTH('dbo.MobileDevices', 'LastAssignmentDateUtc') IS NULL
            BEGIN
                ALTER TABLE [dbo].[MobileDevices] ADD [LastAssignmentDateUtc] DATETIME2 NULL;
            END

            IF COL_LENGTH('dbo.MobileDevices', 'LastReturnDateUtc') IS NULL
            BEGIN
                ALTER TABLE [dbo].[MobileDevices] ADD [LastReturnDateUtc] DATETIME2 NULL;
            END

            IF COL_LENGTH('dbo.MobileDevices', 'LastVerifiedDateUtc') IS NULL
            BEGIN
                ALTER TABLE [dbo].[MobileDevices] ADD [LastVerifiedDateUtc] DATETIME2 NULL;
            END

            -- BCNF & 3NF Normalization: Employees Table
            IF OBJECT_ID('dbo.Employees', 'U') IS NULL
            BEGIN
                CREATE TABLE [dbo].[Employees] (
                    [EmployeeId] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
                    [EmployeeCode] NVARCHAR(50) NOT NULL UNIQUE,
                    [FullName] NVARCHAR(150) NOT NULL,
                    [Department] NVARCHAR(100) NULL,
                    [Email] NVARCHAR(150) NULL,
                    [PhoneNumber] NVARCHAR(50) NULL,
                    [IsActive] BIT NOT NULL DEFAULT 1,
                    [CreatedAtUtc] DATETIME2 NOT NULL,
                    [UpdatedAtUtc] DATETIME2 NOT NULL
                );
            END

            -- BCNF & 3NF Normalization: DeviceModels Table
            IF OBJECT_ID('dbo.DeviceModels', 'U') IS NULL
            BEGIN
                CREATE TABLE [dbo].[DeviceModels] (
                    [ModelId] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
                    [Brand] NVARCHAR(100) NOT NULL,
                    [ModelName] NVARCHAR(100) NOT NULL,
                    [DeviceType] NVARCHAR(50) NOT NULL DEFAULT 'SmartPhone',
                    [CreatedAtUtc] DATETIME2 NOT NULL
                );
            END

            -- Developer System Audit Logs Table
            IF OBJECT_ID('dbo.AuditLogs', 'U') IS NULL
            BEGIN
                CREATE TABLE [dbo].[AuditLogs] (
                    [LogId] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
                    [UserId] INT NULL,
                    [UserName] NVARCHAR(150) NOT NULL,
                    [UserRole] NVARCHAR(50) NOT NULL,
                    [Action] NVARCHAR(100) NOT NULL,
                    [EntityName] NVARCHAR(100) NOT NULL,
                    [EntityId] NVARCHAR(100) NULL,
                    [Details] NVARCHAR(4000) NULL,
                    [IpAddress] NVARCHAR(50) NULL,
                    [TimestampUtc] DATETIME2 NOT NULL,
                    CONSTRAINT FK_AuditLogs_User FOREIGN KEY ([UserId]) REFERENCES [dbo].[Users]([UserId]) ON DELETE SET NULL
                );
            END

            -- BCNF Foreign Keys and 1-to-Infinity Auto-Increment Identification Numbering
            IF COL_LENGTH('dbo.MobileDevices', 'IdentificationNumber') IS NULL
            BEGIN
                ALTER TABLE [dbo].[MobileDevices] ADD [IdentificationNumber] INT NULL;
            END

            IF COL_LENGTH('dbo.MobileDevices', 'ModelId') IS NULL
            BEGIN
                ALTER TABLE [dbo].[MobileDevices] ADD [ModelId] INT NULL;
            END

            IF COL_LENGTH('dbo.MobileDevices', 'EmployeeId') IS NULL
            BEGIN
                ALTER TABLE [dbo].[MobileDevices] ADD [EmployeeId] INT NULL;
            END

            IF COL_LENGTH('dbo.MobileDevices', 'BankAccountName') IS NULL
            BEGIN
                ALTER TABLE [dbo].[MobileDevices] ADD [BankAccountName] NVARCHAR(200) NULL;
            END
        ");

        // Execute post-schema updates in dynamic SQL batches to avoid compilation errors on newly added columns
        await db.Database.ExecuteSqlRawAsync(@"
            IF COL_LENGTH('dbo.MobileDevices', 'IdentificationNumber') IS NOT NULL
            BEGIN
                EXEC sp_executesql N'UPDATE [dbo].[MobileDevices] SET [IdentificationNumber] = [DeviceId] WHERE [IdentificationNumber] IS NULL OR [IdentificationNumber] = 0;';
            END

            IF COL_LENGTH('dbo.MobileDevices', 'BankAccountName') IS NOT NULL
            BEGIN
                EXEC sp_executesql N'UPDATE [dbo].[MobileDevices] SET [BankAccountName] = [PhoneNumber] WHERE [BankAccountName] IS NULL AND [PhoneNumber] IS NOT NULL;';
                EXEC sp_executesql N'UPDATE [dbo].[MobileDevices] SET [AssignedEmployeeName] = NULL WHERE [AssignedEmployeeName] = [PhoneNumber];';
                EXEC sp_executesql N'UPDATE [dbo].[MobileDevices] SET [EmployeeId] = NULL WHERE [AssignedEmployeeName] IS NULL;';
            END

            IF OBJECT_ID('dbo.CheckSessions', 'U') IS NOT NULL
            BEGIN
                EXEC sp_executesql N'UPDATE s SET s.TotalDevices = (SELECT COUNT(*) FROM dbo.MobileDevices d WHERE d.IsActive = 1) FROM dbo.CheckSessions s WHERE s.TotalDevices < (SELECT COUNT(*) FROM dbo.MobileDevices d WHERE d.IsActive = 1) AND (SELECT COUNT(*) FROM dbo.MobileDevices d WHERE d.IsActive = 1) > 0;';
            END
        ");

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

        // 4. Company Excel Sheet Inventory (Category, Name) — 159 Records
        var currentActiveCount = await db.MobileDevices.CountAsync(d => d.IsActive);
        if (currentActiveCount < 150)
        {
            await SeedExcelInventoryAsync(db);
        }

        // 5. Ensure Available (Unassigned) Spare Devices Pool exists for Return & Replacement
        var unassignedAvailableCount = await db.MobileDevices.CountAsync(d =>
            d.IsActive && d.CurrentStatus != "Missing" && (d.PhoneNumber == null || d.PhoneNumber == ""));
        if (unassignedAvailableCount == 0)
        {
            var spareGroup = await db.Groups.FirstOrDefaultAsync(g => g.GroupName == "General")
                             ?? await db.Groups.FirstAsync();
            var spareModels = new[]
            {
                ("Phone 125", "Apple", "iPhone 15", "IT Stockroom · Shelf A1"),
                ("Phone 126", "Apple", "iPhone 15 Pro", "IT Stockroom · Shelf A2"),
                ("Phone 127", "Samsung", "Galaxy S24", "IT Stockroom · Shelf A3"),
                ("Phone 128", "Apple", "iPhone 14", "IT Stockroom · Shelf A4"),
                ("Phone 129", "Apple", "iPhone 15", "IT Stockroom · Shelf B1"),
                ("New 65", "Apple", "iPhone 15 Pro", "New Fleet Wing · Spare Cabinet 1"),
                ("New 66", "Samsung", "Galaxy S24", "New Fleet Wing · Spare Cabinet 2"),
                ("New 67", "Apple", "iPhone 15", "New Fleet Wing · Spare Cabinet 3"),
                ("Cass 31", "Apple", "iPhone 14", "Cass Locker · Spare Bay 1"),
                ("Cass 32", "Apple", "iPhone 13", "Cass Locker · Spare Bay 2")
            };
            int sIdx = 1;
            foreach (var (code, brand, model, loc) in spareModels)
            {
                if (!await db.MobileDevices.AnyAsync(d => d.MobileCode == code))
                {
                    db.MobileDevices.Add(new MobileDevice
                    {
                        MobileCode = code,
                        GroupId = spareGroup.GroupId,
                        MobileName = model,
                        Brand = brand,
                        Model = model,
                        IMEI = $"35{8409000000000L + sIdx * 211L}",
                        PhoneNumber = null, // Unassigned -> Available in inventory
                        SerialNumber = $"SN-SPARE-{sIdx:D4}",
                        Description = loc,
                        CurrentStatus = "Available",
                        IsActive = true,
                        CreatedAtUtc = DateTime.UtcNow.AddMinutes(-30 + sIdx),
                        UpdatedAtUtc = DateTime.UtcNow
                    });
                }
                sIdx++;
            }
            await db.SaveChangesAsync();
        }

        // 6. BCNF Normalization: DeviceModels table synchronization
        if (!await db.DeviceModels.AnyAsync())
        {
            var distinctModels = await db.MobileDevices
                .Where(d => !string.IsNullOrEmpty(d.Model))
                .Select(d => new { Brand = d.Brand ?? "Apple", Model = d.Model! })
                .Distinct()
                .ToListAsync();

            foreach (var m in distinctModels)
            {
                db.DeviceModels.Add(new DeviceModel
                {
                    Brand = m.Brand,
                    ModelName = m.Model,
                    DeviceType = "SmartPhone",
                    CreatedAtUtc = DateTime.UtcNow
                });
            }
            await db.SaveChangesAsync();
        }

        // Link MobileDevices to DeviceModels (BCNF Foreign Key)
        var allModels = await db.DeviceModels.ToListAsync();
        var devicesWithoutModel = await db.MobileDevices
            .Where(d => d.ModelId == null && !string.IsNullOrEmpty(d.Model))
            .ToListAsync();

        if (devicesWithoutModel.Any())
        {
            foreach (var dev in devicesWithoutModel)
            {
                var match = allModels.FirstOrDefault(m =>
                    string.Equals(m.ModelName, dev.Model, StringComparison.OrdinalIgnoreCase) &&
                    string.Equals(m.Brand, dev.Brand, StringComparison.OrdinalIgnoreCase))
                    ?? allModels.FirstOrDefault(m => string.Equals(m.ModelName, dev.Model, StringComparison.OrdinalIgnoreCase));
                if (match != null)
                {
                    dev.ModelId = match.ModelId;
                }
            }
            await db.SaveChangesAsync();
        }

        // 7. BCNF Normalization: Employees table synchronization
        if (!await db.Employees.AnyAsync())
        {
            var distinctEmployees = await db.MobileDevices
                .Where(d => !string.IsNullOrEmpty(d.PhoneNumber))
                .Select(d => d.PhoneNumber!.Trim())
                .Distinct()
                .ToListAsync();

            int empIdx = 1;
            foreach (var empName in distinctEmployees)
            {
                db.Employees.Add(new Employee
                {
                    EmployeeCode = $"EMP-{empIdx:D4}",
                    FullName = empName,
                    Department = "Operations",
                    IsActive = true,
                    CreatedAtUtc = DateTime.UtcNow,
                    UpdatedAtUtc = DateTime.UtcNow
                });
                empIdx++;
            }
            await db.SaveChangesAsync();
        }

        // Link MobileDevices to Employees (BCNF Foreign Key)
        var allEmployees = await db.Employees.ToListAsync();
        var devicesWithoutEmp = await db.MobileDevices
            .Where(d => d.EmployeeId == null && !string.IsNullOrEmpty(d.PhoneNumber))
            .ToListAsync();

        if (devicesWithoutEmp.Any())
        {
            foreach (var dev in devicesWithoutEmp)
            {
                var match = allEmployees.FirstOrDefault(e =>
                    string.Equals(e.FullName, dev.PhoneNumber!.Trim(), StringComparison.OrdinalIgnoreCase));
                if (match != null)
                {
                    dev.EmployeeId = match.EmployeeId;
                    dev.AssignedEmployeeName = match.FullName;
                    dev.AssignedEmployeeId = match.EmployeeCode;
                    dev.Department = match.Department;
                }
            }
            await db.SaveChangesAsync();
        }

        // 8. Enforce 1-to-Infinity Auto-Increment Numbering System (IdentificationNumber)
        var devicesWithoutIdNum = await db.MobileDevices
            .Where(d => d.IdentificationNumber <= 0)
            .OrderBy(d => d.DeviceId)
            .ToListAsync();

        if (devicesWithoutIdNum.Any())
        {
            foreach (var dev in devicesWithoutIdNum)
            {
                dev.IdentificationNumber = dev.DeviceId;
            }
            await db.SaveChangesAsync();
        }
    }

    public static async Task SeedExcelInventoryAsync(AppDbContext db)
    {
        var rawRows = new (string Category, string Name)[]
        {
            ("Phone 2", "David joseph / B"),
            ("Phone 6", "Olivia Oimin"),
            ("Phone 7", "Jayalen Lee marwick"),
            ("Phone 16", "Lauren Ranee / D"),
            ("Phone 20", "Craiy Barton / O"),
            ("Phone 23", "NAB Shihan Dai"),
            ("Phone 35", "Brown Mativ Burett"),
            ("Phone 38", "Shuai Sun / E"),
            ("Phone 48", "Olivia Claire"),
            ("Phone 54", "Michel John / AO"),
            ("Phone 57", "Adom John / O"),
            ("Phone  58", "Anz Robert / D"),
            ("Phone 62", "Michelle Claire / H"),
            ("Phone 68", "OLIVIA"),
            ("Phone 69", "Fiona Lea"),
            ("Phone 75", "Emily Elizabeth / E"),
            ("Phone 76", "Joshua James / O"),
            ("Phone 85", "ANZABN David Ninan"),
            ("Phone 88", "Zhinlong Li / H"),
            ("Phone 99", "Selina / AO"),
            ("Phone 101", "Ghost Celine"),
            ("Phone 103", "Wyne Dylan / AH"),
            ("Phone 110", "Jack Michel / AH"),
            ("Phone 112", "Zone Dean / S"),
            ("New 4", "SZE Lin lou / AH"),
            ("New 5", "Jenifer Marot"),
            ("New 13", "STG Michelle Hardi"),
            ("New 28", "Aiden Chorless / AH"),
            ("New 33", "Samuel John / AO"),
            ("New 39", "Brett Frogbroof / H"),
            ("New 42", "Homeyard Cristoper / H"),
            ("New 49", "Denisis Francis / D"),
            ("New 51", "Caxty Jane"),
            ("New 53", "Mellissa Anne / D"),
            ("New 55", "Wee chang / AO"),
            ("New 60", "Olivia"),
            ("New 61", "William Ray / AO"),
            ("New 62", "Aiden James"),
            ("Cass 7", "Mayur Bohel / Group D"),
            ("Cass 13", "Zhi Bin Tan / AO"),
            ("Cass 21", "Alison Tan Yee / Ao"),
            ("Cass 28", "Zoe Jordon Flyod / AO"),
            ("New 40", "Adithi Hennessy"),
            ("New 8", "Benjamin Dac"),
            ("Phone 6", "Olivia Oimin"),
            ("Phone 112", "Zone Dean Lowden"),
            ("Phone 19", "Jack Anthony"),
            ("Phone 107", "Nestor Raul"),
            ("Phone 73", "Bamah Bead Moriz"),
            ("Phone 53", "Ghost Celine"),
            ("Cass 16", "Michael Owen"),
            ("Phone 120", "Tiffany Anne Morris"),
            ("New 62", "Alden James"),
            ("Cass 30", "Andrew Joseph"),
            ("Phone 41", "Sabine Elizabeth"),
            ("New 31", "Emma Perrone"),
            ("Phone 99", "Selina Nguyen"),
            ("Phone111", "Harrison Lancaster"),
            ("Phone 17", "Olivia"),
            ("New 37", "Brenden Beehag"),
            ("New 60", "Olivia"),
            ("Phone 117", "Michelle Jones"),
            ("Phone78", "Michell Sansom"),
            ("Phone 109", "Damian Ras"),
            ("Cass 15", "Timothy Peter"),
            ("New 27", "Yu Lian Chua"),
            ("Cass 10", "Tristan Diston"),
            ("New 30", "Luke Barraclough"),
            ("New 24", "Athukoralage Dane Malik"),
            ("Cass 25", "Ana Marie Sabato"),
            ("New 33", "Samuee John Akbale"),
            ("Phone 34", "Pahla Dewantar Arief"),
            ("Phone 54", "Michael John Chilos"),
            ("Phone 51", "Adam Kenneth Wollings"),
            ("New 47", "Mathew Robert Thompson"),
            ("New 46", "Cameron James"),
            ("Phone 60", "Kassondre Fiora Larke"),
            ("New 17", "Quang Hoan Nguyen"),
            ("Phone 34", "Moritarty Finfiemore"),
            ("New 45", "Erin Rose Graves"),
            ("Phone 74", "Sabring Grace"),
            ("Phone 13", "Rebecc Louise"),
            ("Phone 37", "Anthen Marie Macrides"),
            ("Phone 33", "Madeleine Kate Mc"),
            ("New 2", "Vivienne Yanling"),
            ("Phone 102", "Alexender Liakopoulos"),
            ("New 25", "Daniella Kate Higgs"),
            ("Phone 76", "Christine Helen"),
            ("Phone 104", "Joshua P Halloran"),
            ("Phone 71", "Tan Dung Nguyen"),
            ("Phone 70", "Simon James Watin"),
            ("New 48", "John Leonaro Butters"),
            ("Phone 72", "Ananda Sollivan"),
            ("Phone 84", "Cindy Louise Elkington"),
            ("Phone 3", "Blair Lewis"),
            ("Phone 16", "Lauren Renee"),
            ("New 59", "ANZ Olivia"),
            ("Cass 11", "Ghost Celine"),
            ("New 19", "Jackson Tetitaha"),
            ("Cass 8", "InG Olivia"),
            ("Phone 81", "Start Hhan Ho"),
            ("Cass 13", "Zhi Bin Tan"),
            ("Cass 28", "Zoe Jordan Elgod"),
            ("Cass 21", "Alison Fan Yee Bang"),
            ("New 45", "Kristy Chantal"),
            ("Phone 41", "Brandon Pan Murphy"),
            ("New 7", "Mark Gregory"),
            ("Phone 62", "Palmer Berry"),
            ("Phone 86", "Tailah Jayne"),
            ("Phone 52", "Bryden James Stone"),
            ("New 26", "Ghost Celing"),
            ("New 49", "Petrine Mather"),
            ("Cass 2", "Jo Ammis Kay"),
            ("Phone 22", "Johari Haris"),
            ("Phone 8", "Hoang Huu"),
            ("Phone 12", "Banjo Tannon"),
            ("New 43", "Tadmum Anchalee"),
            ("New 52", "Eric Zhizhen Ong"),
            ("New38", "Emily Jane"),
            ("Phone 122", "Callum Jacob"),
            ("Phone 47", "Lan Edward"),
            ("Phone 65", "Jennifer Mary"),
            ("New 61", "Reggan Jack"),
            ("New 13", "Sakariye Khalif"),
            ("Phone 61", "Brut Blaine Willian"),
            ("New 32", "Michael Craig"),
            ("New 58", "Calista Maria"),
            ("Cass 14", "Hok Chong"),
            ("Phone 45", "Olivia"),
            ("Phone 32", "Ian Rose Gale"),
            ("Phone 4", "Melissa Jane Tanner"),
            ("Phone 119", "Stephen Smith"),
            ("New 34", "Benjamin John"),
            ("New 16", "Jennifer Ann"),
            ("New 3", "Dinne Elizabeth"),
            ("New 50", "Skivan Krispeney Ben"),
            ("Phone 62", "Andrea Marie Lawson"),
            ("New 36", "Skivan"),
            ("Phone 43", "Bom"),
            ("Phone 121", "Witsen M Polus"),
            ("Phone 31", "Wei She Low"),
            ("Phone 49", "Hometown Kitchen Pty"),
            ("Cass 18", "Everyway Solutions Pty"),
            ("Cass 3 ", "Everyway Solutions"),
            ("New 55", "Wee Chang Lee"),
            ("Phone 97", "Kung YAP"),
            ("Phone 29", "Boon Heng"),
            ("Phone 58", "Michael Aaron"),
            ("Phone 39", "Sima Mourdha J"),
            ("Phone 11", "Amy Elizabeth"),
            ("Phone 5", "Ashleigh Sophia"),
            ("Phone 10", "Timna Poratt"),
            ("New 44", "Shawrgn Valerie"),
            ("Phone 37", "Anthea Marie"),
            ("Phone 48", "Olivia Claire"),
            ("Cass 27", "Lee Harvay"),
            ("Phone 13", "Ghost Celine"),
            ("Phone 108", "Hayden Llewellynne"),
            ("Phone 14", "Olivia")
        };

        var existingGroups = await db.Groups.ToDictionaryAsync(g => g.GroupName, g => g, StringComparer.OrdinalIgnoreCase);

        async Task<Group> GetOrCreateGroupAsync(string groupCode, string desc)
        {
            if (existingGroups.TryGetValue(groupCode, out var grp))
                return grp;

            var newGrp = new Group
            {
                GroupName = groupCode,
                Description = desc,
                IsActive = true,
                CreatedAtUtc = DateTime.UtcNow,
                UpdatedAtUtc = DateTime.UtcNow
            };
            db.Groups.Add(newGrp);
            await db.SaveChangesAsync();
            existingGroups[groupCode] = newGrp;
            return newGrp;
        }

        // Pre-seed main operational groups from the Excel sheet and UI design (D, E, F, G, H, B, O, AO, AH, S, General)
        var groupPresets = new (string Code, string Desc)[]
        {
            ("D", "Group D — Operations & Field Mobile Team"),
            ("E", "Group E — Enterprise & Client Relations"),
            ("F", "Group F — Finance & Commercial Desk"),
            ("G", "Group G — General & Logistics Team"),
            ("H", "Group H — Headquarters & Administration"),
            ("B", "Group B — Branch Operations"),
            ("O", "Group O — Outbound & Support"),
            ("AO", "Group AO — Account Operations"),
            ("AH", "Group AH — After-Hours & Dispatch"),
            ("S", "Group S — Special Projects"),
            ("General", "General — Assigned Company Fleet")
        };

        foreach (var (code, desc) in groupPresets)
        {
            await GetOrCreateGroupAsync(code, desc);
        }

        var deviceModels = new[]
        {
            ("Apple", "iPhone 15"),
            ("Apple", "iPhone 14"),
            ("Apple", "iPhone 15 Pro"),
            ("Samsung", "Galaxy S24"),
            ("Apple", "iPhone 13")
        };

        var usedCodes = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var existingDbCodes = await db.MobileDevices.Select(d => d.MobileCode).ToListAsync();
        foreach (var c in existingDbCodes) usedCodes.Add(c);

        int idx = 1;
        foreach (var (rawCat, rawName) in rawRows)
        {
            var cleanCat = System.Text.RegularExpressions.Regex.Replace(rawCat.Trim(), @"\s+", " ");
            // Normalize "Phone111" -> "Phone 111", "Phone78" -> "Phone 78", "New38" -> "New 38"
            cleanCat = System.Text.RegularExpressions.Regex.Replace(cleanCat, @"^(Phone|New|Cass)(\d+)$", "$1 $2", System.Text.RegularExpressions.RegexOptions.IgnoreCase);

            var employeeName = rawName.Trim();
            var groupCode = "General";

            if (employeeName.Contains('/'))
            {
                var parts = employeeName.Split('/', 2);
                employeeName = parts[0].Trim();
                var rawGrp = parts[1].Trim();
                if (rawGrp.StartsWith("Group ", StringComparison.OrdinalIgnoreCase))
                {
                    rawGrp = rawGrp.Substring(6).Trim();
                }
                groupCode = string.IsNullOrWhiteSpace(rawGrp) ? "General" : rawGrp.ToUpperInvariant();
            }
            else
            {
                // Distribute un-suffixed rows across D, E, F, G, H so the table matches the UI design groups
                var fallbackGroups = new[] { "D", "E", "F", "G", "H" };
                groupCode = fallbackGroups[idx % fallbackGroups.Length];
            }

            var group = await GetOrCreateGroupAsync(groupCode, $"Group {groupCode} Mobile Fleet");

            var uniqueCode = cleanCat;
            int dupCounter = 2;
            while (usedCodes.Contains(uniqueCode))
            {
                uniqueCode = $"{cleanCat} ({dupCounter})";
                dupCounter++;
            }
            usedCodes.Add(uniqueCode);

            var (brand, model) = deviceModels[(idx - 1) % deviceModels.Length];
            var imei1 = $"35{8401000000000L + idx * 137L}";
            var serial = $"SN-HTSK-{idx:D4}";
            var location = cleanCat.StartsWith("Cass", StringComparison.OrdinalIgnoreCase)
                ? $"Cass Locker · Bay {(idx % 8) + 1}"
                : cleanCat.StartsWith("New", StringComparison.OrdinalIgnoreCase)
                ? $"New Fleet Wing · Desk {(idx % 20) + 1}"
                : $"Main Floor · Group {groupCode} Station";

            db.MobileDevices.Add(new MobileDevice
            {
                MobileCode = uniqueCode,
                GroupId = group.GroupId,
                MobileName = model,
                Brand = brand,
                Model = model,
                IMEI = imei1,
                PhoneNumber = employeeName,
                BankAccountName = employeeName,
                SerialNumber = serial,
                Description = location,
                CurrentStatus = "Available",
                IsActive = true,
                CreatedAtUtc = DateTime.UtcNow.AddMinutes(-180 + idx),
                UpdatedAtUtc = DateTime.UtcNow
            });

            idx++;
        }

        await db.SaveChangesAsync();
    }
}
