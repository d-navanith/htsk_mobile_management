using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using backend.Data;
using backend.Models;

namespace backend.Services;

public class NormalizedEntry
{
    public string Raw { get; set; } = string.Empty;
    public string NormalizedKey { get; set; } = string.Empty;
    public int LineIndex { get; set; }
    public bool IsDuplicateInList { get; set; }
    public int OccurrenceCount { get; set; }
}

public class MathematicalBalanceReport
{
    public int TotalRegisteredDevices { get; set; }
    public int AvailableDevices { get; set; }
    public int AssignedDevices { get; set; }
    public int UnderMaintenanceDevices { get; set; }
    public int UnderInvestigationDevices { get; set; }
    public int ConfirmedLostDevices { get; set; }
    public int RetiredDevices { get; set; }
    public bool IsLifecycleBalanced { get; set; }
    public int LifecycleDiscrepancy { get; set; }

    public int ExpectedPhysicalAuditCount { get; set; }
    public int VerifiedAuditCount { get; set; }
    public int UnverifiedAuditCount { get; set; }
    public bool IsAuditBalanced { get; set; }
    public int AuditDiscrepancy { get; set; }

    public string Explanation { get; set; } = string.Empty;
}

public class ComparisonExplanation
{
    public string Formula { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public int ValueA { get; set; }
    public int ValueB { get; set; }
    public int ResultValue { get; set; }
    public string VerificationNote { get; set; } = string.Empty;
}

public class ReconciliationComparisonResult
{
    public string Title { get; set; } = "Mobile Device Inventory Reconciliation";
    public string SessionCode { get; set; } = string.Empty;
    public DateTime AuditDateUtc { get; set; } = DateTime.UtcNow;

    public int TotalRawA { get; set; }
    public int TotalUniqueA { get; set; }
    public int DuplicateCountA { get; set; }
    public List<string> DuplicatesA { get; set; } = new();

    public int TotalRawB { get; set; }
    public int TotalUniqueB { get; set; }
    public int DuplicateCountB { get; set; }
    public List<string> DuplicatesB { get; set; } = new();

    public int NetRawDifference => TotalRawA - TotalRawB;
    public int NetUniqueDifference => TotalUniqueA - TotalUniqueB;

    public int CommonCount { get; set; }
    public List<string> CommonKeys { get; set; } = new();

    public int AbsentCount { get; set; }
    public List<string> AbsentKeys { get; set; } = new();

    public int NewCount { get; set; }
    public List<string> NewKeys { get; set; } = new();

    public int ExplainedReturnCount { get; set; }
    public int ExplainedReplaceCount { get; set; }
    public int ExplainedTransferCount { get; set; }
    public int UnderInvestigationCount { get; set; }
    public int ConfirmedLostCount { get; set; }

    public List<ReconciliationItemDto> Items { get; set; } = new();
    public List<ComparisonExplanation> CalculationBreakdown { get; set; } = new();
    public MathematicalBalanceReport BalanceReport { get; set; } = new();
}

public class ReconciliationItemDto
{
    public int ItemId { get; set; }
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
    public string? LastReturnDateColombo { get; set; }
    public string? LastAssignmentDateColombo { get; set; }
    public string? LastVerifiedDateColombo { get; set; }
    public string ReconciliationResult { get; set; } = string.Empty;
    public string CategoryBadgeColor { get; set; } = "gray"; // green, red, amber, blue, purple
    public string? InvestigationNotes { get; set; }
    public bool IsApproved { get; set; }
    public bool InChecklistA { get; set; }
    public bool InChecklistB { get; set; }
}

public class ReconciliationEngine
{
    private readonly AppDbContext _db;
    private readonly ColomboTimeService _timeService;

    public ReconciliationEngine(AppDbContext db, ColomboTimeService timeService)
    {
        _db = db;
        _timeService = timeService;
    }

