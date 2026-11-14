namespace backend.Services;

public interface ITimeService
{
    DateTime UtcNow { get; }
    DateTime ColomboNow { get; }
    DateTime ToColomboTime(DateTime utcDateTime);
    DateTime ToUtc(DateTime colomboDateTime);
    string FormatColombo(DateTime? utcDateTime, string format = "yyyy-MM-dd HH:mm:ss");
    TimeZoneInfo ColomboTimeZone { get; }
}

public class ColomboTimeService : ITimeService
{
    private readonly TimeZoneInfo _colomboTimeZone;

    public ColomboTimeService()
    {
        // Try Windows name first, then IANA
        TimeZoneInfo? tz = null;
        try
        {
            tz = TimeZoneInfo.FindSystemTimeZoneById("Sri Lanka Standard Time");
        }
        catch
        {
            try
            {
                tz = TimeZoneInfo.FindSystemTimeZoneById("Asia/Colombo");
            }
            catch
            {
                // Fallback to UTC+05:30 custom zone if not found
                tz = TimeZoneInfo.CreateCustomTimeZone("Asia/Colombo", TimeSpan.FromMinutes(330), "Sri Lanka Standard Time", "Sri Lanka Standard Time");
            }
        }
        _colomboTimeZone = tz ?? TimeZoneInfo.Utc;
    }

    public DateTime UtcNow => DateTime.UtcNow;

    public DateTime ColomboNow => TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, _colomboTimeZone);

    public TimeZoneInfo ColomboTimeZone => _colomboTimeZone;

    public DateTime ToColomboTime(DateTime utcDateTime)
    {
        var utc = utcDateTime.Kind == DateTimeKind.Unspecified
            ? DateTime.SpecifyKind(utcDateTime, DateTimeKind.Utc)
            : utcDateTime.ToUniversalTime();

        return TimeZoneInfo.ConvertTimeFromUtc(utc, _colomboTimeZone);
    }

    public DateTime ToUtc(DateTime colomboDateTime)
    {
        return TimeZoneInfo.ConvertTimeToUtc(DateTime.SpecifyKind(colomboDateTime, DateTimeKind.Unspecified), _colomboTimeZone);
    }

    public string FormatColombo(DateTime? utcDateTime, string format = "yyyy-MM-dd HH:mm:ss")
    {
        if (!utcDateTime.HasValue) return "-";
        return ToColomboTime(utcDateTime.Value).ToString(format);
    }
}
