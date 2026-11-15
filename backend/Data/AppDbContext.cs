using Microsoft.EntityFrameworkCore;
using backend.Models;

namespace backend.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<Role> Roles => Set<Role>();
    public DbSet<User> Users => Set<User>();
    public DbSet<Group> Groups => Set<Group>();
    public DbSet<MobileDevice> MobileDevices => Set<MobileDevice>();
    public DbSet<CheckSession> CheckSessions => Set<CheckSession>();
    public DbSet<DeviceCheckRecord> DeviceCheckRecords => Set<DeviceCheckRecord>();
    public DbSet<MissingIncident> MissingIncidents => Set<MissingIncident>();
    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<SystemSetting> SystemSettings => Set<SystemSetting>();
    public DbSet<DeviceReturnReplacement> DeviceReturnReplacements => Set<DeviceReturnReplacement>();
    public DbSet<ReconciliationSession> ReconciliationSessions => Set<ReconciliationSession>();
    public DbSet<ReconciliationItem> ReconciliationItems => Set<ReconciliationItem>();
    public DbSet<DeviceMovement> DeviceMovements => Set<DeviceMovement>();
    public DbSet<Employee> Employees => Set<Employee>();
    public DbSet<DeviceModel> DeviceModels => Set<DeviceModel>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Roles
        modelBuilder.Entity<Role>(entity =>
        {
            entity.HasKey(e => e.RoleId);
            entity.Property(e => e.RoleName).HasMaxLength(50).IsRequired();
        });

        // Users
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(e => e.UserId);
            entity.Property(e => e.FullName).HasMaxLength(150).IsRequired();
            entity.Property(e => e.Username).HasMaxLength(100).IsRequired();
            entity.Property(e => e.Email).HasMaxLength(150).IsRequired();
            entity.Property(e => e.PasswordHash).HasMaxLength(255).IsRequired();
            entity.HasIndex(e => e.Username).IsUnique();

            entity.HasOne(e => e.Role)
                .WithMany(r => r.Users)
                .HasForeignKey(e => e.RoleId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // Groups
        modelBuilder.Entity<Group>(entity =>
        {
            entity.HasKey(e => e.GroupId);
            entity.Property(e => e.GroupName).HasMaxLength(100).IsRequired();
            entity.Property(e => e.Description).HasMaxLength(255);
            entity.HasIndex(e => e.GroupName).IsUnique();
        });

        // MobileDevices
        modelBuilder.Entity<MobileDevice>(entity =>
        {
            entity.HasKey(e => e.DeviceId);
            entity.Property(e => e.MobileCode).HasMaxLength(30).IsRequired();
            entity.Property(e => e.MobileName).HasMaxLength(100);
            entity.Property(e => e.Brand).HasMaxLength(100);
            entity.Property(e => e.Model).HasMaxLength(100);
            entity.Property(e => e.IMEI).HasMaxLength(30);
            entity.Property(e => e.PhoneNumber).HasMaxLength(150);
            entity.Property(e => e.SerialNumber).HasMaxLength(100);
            entity.Property(e => e.Description).HasMaxLength(500);
            entity.Property(e => e.CurrentStatus).HasMaxLength(20).IsRequired();
            entity.HasIndex(e => e.MobileCode).IsUnique();

            entity.HasOne(e => e.Group)
                .WithMany(g => g.Devices)
                .HasForeignKey(e => e.GroupId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // CheckSessions
        modelBuilder.Entity<CheckSession>(entity =>
        {
            entity.HasKey(e => e.SessionId);
            entity.Property(e => e.SessionStatus).HasMaxLength(20).IsRequired();
            entity.Property(e => e.Notes).HasMaxLength(500);

            entity.HasOne(e => e.StartedByUser)
                .WithMany(u => u.StartedSessions)
                .HasForeignKey(e => e.StartedByUserId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // DeviceCheckRecords
        modelBuilder.Entity<DeviceCheckRecord>(entity =>
        {
            entity.HasKey(e => e.CheckRecordId);
            entity.Property(e => e.DeviceStatus).HasMaxLength(20).IsRequired();
            entity.Property(e => e.Notes).HasMaxLength(500);

            entity.HasIndex(e => new { e.SessionId, e.DeviceId }).IsUnique();

            entity.HasOne(e => e.Session)
                .WithMany(s => s.CheckRecords)
                .HasForeignKey(e => e.SessionId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Device)
                .WithMany(d => d.CheckRecords)
                .HasForeignKey(e => e.DeviceId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.Group)
                .WithMany(g => g.CheckRecords)
                .HasForeignKey(e => e.GroupId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.CheckedByUser)
                .WithMany(u => u.CheckRecords)
                .HasForeignKey(e => e.CheckedByUserId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // MissingIncidents
        modelBuilder.Entity<MissingIncident>(entity =>
        {
            entity.HasKey(e => e.IncidentId);
            entity.Property(e => e.IncidentStatus).HasMaxLength(20).IsRequired();
            entity.Property(e => e.ActionTaken).HasMaxLength(1000);
            entity.Property(e => e.Notes).HasMaxLength(1000);

            entity.HasOne(e => e.Device)
                .WithMany(d => d.MissingIncidents)
                .HasForeignKey(e => e.DeviceId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.FirstMissingCheck)
                .WithMany()
                .HasForeignKey(e => e.FirstMissingCheckId)
                .OnDelete(DeleteBehavior.NoAction);

            entity.HasOne(e => e.LastMissingCheck)
                .WithMany()
                .HasForeignKey(e => e.LastMissingCheckId)
                .OnDelete(DeleteBehavior.NoAction);
        });

        // Notifications
        modelBuilder.Entity<Notification>(entity =>
        {
            entity.HasKey(e => e.NotificationId);
            entity.Property(e => e.NotificationType).HasMaxLength(50).IsRequired();
            entity.Property(e => e.Message).HasMaxLength(500).IsRequired();
            entity.Property(e => e.Priority).HasMaxLength(20).IsRequired();

            entity.HasOne(e => e.Device)
                .WithMany(d => d.Notifications)
                .HasForeignKey(e => e.DeviceId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(e => e.Incident)
                .WithMany(i => i.Notifications)
                .HasForeignKey(e => e.IncidentId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        // SystemSettings
        modelBuilder.Entity<SystemSetting>(entity =>
        {
            entity.HasKey(e => e.SettingId);
            entity.Property(e => e.SettingKey).HasMaxLength(100).IsRequired();
            entity.Property(e => e.SettingValue).HasMaxLength(255).IsRequired();
            entity.Property(e => e.Description).HasMaxLength(500);
            entity.HasIndex(e => e.SettingKey).IsUnique();
        });

        // DeviceReturnReplacements
        modelBuilder.Entity<DeviceReturnReplacement>(entity =>
        {
            entity.HasKey(e => e.TransactionId);
            entity.Property(e => e.TransactionType).HasMaxLength(40).IsRequired();
            entity.Property(e => e.EmployeeId).HasMaxLength(50).IsRequired();
            entity.Property(e => e.EmployeeName).HasMaxLength(150).IsRequired();
            entity.Property(e => e.GroupName).HasMaxLength(100);
            entity.Property(e => e.PreviouslyAssignedMobileCode).HasMaxLength(50);
            entity.Property(e => e.PreviouslyAssignedDeviceModel).HasMaxLength(150);
            entity.Property(e => e.ReturnedMobileCode).HasMaxLength(50);
            entity.Property(e => e.ReturnedDeviceModel).HasMaxLength(150);
            entity.Property(e => e.DeviceCondition).HasMaxLength(100);
            entity.Property(e => e.ReturnProcessedByName).HasMaxLength(150);
            entity.Property(e => e.ReplacementMobileCode).HasMaxLength(50);
            entity.Property(e => e.ReplacementDeviceModel).HasMaxLength(150);
            entity.Property(e => e.ReplacementAssignedByName).HasMaxLength(150);
            entity.Property(e => e.Remarks).HasMaxLength(1000);
        });

        // ReconciliationSessions
        modelBuilder.Entity<ReconciliationSession>(entity =>
        {
            entity.HasKey(e => e.ReconciliationId);
            entity.Property(e => e.SessionCode).HasMaxLength(50).IsRequired();
            entity.Property(e => e.Title).HasMaxLength(150).IsRequired();
            entity.Property(e => e.Scope).HasMaxLength(100);
            entity.Property(e => e.ChecklistAName).HasMaxLength(150);
            entity.Property(e => e.ChecklistBName).HasMaxLength(150);
            entity.Property(e => e.CreatedByName).HasMaxLength(150);
            entity.Property(e => e.Notes).HasMaxLength(1000);
            entity.HasIndex(e => e.SessionCode).IsUnique();
        });

        // ReconciliationItems
        modelBuilder.Entity<ReconciliationItem>(entity =>
        {
            entity.HasKey(e => e.ItemId);
            entity.Property(e => e.RawDeviceId).HasMaxLength(100).IsRequired();
            entity.Property(e => e.NormalizedDeviceId).HasMaxLength(100).IsRequired();
            entity.Property(e => e.DeviceName).HasMaxLength(150);
            entity.Property(e => e.BrandModel).HasMaxLength(150);
            entity.Property(e => e.IMEI).HasMaxLength(100);
            entity.Property(e => e.SerialNumber).HasMaxLength(100);
            entity.Property(e => e.PreviousEmployee).HasMaxLength(150);
            entity.Property(e => e.CurrentEmployee).HasMaxLength(150);
            entity.Property(e => e.PreviousStatus).HasMaxLength(50);
            entity.Property(e => e.CurrentStatus).HasMaxLength(50);
            entity.Property(e => e.PreviousLocation).HasMaxLength(150);
            entity.Property(e => e.CurrentLocation).HasMaxLength(150);
            entity.Property(e => e.ReconciliationResult).HasMaxLength(60).IsRequired();
            entity.Property(e => e.InvestigationNotes).HasMaxLength(1000);

            entity.HasOne(e => e.Reconciliation)
                .WithMany(r => r.Items)
                .HasForeignKey(e => e.ReconciliationId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // DeviceMovements
        modelBuilder.Entity<DeviceMovement>(entity =>
        {
            entity.HasKey(e => e.MovementId);
            entity.Property(e => e.MovementType).HasMaxLength(50).IsRequired();
            entity.Property(e => e.FromStatus).HasMaxLength(50);
            entity.Property(e => e.ToStatus).HasMaxLength(50);
            entity.Property(e => e.FromEmployee).HasMaxLength(150);
            entity.Property(e => e.ToEmployee).HasMaxLength(150);
            entity.Property(e => e.FromLocation).HasMaxLength(150);
            entity.Property(e => e.ToLocation).HasMaxLength(150);
            entity.Property(e => e.Reason).HasMaxLength(500);
            entity.Property(e => e.PerformedByName).HasMaxLength(150);

            entity.HasOne(e => e.Device)
                .WithMany()
                .HasForeignKey(e => e.DeviceId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Employees (BCNF Normalization)
        modelBuilder.Entity<Employee>(entity =>
        {
            entity.HasKey(e => e.EmployeeId);
            entity.Property(e => e.EmployeeCode).HasMaxLength(50).IsRequired();
            entity.Property(e => e.FullName).HasMaxLength(150).IsRequired();
            entity.Property(e => e.Department).HasMaxLength(100);
            entity.Property(e => e.Email).HasMaxLength(150);
            entity.Property(e => e.PhoneNumber).HasMaxLength(50);
            entity.HasIndex(e => e.EmployeeCode).IsUnique();
        });

        // DeviceModels (BCNF Normalization)
        modelBuilder.Entity<DeviceModel>(entity =>
        {
            entity.HasKey(e => e.ModelId);
            entity.Property(e => e.Brand).HasMaxLength(100).IsRequired();
            entity.Property(e => e.ModelName).HasMaxLength(100).IsRequired();
            entity.Property(e => e.DeviceType).HasMaxLength(50).IsRequired();
            entity.HasIndex(e => new { e.Brand, e.ModelName });
        });

        // AuditLogs (Developer Exclusive System Audit Trail)
        modelBuilder.Entity<AuditLog>(entity =>
        {
            entity.HasKey(e => e.LogId);
            entity.Property(e => e.UserName).HasMaxLength(150).IsRequired();
            entity.Property(e => e.UserRole).HasMaxLength(50).IsRequired();
            entity.Property(e => e.Action).HasMaxLength(100).IsRequired();
            entity.Property(e => e.EntityName).HasMaxLength(100).IsRequired();
            entity.Property(e => e.EntityId).HasMaxLength(100);
            entity.Property(e => e.Details).HasMaxLength(4000);
            entity.Property(e => e.IpAddress).HasMaxLength(50);

            entity.HasOne(e => e.User)
                .WithMany()
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        // Update MobileDevice navigation configurations
        modelBuilder.Entity<MobileDevice>(entity =>
        {
            entity.HasOne(e => e.DeviceModel)
                .WithMany(m => m.Devices)
                .HasForeignKey(e => e.ModelId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(e => e.AssignedEmployee)
                .WithMany(m => m.AssignedDevices)
                .HasForeignKey(e => e.EmployeeId)
                .OnDelete(DeleteBehavior.SetNull);
        });
    }
}