    public static string NormalizeDeviceId(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return string.Empty;
        var cleaned = raw.Trim();
        cleaned = Regex.Replace(cleaned, @"\s+", " ").Trim();

        var match = Regex.Match(cleaned, @"^([A-Za-z]+)[\s\-_]*([0-9]+.*)$");
        if (match.Success)
        {
            var prefix = match.Groups[1].Value.ToLowerInvariant();
            var suffix = match.Groups[2].Value.Trim();

            // Prefix aliases
            if (prefix == "pn" || prefix == "ph" || prefix == "phone")
            {
                prefix = "phone";
            }
            else if (prefix == "cass" || prefix == "coss")
            {
                prefix = "cass";
            }
            else if (prefix == "mob" || prefix == "mobile")
            {
                prefix = "mob";
            }
            else if (prefix == "new")
            {
                prefix = "new";
            }

            // Remove leading zeroes from numeric portion
            var digitMatch = Regex.Match(suffix, @"^0*([0-9]+)(.*)$");
            if (digitMatch.Success)
            {
                var num = digitMatch.Groups[1].Value;
                var rest = digitMatch.Groups[2].Value.Trim().ToLowerInvariant();
                return $"{prefix}-{num}{rest}".TrimEnd('-');
            }

            return $"{prefix}-{suffix.ToLowerInvariant()}";
        }

        return Regex.Replace(cleaned.ToLowerInvariant(), @"[^a-z0-9]", "-").Trim('-');
    }

    public List<NormalizedEntry> ParseChecklist(string rawText)
    {
        if (string.IsNullOrWhiteSpace(rawText)) return new List<NormalizedEntry>();

        var tokens = rawText
            .Split(new[] { ',', '\n', '\r', ';', '\t' }, StringSplitOptions.RemoveEmptyEntries)
            .Select(t => t.Trim())
            .Where(t => !string.IsNullOrWhiteSpace(t))
            .ToList();

        var counts = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        var entries = new List<NormalizedEntry>();

        for (int i = 0; i < tokens.Count; i++)
        {
            var raw = tokens[i];
            var norm = NormalizeDeviceId(raw);
            if (string.IsNullOrEmpty(norm)) continue;

            counts[norm] = counts.TryGetValue(norm, out var c) ? c + 1 : 1;

            entries.Add(new NormalizedEntry
            {
                Raw = raw,
                NormalizedKey = norm,
                LineIndex = i + 1,
                IsDuplicateInList = false, // evaluated after count
                OccurrenceCount = counts[norm]
            });
        }

        foreach (var entry in entries)
        {
            if (counts[entry.NormalizedKey] > 1)
            {
                entry.IsDuplicateInList = true;
            }
        }

        return entries;
    }

