import React from 'react';
import {
  ArrowUpRight,
  Check,
  AlertCircle,
  LayoutGrid,
  ArrowRight
} from 'lucide-react';

export default function DashboardView({
  dashboard,
  user,
  userPermissions,
  onNavigateToChecking,
  onNavigateToIncidents,
  onNavigateToGroups,
  onNavigateToReports,
  onNavigateToHistory,
  onStartSession
}) {
  if (!dashboard) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-500 text-xs">
        Loading workspace dashboard...
      </div>
    );
  }

  const {
    totalDevices = 0,
    availableDevices = 0,
    missingDevices = 0,
    totalGroups = 0,
    latestSession,
    uncheckedInCurrentSession = 0,
    repeatedMissingAlertCount = 0,
    highPriorityAlerts,
    nextSessionDueColomboTime,
    groupProgress,
    recentActivities,
    activeIncidentsCount = 0
  } = dashboard;

  const safeHighPriorityAlerts = Array.isArray(highPriorityAlerts) ? highPriorityAlerts : [];
  const safeGroupProgress = Array.isArray(groupProgress) ? groupProgress : [];
  const safeRecentActivities = Array.isArray(recentActivities) ? recentActivities : [];

  const availPct =
    totalDevices > 0 ? ((availableDevices / totalDevices) * 100).toFixed(1) : '100.0';

  const isSessionActive = latestSession?.sessionStatus === 'InProgress';
  const canManageSessions =
    userPermissions?.start_checking_sessions !== undefined
      ? userPermissions.start_checking_sessions
      : user?.role === 'ITAdmin' || user?.role === 'Developer';

  const sessionChecked = latestSession?.checkedCount ?? 0;
  const sessionTotal = latestSession?.totalDevices ?? totalDevices ?? 0;
  const sessionAvail = latestSession?.availableCount ?? 0;
  const sessionMissing = latestSession?.missingCount ?? 0;
  const sessionPending = isSessionActive
    ? uncheckedInCurrentSession
    : Math.max(0, sessionTotal - sessionChecked);
  const sessionPct =
    sessionTotal > 0 ? Math.round((sessionChecked / sessionTotal) * 100) : 0;

  const sessionCode = latestSession
    ? `CHK-${String(latestSession.sessionId).padStart(2, '0')}`
    : '';

  // Format Colombo date string for top right
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const colomboNow = new Date(utc + 3600000 * 5.5);
  const formattedDate = colomboNow.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  const formatShortTime = (colomboStr) => {
    if (!colomboStr || colomboStr === '-') return '—';
    const parts = colomboStr.split(' ');
    if (parts.length >= 2) {
      const [hh, mm] = parts[1].split(':');
      const h = parseInt(hh, 10);
      if (!isNaN(h)) {
        const suffix = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 || 12;
        return `${h12}:${mm} ${suffix}`;
      }
    }
    return colomboStr;
  };

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="text-[11px] font-bold tracking-wider uppercase text-[#1d4ed8]">
            WORKSPACE OVERVIEW
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-0.5">Dashboard</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            A clear picture of every company phone.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <span className="text-xs text-slate-500 font-medium">{formattedDate}</span>
          <button
            type="button"
            onClick={onNavigateToReports}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 shadow-2xs transition"
          >
            View reports
          </button>
        </div>
      </div>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total phones */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Total phones</span>
            <ArrowUpRight className="w-4 h-4 text-slate-700" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 mt-2">
            {totalDevices}
          </div>
          <div className="text-[11px] text-slate-400 mt-2">
            Across your entire organization
          </div>
        </div>

        {/* Available */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Available</span>
            <Check className="w-4 h-4 text-emerald-600 stroke-[2.5]" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 mt-2">
            {availableDevices}
          </div>
          <div className="text-[11px] text-slate-400 mt-2">
            {availPct}% of registered phones
          </div>
        </div>

        {/* Missing */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Missing</span>
            <span className="text-rose-600 font-extrabold text-sm">!</span>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 mt-2">
            {missingDevices}
          </div>
          <div className="text-[11px] text-rose-600 font-medium mt-2">
            {repeatedMissingAlertCount > 0
              ? `${repeatedMissingAlertCount} need immediate attention`
              : missingDevices > 0
              ? `${missingDevices} currently missing`
              : '0 need immediate attention'}
          </div>
        </div>

        {/* Active groups */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Active groups</span>
            <LayoutGrid className="w-4 h-4 text-slate-500" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 mt-2">
            {totalGroups}
          </div>
          <div className="text-[11px] text-slate-400 mt-2">
            All groups included in checks
          </div>
        </div>
      </div>

      {/* Middle Row: Current Checking Session (2/3) + Needs Your Attention (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Current Checking Session Card */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/90 p-6 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Current checking session
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {latestSession
                    ? `${sessionCode} · Started at ${formatShortTime(latestSession.startedAtColombo)} by ${latestSession.startedByAdmin}`
                    : 'No active session started yet'}
                </p>
              </div>

              <span
                className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                  isSessionActive
                    ? 'bg-[#edf4ff] text-[#1d4ed8]'
                    : 'bg-emerald-50 text-emerald-700'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isSessionActive ? 'bg-[#1d4ed8]' : 'bg-emerald-600'
                  }`}
                />
                <span>
                  {isSessionActive
                    ? 'In progress'
                    : latestSession?.sessionStatus || 'Ready'}
                </span>
              </span>
            </div>

            {/* Big Number + Percentage */}
            <div className="mt-5 flex items-baseline justify-between">
              <div>
                <span className="text-3xl font-extrabold text-slate-900">
                  {sessionChecked}
                </span>
                <span className="text-xs text-slate-400 ml-1.5">
                  / {sessionTotal} phones checked
                </span>
              </div>
              <span className="text-sm font-bold text-[#1d4ed8]">{sessionPct}%</span>
            </div>

            {/* Progress Bar */}
            <div className="mt-2.5 w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div
                className="bg-[#1e4e8c] h-full rounded-full transition-all duration-300"
                style={{ width: `${sessionPct}%` }}
              />
            </div>

            {/* Counts + Continue Checking Button */}
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center space-x-4 text-xs font-semibold">
                <span className="text-emerald-700">{sessionAvail} available</span>
                <span className="text-rose-600">{sessionMissing} missing</span>
                <span className="text-amber-600">{sessionPending} pending</span>
              </div>

              {isSessionActive ? (
                <button
                  type="button"
                  onClick={onNavigateToChecking}
                  className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-[#1e4e8c] hover:bg-[#163b6b] text-white text-xs font-semibold shadow-xs transition"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  <span>Continue checking</span>
                </button>
              ) : canManageSessions ? (
                <button
                  type="button"
                  onClick={onStartSession}
                  className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-[#1e4e8c] hover:bg-[#163b6b] text-white text-xs font-semibold shadow-xs transition"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  <span>Start 2-hour check</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onNavigateToChecking}
                  className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-[#1e4e8c] hover:bg-[#163b6b] text-white text-xs font-semibold shadow-xs transition"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  <span>View session</span>
                </button>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-400">
            {nextSessionDueColomboTime
              ? `Next scheduled check at ${formatShortTime(nextSessionDueColomboTime)} · Checks are started manually`
              : 'Checks are started manually every 2 hours'}
          </div>
        </div>

        {/* Needs Your Attention Card */}
        <div className="bg-white rounded-2xl border border-rose-200/80 p-6 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">
                Needs your attention
              </h2>
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600">
                {repeatedMissingAlertCount} HIGH PRIORITY
              </span>
            </div>
            <p className="text-xs font-medium text-rose-600 mt-1">
              Missing in 2 consecutive sessions
            </p>

            <div className="mt-4 divide-y divide-slate-100">
              {safeHighPriorityAlerts.length === 0 ? (
                <div className="py-6 text-xs text-slate-400">
                  No devices are currently missing across consecutive sessions.
                </div>
              ) : (
                safeHighPriorityAlerts.slice(0, 3).map((inc) => (
                  <div
                    key={inc.incidentId}
                    className="py-3 flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-900">
                        {inc.mobileCode}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {inc.mobileName || 'Company Phone'} · {inc.groupName}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={onNavigateToIncidents}
                      className="text-xs font-semibold text-[#1e4e8c] hover:underline"
                    >
                      Review →
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onNavigateToIncidents}
              className="text-xs font-semibold text-[#1e4e8c] hover:underline"
            >
              View all {activeIncidentsCount || missingDevices} missing incidents →
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Row: Checking progress by group (2/3) + Recent activity (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Checking progress by group */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/90 p-6 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <h2
              id="group-progress-heading"
              className="text-base font-bold text-slate-900"
            >
              Checking progress by group
            </h2>
            <button
              type="button"
              onClick={onNavigateToGroups}
              className="text-xs font-semibold text-[#1e4e8c] hover:underline"
            >
              View groups →
            </button>
          </div>

          <div
            tabIndex={0}
            role="region"
            aria-labelledby="group-progress-heading"
            className="overflow-x-auto focus:outline-none"
          >
            <table className="min-w-full text-xs">
              <thead>
                <tr className="text-left text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                  <th className="py-2.5 pr-4">GROUP</th>
                  <th className="py-2.5 px-4">CHECKED</th>
                  <th className="py-2.5 px-4 w-48">PROGRESS</th>
                  <th className="py-2.5 pl-4 text-right sm:text-left">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {safeGroupProgress.map((gp) => {
                  const pct =
                    gp.totalDevices > 0
                      ? Math.round((gp.checkedCount / gp.totalDevices) * 100)
                      : 0;
                  const isComp = gp.status === 'Completed';
                  const isProg = gp.status === 'In progress';

                  return (
                    <tr key={gp.groupId} className="hover:bg-slate-50/60">
                      <th
                        scope="row"
                        className="py-3.5 pr-4 font-semibold text-slate-800 text-left whitespace-nowrap"
                      >
                        {gp.groupName}
                      </th>
                      <td className="py-3.5 px-4 text-slate-500 font-medium whitespace-nowrap">
                        {gp.checkedCount} / {gp.totalDevices}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              isComp ? 'bg-emerald-600' : 'bg-[#1e4e8c]'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </td>
                      <td className="py-3.5 pl-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                            isComp
                              ? 'bg-emerald-50 text-emerald-700'
                              : isProg
                              ? 'bg-[#edf4ff] text-[#1d4ed8]'
                              : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isComp
                                ? 'bg-emerald-600'
                                : isProg
                                ? 'bg-[#1d4ed8]'
                                : 'bg-amber-500'
                            }`}
                          />
                          <span>{gp.status}</span>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent activity */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-900">Recent activity</h2>
              <button
                type="button"
                onClick={onNavigateToHistory}
                className="text-xs font-semibold text-[#1e4e8c] hover:underline"
              >
                View all →
              </button>
            </div>

            <div className="space-y-4">
              {safeRecentActivities.length === 0 ? (
                <div className="py-6 text-xs text-slate-400">
                  No recent checking activity recorded yet.
                </div>
              ) : (
                safeRecentActivities.map((act) => {
                  const dotColor =
                    act.type === 'available'
                      ? 'bg-emerald-600'
                      : act.type === 'missing'
                      ? 'bg-rose-600'
                      : 'bg-[#1e4e8c]';

                  return (
                    <div key={act.id} className="flex items-start space-x-3">
                      <span
                        className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${dotColor}`}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-slate-800 truncate">
                          {act.title}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">
                          {act.subtitle}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {act.timeColombo}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Caption Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-slate-400 pt-1">
        <span>
          Inventory totals reflect the latest recorded status. Session progress reflects today&apos;s check.
        </span>
        <span>All times in Asia/Colombo (SLST UTC+05:30)</span>
      </div>
    </div>
  );
}
