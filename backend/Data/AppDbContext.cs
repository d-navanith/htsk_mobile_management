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
            entity.Property(e => e.PhoneNumber).HasMaxLength(30);
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
    }
}