    public async Task<ReconciliationComparisonResult> CompareAsync(
        string rawTextA,
        string rawTextB,
        string? title = null,
        string? checklistAName = null,
        string? checklistBName = null,
        bool persistSession = false,
        int? userId = null,
        string? userName = null)
    {
        var entriesA = ParseChecklist(rawTextA);
        var entriesB = ParseChecklist(rawTextB);

        var totalRawA = entriesA.Count;
        var totalRawB = entriesB.Count;

        // Group by normalized key
        var groupA = entriesA.GroupBy(e => e.NormalizedKey).ToDictionary(g => g.Key, g => g.ToList());
        var groupB = entriesB.GroupBy(e => e.NormalizedKey).ToDictionary(g => g.Key, g => g.ToList());

        var uniqueA = groupA.Keys.ToHashSet(StringComparer.OrdinalIgnoreCase);
        var uniqueB = groupB.Keys.ToHashSet(StringComparer.OrdinalIgnoreCase);

        var duplicatesA = groupA.Where(kv => kv.Value.Count > 1).Select(kv => kv.Key).ToList();
        var duplicatesB = groupB.Where(kv => kv.Value.Count > 1).Select(kv => kv.Key).ToList();

        var duplicateCountA = entriesA.Count - uniqueA.Count;
        var duplicateCountB = entriesB.Count - uniqueB.Count;

        var common = uniqueA.Intersect(uniqueB, StringComparer.OrdinalIgnoreCase).OrderBy(k => k).ToList();
        var absent = uniqueA.Except(uniqueB, StringComparer.OrdinalIgnoreCase).OrderBy(k => k).ToList();
        var newlyFound = uniqueB.Except(uniqueA, StringComparer.OrdinalIgnoreCase).OrderBy(k => k).ToList();

        // Query database to cross-reference transactions and master records
        var allDevices = await _db.MobileDevices
            .Include(d => d.Group)
            .Include(d => d.CheckRecords)
            .ToListAsync();

        var allTransactions = await _db.DeviceReturnReplacements
            .OrderByDescending(t => t.CreatedAtUtc)
            .ToListAsync();

        // Build lookup map for devices by normalized MobileCode
        var deviceByNormKey = new Dictionary<string, MobileDevice>(StringComparer.OrdinalIgnoreCase);
        foreach (var dev in allDevices)
        {
            var k = NormalizeDeviceId(dev.MobileCode);
            if (!deviceByNormKey.ContainsKey(k))
            {
                deviceByNormKey[k] = dev;
            }
        }

        var resultItems = new List<ReconciliationItemDto>();
        int explainedReturnCount = 0;
        int explainedReplaceCount = 0;
        int explainedTransferCount = 0;
        int underInvestigationCount = 0;
        int confirmedLostCount = 0;

        // 1. Process Verified in Both ($A \cap B$)
        foreach (var key in common)
        {
            var rawLabelA = groupA[key].First().Raw;
            deviceByNormKey.TryGetValue(key, out var dev);

            var lastCheck = dev?.CheckRecords.OrderByDescending(c => c.CheckedAtUtc).FirstOrDefault();

            resultItems.Add(new ReconciliationItemDto
            {
                RawDeviceId = rawLabelA,
                NormalizedDeviceId = key,
                MatchedDeviceId = dev?.DeviceId,
                DeviceName = dev?.MobileName ?? dev?.Model ?? rawLabelA,
                BrandModel = dev != null ? $"{dev.Brand} {dev.Model}".Trim() : null,
                IMEI = dev?.IMEI,
                SerialNumber = dev?.SerialNumber,
                PreviousEmployee = dev?.AssignedEmployeeName ?? dev?.PhoneNumber,
                CurrentEmployee = dev?.AssignedEmployeeName ?? dev?.PhoneNumber,
                PreviousStatus = dev?.CurrentStatus ?? "Assigned",
                CurrentStatus = dev?.CurrentStatus ?? "Assigned",
                PreviousLocation = dev?.LastKnownLocation ?? dev?.Description,
                CurrentLocation = dev?.LastKnownLocation ?? dev?.Description,
                LastReturnDateColombo = dev?.LastReturnDateUtc != null ? _timeService.FormatColombo(dev.LastReturnDateUtc.Value) : null,
                LastAssignmentDateColombo = dev?.LastAssignmentDateUtc != null ? _timeService.FormatColombo(dev.LastAssignmentDateUtc.Value) : null,
                LastVerifiedDateColombo = lastCheck != null ? _timeService.FormatColombo(lastCheck.CheckedAtUtc) : _timeService.FormatColombo(_timeService.UtcNow),
                ReconciliationResult = "Verified in Both Audits",
                CategoryBadgeColor = "green",
                InvestigationNotes = "Physically confirmed present in both previous and current inventory audits.",
                InChecklistA = true,
                InChecklistB = true
            });
        }

        // 2. Process Absent from Latest Audit ($A - B$)
        foreach (var key in absent)
        {
            var rawLabelA = groupA[key].First().Raw;
            deviceByNormKey.TryGetValue(key, out var dev);

            // Cross reference returns/replacements
            var relevantTx = allTransactions.FirstOrDefault(t =>
                (t.ReturnedMobileCode != null && NormalizeDeviceId(t.ReturnedMobileCode) == key) ||
                (t.PreviouslyAssignedMobileCode != null && NormalizeDeviceId(t.PreviouslyAssignedMobileCode) == key));

            string category;
            string color;
            string note;

            if (relevantTx != null && relevantTx.ReplacementDeviceId.HasValue)
            {
                category = "Explained by Device Replacement";
                color = "blue";
                note = $"Device was returned on {_timeService.FormatColombo(relevantTx.ReturnDateUtc ?? relevantTx.CreatedAtUtc)} by {relevantTx.EmployeeName} and replaced with {relevantTx.ReplacementMobileCode} ({relevantTx.ReplacementDeviceModel}).";
                explainedReplaceCount++;
            }
            else if (relevantTx != null && relevantTx.ReturnedDeviceId.HasValue)
            {
                category = "Explained by Device Return";
                color = "purple";
                var cond = relevantTx.DeviceCondition ?? "Good";
                note = $"Device was returned to company inventory on {_timeService.FormatColombo(relevantTx.ReturnDateUtc ?? relevantTx.CreatedAtUtc)} by {relevantTx.EmployeeName} (Condition: {cond}). {(cond.Contains("Damaged", StringComparison.OrdinalIgnoreCase) ? "Sent for repair/maintenance." : "In spare storage.")}";
                explainedReturnCount++;
            }
            else if (dev != null && dev.CurrentStatus == "UnderMaintenance")
            {
                category = "Explained by Device Return";
                color = "purple";
                note = "Device is currently logged in Maintenance / Repair workshop.";
                explainedReturnCount++;
            }
            else if (dev != null && dev.CurrentStatus == "ConfirmedLost")
            {
                category = "Confirmed Lost";
                color = "red";
                note = "Device was officially investigated and confirmed lost in a previous authorized review.";
                confirmedLostCount++;
            }
            else
            {
                // Never automatically mark as lost per requirements!
                category = "Under Investigation";
                color = "amber";
                var emp = dev?.AssignedEmployeeName ?? dev?.PhoneNumber ?? "Unassigned";
                var loc = dev?.LastKnownLocation ?? dev?.Description ?? "Unknown";
                note = $"Device not verified during latest audit. Pending physical investigation with last assigned employee ({emp}) and last known location ({loc}).";
                underInvestigationCount++;
            }

            var lastCheck = dev?.CheckRecords.OrderByDescending(c => c.CheckedAtUtc).FirstOrDefault();

            resultItems.Add(new ReconciliationItemDto
            {
                RawDeviceId = rawLabelA,
                NormalizedDeviceId = key,
                MatchedDeviceId = dev?.DeviceId,
                DeviceName = dev?.MobileName ?? dev?.Model ?? rawLabelA,
                BrandModel = dev != null ? $"{dev.Brand} {dev.Model}".Trim() : null,
                IMEI = dev?.IMEI,
                SerialNumber = dev?.SerialNumber,
                PreviousEmployee = dev?.AssignedEmployeeName ?? dev?.PhoneNumber,
                CurrentEmployee = dev?.AssignedEmployeeName ?? dev?.PhoneNumber,
                PreviousStatus = dev?.CurrentStatus ?? "Assigned",
                CurrentStatus = category == "Explained by Device Return" ? "Available" : (dev?.CurrentStatus ?? "UnderInvestigation"),
                PreviousLocation = dev?.LastKnownLocation ?? dev?.Description,
                CurrentLocation = relevantTx != null ? "Company Stockroom" : (dev?.LastKnownLocation ?? dev?.Description),
                LastReturnDateColombo = relevantTx?.ReturnDateUtc != null ? _timeService.FormatColombo(relevantTx.ReturnDateUtc.Value) : (dev?.LastReturnDateUtc != null ? _timeService.FormatColombo(dev.LastReturnDateUtc.Value) : null),
                LastAssignmentDateColombo = dev?.LastAssignmentDateUtc != null ? _timeService.FormatColombo(dev.LastAssignmentDateUtc.Value) : null,
                LastVerifiedDateColombo = lastCheck != null ? _timeService.FormatColombo(lastCheck.CheckedAtUtc) : null,
                ReconciliationResult = category,
                CategoryBadgeColor = color,
                InvestigationNotes = note,
                InChecklistA = true,
                InChecklistB = false
            });
        }

        // 3. Process Newly Found in Latest Audit ($B - A$)
        foreach (var key in newlyFound)
        {
            var rawLabelB = groupB[key].First().Raw;
            deviceByNormKey.TryGetValue(key, out var dev);

            var replacementTx = allTransactions.FirstOrDefault(t =>
                t.ReplacementMobileCode != null && NormalizeDeviceId(t.ReplacementMobileCode) == key);

            string category;
            string color;
            string note;

            if (replacementTx != null)
            {
                category = "Explained by Device Replacement";
                color = "blue";
                note = $"Device was issued as a replacement to {replacementTx.EmployeeName} on {_timeService.FormatColombo(replacementTx.NewAssignmentDateUtc ?? replacementTx.CreatedAtUtc)} (replacing {replacementTx.ReturnedMobileCode}).";
                explainedReplaceCount++;
            }
            else if (dev != null && dev.CreatedAtUtc > DateTime.UtcNow.AddDays(-60))
            {
                category = "Newly Registered Device";
                color = "cyan";
                note = $"New company phone registered into inventory on {_timeService.FormatColombo(dev.CreatedAtUtc)}.";
            }
            else
            {
                category = "Unexpected Device";
                color = "orange";
                note = "Device was physically scanned in latest audit but was absent in previous audit. Requires verification of registration origin.";
            }

            resultItems.Add(new ReconciliationItemDto
            {
                RawDeviceId = rawLabelB,
                NormalizedDeviceId = key,
                MatchedDeviceId = dev?.DeviceId,
                DeviceName = dev?.MobileName ?? dev?.Model ?? rawLabelB,
                BrandModel = dev != null ? $"{dev.Brand} {dev.Model}".Trim() : null,
                IMEI = dev?.IMEI,
                SerialNumber = dev?.SerialNumber,
                PreviousEmployee = null,
                CurrentEmployee = dev?.AssignedEmployeeName ?? dev?.PhoneNumber ?? replacementTx?.EmployeeName,
                PreviousStatus = "Not Present in Previous Audit",
                CurrentStatus = dev?.CurrentStatus ?? "Assigned",
                PreviousLocation = null,
                CurrentLocation = dev?.LastKnownLocation ?? dev?.Description ?? "Office Floor",
                LastReturnDateColombo = null,
                LastAssignmentDateColombo = dev?.LastAssignmentDateUtc != null ? _timeService.FormatColombo(dev.LastAssignmentDateUtc.Value) : null,
                LastVerifiedDateColombo = _timeService.FormatColombo(_timeService.UtcNow),
                ReconciliationResult = category,
                CategoryBadgeColor = color,
                InvestigationNotes = note,
                InChecklistA = false,
                InChecklistB = true
            });
        }

        // 4. Record Duplicates in Audit Lists as warning items
        foreach (var dupKey in duplicatesA)
        {
            var dupEntries = groupA[dupKey];
            if (dupEntries.Count > 1)
            {
                resultItems.Add(new ReconciliationItemDto
                {
                    RawDeviceId = dupEntries[1].Raw,
                    NormalizedDeviceId = dupKey,
                    DeviceName = $"Duplicate Scan ({dupEntries.Count}x in Audit A)",
                    ReconciliationResult = "Duplicate Checklist Entry",
                    CategoryBadgeColor = "amber",
                    InvestigationNotes = $"Item '{dupEntries[0].Raw}' was scanned {dupEntries.Count} times in Previous Audit. Raw count inflated by {dupEntries.Count - 1}.",
                    InChecklistA = true,
                    InChecklistB = uniqueB.Contains(dupKey)
                });
            }
        }

        foreach (var dupKey in duplicatesB)
        {
            var dupEntries = groupB[dupKey];
            if (dupEntries.Count > 1)
            {
                resultItems.Add(new ReconciliationItemDto
                {
                    RawDeviceId = dupEntries[1].Raw,
                    NormalizedDeviceId = dupKey,
                    DeviceName = $"Duplicate Scan ({dupEntries.Count}x in Audit B)",
                    ReconciliationResult = "Duplicate Checklist Entry",
                    CategoryBadgeColor = "amber",
                    InvestigationNotes = $"Item '{dupEntries[0].Raw}' was scanned {dupEntries.Count} times in Latest Audit. Raw count inflated by {dupEntries.Count - 1}.",
                    InChecklistA = uniqueA.Contains(dupKey),
                    InChecklistB = true
                });
            }
        }

        // 5. Build Mathematical Balance Report (Section 15)
        var totalReg = allDevices.Count(d => d.IsActive);
        var avail = allDevices.Count(d => d.IsActive && (d.CurrentStatus == "Available" || string.IsNullOrWhiteSpace(d.AssignedEmployeeName)));
        var assigned = allDevices.Count(d => d.IsActive && d.CurrentStatus != "Available" && d.CurrentStatus != "Missing" && !string.IsNullOrWhiteSpace(d.AssignedEmployeeName));
        var underMaint = allDevices.Count(d => d.IsActive && d.CurrentStatus == "UnderMaintenance");
        var underInvest = allDevices.Count(d => d.IsActive && (d.CurrentStatus == "UnderInvestigation" || d.CurrentStatus == "Missing"));
        var lost = allDevices.Count(d => d.IsActive && d.CurrentStatus == "ConfirmedLost");
        var retired = allDevices.Count(d => !d.IsActive || d.CurrentStatus == "Retired");

        var sumStatus = avail + assigned + underMaint + underInvest + lost + retired;
        var lifecycleBal = (sumStatus == totalReg);

        var balanceReport = new MathematicalBalanceReport
        {
            TotalRegisteredDevices = totalReg,
            AvailableDevices = avail,
            AssignedDevices = assigned,
            UnderMaintenanceDevices = underMaint,
            UnderInvestigationDevices = underInvest,
            ConfirmedLostDevices = lost,
            RetiredDevices = retired,
            IsLifecycleBalanced = lifecycleBal,
            LifecycleDiscrepancy = totalReg - sumStatus,
            ExpectedPhysicalAuditCount = uniqueA.Count,
            VerifiedAuditCount = common.Count,
            UnverifiedAuditCount = absent.Count,
            IsAuditBalanced = (common.Count + absent.Count == uniqueA.Count),
            AuditDiscrepancy = uniqueA.Count - (common.Count + absent.Count),
            Explanation = $"Formula Verified: Expected Unique ({uniqueA.Count}) = Common ({common.Count}) + Absent ({absent.Count}). Net raw difference is {totalRawA - totalRawB} ({totalRawA} - {totalRawB}) while net unique difference is {uniqueA.Count - uniqueB.Count} ({uniqueA.Count} - {uniqueB.Count})."
        };

        // 6. Build Calculation Breakdown
        var breakdown = new List<ComparisonExplanation>
        {
            new ComparisonExplanation
            {
                Formula = "|Raw_A| - |Raw_B|",
                Description = "Raw Checklist Difference (Total input tokens)",
                ValueA = totalRawA,
                ValueB = totalRawB,
                ResultValue = totalRawA - totalRawB,
                VerificationNote = $"{totalRawA} items scanned in Previous Audit vs {totalRawB} in Latest Audit."
            },
            new ComparisonExplanation
            {
                Formula = "|Unique_A| - |Unique_B|",
                Description = "Normalized Unique Device Difference",
                ValueA = uniqueA.Count,
                ValueB = uniqueB.Count,
                ResultValue = uniqueA.Count - uniqueB.Count,
                VerificationNote = $"{uniqueA.Count} distinct physical devices in Previous Audit vs {uniqueB.Count} in Latest Audit."
            },
            new ComparisonExplanation
            {
                Formula = "|A ∩ B|",
                Description = "Common Devices Verified in Both Audits",
                ValueA = uniqueA.Count,
                ValueB = uniqueB.Count,
                ResultValue = common.Count,
                VerificationNote = $"{common.Count} devices physically confirmed present in both inspection cycles."
            },
            new ComparisonExplanation
            {
                Formula = "|A - B|",
                Description = "Absent Devices (Not Found in Latest Audit)",
                ValueA = uniqueA.Count,
                ValueB = uniqueB.Count,
                ResultValue = absent.Count,
                VerificationNote = $"{absent.Count} devices were present in previous audit but absent from latest scan."
            },
            new ComparisonExplanation
            {
                Formula = "|B - A|",
                Description = "Newly Appearing Devices in Latest Audit",
                ValueA = uniqueA.Count,
                ValueB = uniqueB.Count,
                ResultValue = newlyFound.Count,
                VerificationNote = $"{newlyFound.Count} devices were found in latest audit that were not in previous checklist."
            },
            new ComparisonExplanation
            {
                Formula = "Duplicates(A) & Duplicates(B)",
                Description = "Barcode / List Scanning Duplicate Entries",
                ValueA = duplicateCountA,
                ValueB = duplicateCountB,
                ResultValue = duplicateCountA + duplicateCountB,
                VerificationNote = $"Found {duplicateCountA} duplicate scan instances in List A and {duplicateCountB} in List B."
            }
        };

        var sessionCode = $"REC-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid().ToString()[..6].ToUpper()}";

        var result = new ReconciliationComparisonResult
        {
            Title = title ?? "Physical Device Inventory Reconciliation",
            SessionCode = sessionCode,
            AuditDateUtc = DateTime.UtcNow,
            TotalRawA = totalRawA,
            TotalUniqueA = uniqueA.Count,
            DuplicateCountA = duplicateCountA,
            DuplicatesA = duplicatesA,
            TotalRawB = totalRawB,
            TotalUniqueB = uniqueB.Count,
            DuplicateCountB = duplicateCountB,
            DuplicatesB = duplicatesB,
            CommonCount = common.Count,
            CommonKeys = common,
            AbsentCount = absent.Count,
            AbsentKeys = absent,
            NewCount = newlyFound.Count,
            NewKeys = newlyFound,
            ExplainedReturnCount = explainedReturnCount,
            ExplainedReplaceCount = explainedReplaceCount,
            ExplainedTransferCount = explainedTransferCount,
            UnderInvestigationCount = underInvestigationCount,
            ConfirmedLostCount = confirmedLostCount,
            Items = resultItems,
            CalculationBreakdown = breakdown,
            BalanceReport = balanceReport
        };

        if (persistSession)
        {
            var session = new ReconciliationSession
            {
                SessionCode = sessionCode,
                Title = title ?? "Physical Device Inventory Reconciliation",
                AuditDateUtc = DateTime.UtcNow,
                Scope = "Full Company Mobile Fleet",
                ChecklistAName = checklistAName ?? "Previous Audit Checklist",
                ChecklistBName = checklistBName ?? "Latest Audit Checklist",
                TotalRawA = totalRawA,
                TotalUniqueA = uniqueA.Count,
                DuplicateCountA = duplicateCountA,
                TotalRawB = totalRawB,
                TotalUniqueB = uniqueB.Count,
                DuplicateCountB = duplicateCountB,
                CommonCount = common.Count,
                AbsentCount = absent.Count,
                NewCount = newlyFound.Count,
                ExplainedReturnCount = explainedReturnCount,
                ExplainedReplaceCount = explainedReplaceCount,
                ExplainedTransferCount = explainedTransferCount,
                UnderInvestigationCount = underInvestigationCount,
                ConfirmedLostCount = confirmedLostCount,
                CreatedByUserId = userId,
                CreatedByName = userName ?? "System Administrator",
                Notes = $"Audit performed on {_timeService.FormatColombo(_timeService.UtcNow)}. {absent.Count} absent devices evaluated against return and replacement movements.",
                CreatedAtUtc = DateTime.UtcNow
            };

            foreach (var item in resultItems)
            {
                session.Items.Add(new ReconciliationItem
                {
                    RawDeviceId = item.RawDeviceId,
                    NormalizedDeviceId = item.NormalizedDeviceId,
                    MatchedDeviceId = item.MatchedDeviceId,
                    DeviceName = item.DeviceName,
                    BrandModel = item.BrandModel,
                    IMEI = item.IMEI,
                    SerialNumber = item.SerialNumber,
                    PreviousEmployee = item.PreviousEmployee,
                    CurrentEmployee = item.CurrentEmployee,
                    PreviousStatus = item.PreviousStatus,
                    CurrentStatus = item.CurrentStatus,
                    PreviousLocation = item.PreviousLocation,
                    CurrentLocation = item.CurrentLocation,
                    LastReturnDateUtc = devByNormKeyOrNull(deviceByNormKey, item.NormalizedDeviceId)?.LastReturnDateUtc,
                    LastAssignmentDateUtc = devByNormKeyOrNull(deviceByNormKey, item.NormalizedDeviceId)?.LastAssignmentDateUtc,
                    LastVerifiedDateUtc = devByNormKeyOrNull(deviceByNormKey, item.NormalizedDeviceId)?.LastVerifiedDateUtc,
                    ReconciliationResult = item.ReconciliationResult,
                    InvestigationNotes = item.InvestigationNotes,
                    IsApproved = false,
                    CreatedAtUtc = DateTime.UtcNow
                });
            }

            _db.ReconciliationSessions.Add(session);
            await _db.SaveChangesAsync();
        }

        return result;
    }

    private static MobileDevice? devByNormKeyOrNull(Dictionary<string, MobileDevice> dict, string key)
    {
        return dict.TryGetValue(key, out var dev) ? dev : null;
    }

    // Section 9 Test Benchmark Data
    public static (string ListA, string ListB) GetSection9BenchmarkData()
    {
        var rawA = @"New 58
New 46
Cass 11
Pn 08
Pn 91
Pn 21
New 45
Pn 18
Cass 15
Pn 76
Pn 67
New 16
New 34
New 42
Ph 20
Pn 66
Pn 60
Pn 2
Pn 22
New 15
Pn 118
New 29
New 44
Pn 72
New 01
Cass 26
New 20
Pn 63
Pn 75
Pn 89
Cass 3
New 25
New 04
Pn 38
New 44
Pn 94
New 45
Pn 109
Pn 88
New 14
Pn 34
Pn 17
New 58
Pn 65
Cass 07
Pn 74
Pn 110
New 9
Ph 112
Pn 04
Pn 80
Pn 35
New 5
New 43
Pn 51
Cass 27
Pn 28
New 48
Pn 71
Pn 36
Pn 52
Pn 48
Cass 23
New 28
Pn 68
Pn 69
Pn 117
Pn 77
Pn 102
Pn 14";

        var rawB = @"New 46
Cass 11
Pn 91
Pn 08
Pn 21
New 45
Pn 18
New 52
Cass 15
New 42
Phone 67
New 34
New 16
Pn 76
Pn 72
Pn 60
Pn 2
New 44
New 29
Cass 26
New 01
Pn 22
Pn 20
New 15
Pn 118
New 20
Pn 63
New 25
Pn 38
New 4
Pn 109
Pn 89
New 45
Pn 109
Pn 108
Pn 33
New 14
Pn 88
Pn 34
Pn 51
Pn 65
Pn 74
Coss 7
Pn 110
New 9
Pn 112
Pn 94
Pn 04
Pn 80
New 43
New 5
Pn 35
Pn 69
Pn 6
Pn 117
Pn 77
New 61
New 51
Pn 71
New 48
Cass 27
Pn 28
Pn 36
Pn 68
Pn 102
Pn 14";

        return (rawA, rawB);
    }
}
