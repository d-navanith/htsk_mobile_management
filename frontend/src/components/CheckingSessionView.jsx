import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  Clock,
  Check,
  X,
  Search,
  Play,
  CheckCheck,
  Edit2,
  Trash2
} from 'lucide-react';
import { api } from '../api';

export default function CheckingSessionView({
  user,
  userPermissions,
  onSessionChange,
  onSaveAndExit
}) {
  const [activeSession, setActiveSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [tabFilter, setTabFilter] = useState('ALL'); // PENDING, CHECKED, ALL, LAST
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [startNotes, setStartNotes] = useState('');
  const [recentSessions, setRecentSessions] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [saveIndicator, setSaveIndicator] = useState('All changes saved');
  const [editingSession, setEditingSession] = useState(null);
  const [sessionForm, setSessionForm] = useState({ sessionStatus: 'Completed', notes: '' });

  const pageSize = 5;
  const canManageSessions =
    userPermissions?.checking_sessions !== undefined
      ? userPermissions.checking_sessions
      : user?.role === 'ITAdmin' || user?.role === 'Developer';
  const canStartSessions =
    userPermissions?.start_checking_sessions !== undefined
      ? userPermissions.start_checking_sessions
      : user?.role === 'ITAdmin' || user?.role === 'Developer';
  const canMarkAvailability =
    userPermissions?.mark_availability !== undefined
      ? userPermissions.mark_availability
      : user?.role === 'ITAdmin' || user?.role === 'Developer';
  const canEdit = canMarkAvailability;

  const loadSession = async () => {
    setLoading(true);
    setError('');
    try {
      const active = await api.getActiveSession();
      setActiveSession(active);
      if (active && active.devices?.length > 0 && !selectedGroup) {
        setSelectedGroup(active.devices[0].groupName);
      }
      const recents = await api.getRecentSessions(6);
      setRecentSessions(recents);
    } catch (err) {
      setError(err.message || 'Failed to load session');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSession();
  }, []);

  const handleStartSession = async () => {
    if (!canStartSessions) return;
    setSubmitting(true);
    setError('');
    try {
      await api.startSession(startNotes);
      setStartNotes('');
      await loadSession();
      if (onSessionChange) onSessionChange();
    } catch (err) {
      setError(err.message || 'Failed to start session');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecordCheck = async (deviceId, deviceStatus) => {
    if (!canEdit || !activeSession) return;
    setSaveIndicator('Saving...');
    try {
      await api.recordCheck(activeSession.sessionId, deviceId, deviceStatus, '');
      const updated = await api.getSession(activeSession.sessionId);
      setActiveSession(updated);
      setSaveIndicator('All changes saved');
      if (onSessionChange) onSessionChange();
    } catch (err) {
      setError(err.message || 'Failed to record check');
      setSaveIndicator('Error saving');
    }
  };

  const handleMarkGroupAvailable = async (groupName, groupDevices) => {
    if (!canEdit || !activeSession) return;
    const checks = groupDevices.map((d) => ({
      deviceId: d.deviceId,
      deviceStatus: 'Available',
      notes: `Verified in ${groupName}`
    }));

    setSubmitting(true);
    setSaveIndicator('Saving...');
    try {
      await api.recordBatchCheck(activeSession.sessionId, checks);
      const updated = await api.getSession(activeSession.sessionId);
      setActiveSession(updated);
      setSaveIndicator('All changes saved');
      if (onSessionChange) onSessionChange();
    } catch (err) {
      setError(err.message || 'Failed to batch check');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCompleteSession = async () => {
    if (!canStartSessions || !activeSession) return;
    if (activeSession.uncheckedCount > 0) {
      const ok = window.confirm(
        `There are ${activeSession.uncheckedCount} unchecked phones remaining. Complete this session anyway?`
      );
      if (!ok) return;
    }

    setSubmitting(true);
    try {
      await api.completeSession(activeSession.sessionId, '');
      await loadSession();
      if (onSessionChange) onSessionChange();
    } catch (err) {
      setError(err.message || 'Failed to complete session');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEditSession = (s) => {
    setEditingSession(s);
    setSessionForm({
      sessionStatus: s.sessionStatus || 'Completed',
      notes: s.notes || ''
    });
  };

  const handleUpdateSession = async (e) => {
    e.preventDefault();
    if (!editingSession) return;
    try {
      await api.updateSession(editingSession.sessionId, sessionForm);
      setEditingSession(null);
      await loadSession();
      if (onSessionChange) onSessionChange();
    } catch (err) {
      setError(err.message || 'Failed to update session');
    }
  };

  const handleDeleteSession = async (s) => {
    if (!window.confirm(`Delete Checking Session #${s.sessionId} and its check records?`)) return;
    try {
      await api.deleteSession(s.sessionId);
      await loadSession();
      if (onSessionChange) onSessionChange();
    } catch (err) {
      setError(err.message || 'Failed to delete session');
    }
  };

  const renderRecentSessionsTable = () => {
    if (!recentSessions || recentSessions.length === 0) return null;
    return (
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-900">
            Recent checking sessions
          </h3>
          <span className="text-[11px] text-slate-400">
            {recentSessions.length} sessions
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="text-left text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                <th className="py-2.5 pr-4">SESSION ID</th>
                <th className="py-2.5 px-4">STARTED (COLOMBO)</th>
                <th className="py-2.5 px-4">COMPLETED</th>
                <th className="py-2.5 px-4">STARTED BY</th>
                <th className="py-2.5 px-4">CHECKED</th>
                <th className="py-2.5 px-4">AVAILABLE / MISSING</th>
                <th className="py-2.5 px-4">STATUS</th>
                {canManageSessions && <th className="py-2.5 pl-4 text-right">ACTIONS</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentSessions.map((s) => (
                <tr key={s.sessionId} className="hover:bg-slate-50/70">
                  <td className="py-3 pr-4 font-mono font-bold text-slate-800">
                    CHK-2026-1114-{String(s.sessionId).padStart(2, '0')}
                    {s.notes && (
                      <div className="text-[10px] font-sans font-normal text-slate-400 truncate max-w-[160px]">
                        {s.notes}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4 text-slate-600">{s.startedAtColombo}</td>
                  <td className="py-3 px-4 text-slate-500">
                    {s.completedAtColombo || '—'}
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-800">
                    {s.startedByAdmin}
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-700">
                    {s.checkedCount} / {s.totalDevices}
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-emerald-700 font-semibold">
                      {s.availableCount} avail
                    </span>
                    {' · '}
                    <span className="text-rose-600 font-semibold">
                      {s.missingCount} missing
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                      <span>{s.sessionStatus}</span>
                    </span>
                  </td>
                  {canManageSessions && (
                    <td className="py-3 pl-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center space-x-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEditSession(s)}
                          title={`Edit session #${s.sessionId}`}
                          className="p-1.5 text-slate-400 hover:text-[#1e4e8c] hover:bg-blue-50 rounded-lg transition"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSession(s)}
                          title={`Delete session #${s.sessionId}`}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderEditSessionModal = () => {
    if (!editingSession) return null;
    return (
      <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden">
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">
              Edit Session #{editingSession.sessionId}
            </h3>
            <button
              type="button"
              onClick={() => setEditingSession(null)}
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <form onSubmit={handleUpdateSession} className="p-6 space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Session Status
              </label>
              <select
                value={sessionForm.sessionStatus}
                onChange={(e) =>
                  setSessionForm({ ...sessionForm, sessionStatus: e.target.value })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-800"
              >
                <option value="InProgress">InProgress</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Session Notes
              </label>
              <input
                type="text"
                placeholder="Optional session notes"
                value={sessionForm.notes}
                onChange={(e) =>
                  setSessionForm({ ...sessionForm, notes: e.target.value })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800"
              />
            </div>
            <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setEditingSession(null)}
                className="px-4 py-2 border border-slate-300 rounded-lg font-semibold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-[#1e4e8c] hover:bg-[#163b6b] text-white rounded-lg font-semibold"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const formatShortTime = (colomboStr) => {
    if (!colomboStr || colomboStr === '-') return '2:00 PM';
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

  if (loading) {
    return (
      <div className="p-12 text-center text-xs text-slate-500">
        Loading checking session...
      </div>
    );
  }

  // --- WHEN NO ACTIVE SESSION IS IN PROGRESS ---
  if (!activeSession) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="text-[11px] font-bold tracking-wider uppercase text-[#1d4ed8]">
              CHECKING SESSIONS
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mt-0.5">
              2-Hour Device Checking
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Start a manual checking session to physically verify every company mobile phone.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center max-w-xl mx-auto shadow-2xs">
          <div className="w-12 h-12 rounded-2xl bg-[#edf4ff] text-[#1e4e8c] flex items-center justify-center mx-auto mb-3">
            <Clock className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">
            Ready for the next 2-hour inspection
          </h2>
          <p className="text-xs text-slate-500 mt-1.5 max-w-md mx-auto leading-relaxed">
            Inspect mobile phones group by group and record whether each phone is physically Available or Missing in Colombo Standard Time.
          </p>

          {canStartSessions ? (
            <div className="mt-5 space-y-3 max-w-sm mx-auto">
              <input
                type="text"
                placeholder="Optional session notes (e.g. Afternoon 2:00 PM check)"
                value={startNotes}
                onChange={(e) => setStartNotes(e.target.value)}
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1e4e8c]"
              />
              <button
                type="button"
                onClick={handleStartSession}
                disabled={submitting}
                className="w-full inline-flex items-center justify-center space-x-2 py-2.5 px-5 bg-[#1e4e8c] hover:bg-[#163b6b] text-white font-semibold text-xs rounded-xl shadow-xs transition disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>
                  {submitting ? 'Starting session...' : 'Start 2-hour checking session'}
                </span>
              </button>
            </div>
          ) : (
            <div className="mt-4 p-3 bg-slate-50 rounded-xl text-xs text-slate-500">
              No session is currently active. IT Admins start checking sessions every 2 hours.
            </div>
          )}
        </div>

        {renderRecentSessionsTable()}
        {renderEditSessionModal()}
      </div>
    );
  }

  // --- WHEN A CHECKING SESSION IS ACTIVE (MATCHING IMAGE 1) ---
  const devices = activeSession.devices || [];
  const groupsMap = {};
  devices.forEach((d) => {
    if (!groupsMap[d.groupName]) {
      groupsMap[d.groupName] = [];
    }
    groupsMap[d.groupName].push(d);
  });

  const groupNames = Object.keys(groupsMap);
  const activeGroupName =
    selectedGroup && groupsMap[selectedGroup]
      ? selectedGroup
      : groupNames[0] || 'All Groups';

  const currentGroupDevices = groupsMap[activeGroupName] || [];
  const groupCheckedCount = currentGroupDevices.filter((d) => d.isCheckedInSession).length;
  const groupPendingCount = currentGroupDevices.length - groupCheckedCount;
  const groupAvailCount = currentGroupDevices.filter(
    (d) => d.checkedStatus === 'Available'
  ).length;
  const groupMissingCount = currentGroupDevices.filter(
    (d) => d.checkedStatus === 'Missing'
  ).length;

  // Filter current group's devices by tab and search
  const filteredGroupDevices = currentGroupDevices.filter((d) => {
    if (tabFilter === 'PENDING' && d.isCheckedInSession) return false;
    if (tabFilter === 'CHECKED' && !d.isCheckedInSession) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const matchCode = d.mobileCode.toLowerCase().includes(q);
      const matchName = (d.mobileName || '').toLowerCase().includes(q);
      const matchModel = (d.model || '').toLowerCase().includes(q);
      const matchBrand = (d.brand || '').toLowerCase().includes(q);
      if (!matchCode && !matchName && !matchModel && !matchBrand) return false;
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredGroupDevices.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const paginatedDevices = filteredGroupDevices.slice(
    startIndex,
    startIndex + pageSize
  );

  const percentChecked =
    activeSession.totalExpectedDevices > 0
      ? Math.round(
          (activeSession.checkedCount / activeSession.totalExpectedDevices) * 100
        )
      : 0;

  const sessionCode = `CHK-2026-1114-${String(activeSession.sessionId).padStart(2, '0')}`;

  return (
    <div className="space-y-5">
      {/* Top Page Title & Save/Exit */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-[11px] font-bold tracking-wider uppercase text-[#1d4ed8]">
            CHECKING SESSIONS / {sessionCode}
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-0.5">
            Active checking
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Physically inspect each phone, then record its status.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <span className="text-xs font-medium text-emerald-700 flex items-center space-x-1">
            <Check className="w-3.5 h-3.5" />
            <span>{saveIndicator}</span>
          </span>
          {onSaveAndExit && (
            <button
              type="button"
              onClick={onSaveAndExit}
              className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 shadow-2xs transition"
            >
              Save &amp; exit
            </button>
          )}
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700"
        >
          {error}
        </div>
      )}

      {/* Session Summary Banner Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center space-x-3">
            <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#edf4ff] text-[#1d4ed8]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#1d4ed8]" />
              <span>IN PROGRESS</span>
            </span>
            <span className="text-xs font-bold text-slate-900">
              Today, {formatShortTime(activeSession.startedAtColombo)} session
            </span>
            <span className="text-xs text-slate-400">
              Started by {activeSession.startedByAdmin}
            </span>
          </div>

          <div className="flex items-center space-x-1.5 text-xs text-slate-500">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>2-Hour Cycle (SLST)</span>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <span className="text-2xl font-extrabold text-slate-900">
              {activeSession.checkedCount} / {activeSession.totalExpectedDevices}
            </span>
            <span className="text-xs text-slate-400 ml-1.5">phones checked</span>
          </div>

          <div className="flex items-center space-x-4 text-xs font-semibold">
            <span className="text-emerald-700">
              {activeSession.availableCount} Available
            </span>
            <span className="text-rose-600">{activeSession.missingCount} Missing</span>
            <span className="text-amber-600">
              {activeSession.uncheckedCount} Pending
            </span>
            <span className="text-sm font-extrabold text-slate-900">
              {percentChecked}%
            </span>
          </div>
        </div>

        <div className="mt-2.5 w-full bg-slate-100 rounded-full h-2 overflow-hidden">
          <div
            className="bg-[#1e4e8c] h-full rounded-full transition-all duration-300"
            style={{ width: `${percentChecked}%` }}
          />
        </div>
      </div>

      {/* 2-Column Master-Detail Checking Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Groups Panel (3 cols) */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-bold text-slate-900">Groups</h2>
            <span className="text-[11px] text-slate-400">
              {groupNames.length} total
            </span>
          </div>

          <div className="space-y-1.5">
            {groupNames.map((gName) => {
              const gDevs = groupsMap[gName];
              const gTotal = gDevs.length;
              const gChecked = gDevs.filter((d) => d.isCheckedInSession).length;
              const gRem = gTotal - gChecked;
              const gPct = gTotal > 0 ? Math.round((gChecked / gTotal) * 100) : 0;
              const isSelected = gName === activeGroupName;
              const isComp = gTotal > 0 && gRem === 0;

              return (
                <button
                  type="button"
                  key={gName}
                  onClick={() => {
                    setSelectedGroup(gName);
                    setCurrentPage(1);
                  }}
                  className={`w-full text-left p-3 rounded-xl transition ${
                    isSelected
                      ? 'bg-[#f0f6ff] border border-[#bfdbfe]'
                      : 'hover:bg-slate-50 border border-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span
                      className={`font-bold truncate ${
                        isSelected ? 'text-[#1e4e8c]' : 'text-slate-800'
                      }`}
                    >
                      {gName}
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium">
                      {gChecked}/{gTotal}
                    </span>
                  </div>

                  <div className="mt-2 w-full bg-slate-200/70 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        isComp ? 'bg-emerald-600' : 'bg-[#1e4e8c]'
                      }`}
                      style={{ width: `${gPct}%` }}
                    />
                  </div>

                  <div
                    className={`mt-1.5 text-[10px] font-medium ${
                      isComp ? 'text-emerald-700' : 'text-slate-400'
                    }`}
                  >
                    {isComp ? 'Completed' : `${gRem} remaining`}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Quick Reminder Callout */}
          <div className="bg-[#f4f7fb] rounded-xl p-3.5 border border-slate-200/60 mt-4">
            <div className="text-xs font-bold text-slate-800">
              A quick reminder
            </div>
            <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
              Only mark Available when you can physically confirm the phone is present.
            </p>
          </div>
        </div>

        {/* Right Selected Group Inspection Panel (9 cols) */}
        <div className="lg:col-span-9 bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-6 shadow-2xs">
          {/* Group Header & Search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                {activeGroupName}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {groupCheckedCount} of {currentGroupDevices.length} checked ·{' '}
                {groupAvailCount} available · {groupMissingCount} missing
              </p>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-initial">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="search"
                  placeholder="Search Mobile ID or device..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full sm:w-56 pl-8 pr-3 py-2 sm:py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1e4e8c]"
                />
              </div>

              {canEdit && groupPendingCount > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    handleMarkGroupAvailable(activeGroupName, currentGroupDevices)
                  }
                  disabled={submitting}
                  title="Mark all phones in this group Available"
                  className="px-3 py-2 sm:py-1.5 bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-200 rounded-lg text-xs font-semibold transition flex items-center space-x-1 shrink-0"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span className="hidden xl:inline">Mark group available</span>
                </button>
              )}
            </div>
          </div>

          {/* Filter Tabs */}
          <div
            role="tablist"
            aria-label="Filter group phones"
            className="mt-4 flex items-center space-x-2 border-b border-slate-100 pb-3 text-xs overflow-x-auto"
          >
            {[
              { id: 'PENDING', label: `Pending ${groupPendingCount}` },
              { id: 'CHECKED', label: `Checked ${groupCheckedCount}` },
              { id: 'ALL', label: `All phones ${currentGroupDevices.length}` }
            ].map((t) => {
              const isSelected = tabFilter === t.id;
              return (
                <button
                  type="button"
                  role="tab"
                  key={t.id}
                  aria-selected={isSelected}
                  onClick={() => {
                    setTabFilter(t.id);
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap border-b-2 transition ${
                    isSelected
                      ? 'bg-[#edf4ff] text-[#1d4ed8] border-[#1d4ed8]'
                      : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>

          {/* Device Rows */}
          <div className="divide-y divide-slate-100">
            {paginatedDevices.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-400">
                No phones match the current filter in {activeGroupName}.
              </div>
            ) : (
              paginatedDevices.map((device) => {
                const isChecked = device.isCheckedInSession;
                const isAvail = device.checkedStatus === 'Available';
                const isMiss = device.checkedStatus === 'Missing';

                return (
                  <div
                    key={device.deviceId}
                    className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 sm:gap-4"
                  >
                    <div className="flex items-start space-x-3 sm:space-x-3.5 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-[#f0f6ff] border border-[#dbeafe] text-[#1e4e8c] flex items-center justify-center shrink-0 mt-0.5">
                        <Smartphone className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                          <span className="text-xs font-extrabold text-slate-900">
                            {device.mobileCode}
                          </span>
                          <span className="text-xs text-slate-500 font-medium truncate">
                            {device.model || device.mobileName || 'Company Phone'}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5 truncate">
                          {device.description ||
                            `${device.brand || 'Corporate'} · ${device.groupName}`}
                        </div>
                        {device.previouslyMissing ? (
                          <div className="text-[11px] font-medium text-rose-600 mt-0.5">
                            Previously missing · Missing again triggers a high-priority alert
                          </div>
                        ) : (
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {device.lastSessionSummary ||
                              'Last session: Verified Available'}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right Action Buttons (Full width 50/50 on mobile, fixed width on sm+) */}
                    {canEdit ? (
                      <div className="flex items-center gap-2 sm:space-x-2.5 w-full sm:w-auto shrink-0">
                        <button
                          type="button"
                          onClick={() =>
                            handleRecordCheck(device.deviceId, 'Available')
                          }
                          className={`flex-1 sm:flex-initial sm:min-w-[112px] py-2.5 sm:py-2 px-4 rounded-lg text-xs font-semibold inline-flex items-center justify-center space-x-1.5 transition ${
                            isChecked && isAvail
                              ? 'bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-200'
                              : 'bg-[#e8f5ee] hover:bg-[#d1fae5] text-[#15803d]'
                          }`}
                        >
                          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>Available</span>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handleRecordCheck(device.deviceId, 'Missing')
                          }
                          className={`flex-1 sm:flex-initial sm:min-w-[112px] py-2.5 sm:py-2 px-4 rounded-lg text-xs font-semibold inline-flex items-center justify-center space-x-1.5 transition ${
                            isChecked && isMiss
                              ? 'bg-rose-600 text-white shadow-xs ring-2 ring-rose-200'
                              : 'bg-[#fdecec] hover:bg-[#fee2e2] text-[#b91c1c]'
                          }`}
                        >
                          <X className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>Missing</span>
                        </button>
                      </div>
                    ) : (
                      <div className="shrink-0">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                            !isChecked
                              ? 'bg-amber-50 text-amber-700'
                              : isAvail
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-rose-50 text-rose-700'
                          }`}
                        >
                          {!isChecked ? 'Pending' : device.checkedStatus}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Pagination Footer */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-400">
            <span>
              Showing{' '}
              {filteredGroupDevices.length === 0 ? 0 : startIndex + 1}–
              {Math.min(startIndex + pageSize, filteredGroupDevices.length)} of{' '}
              {filteredGroupDevices.length} phones
            </span>

            <div className="flex items-center space-x-3">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="text-slate-500 hover:text-slate-800 disabled:opacity-40 font-medium"
              >
                &lt; Previous
              </button>
              <span className="font-bold text-slate-700">
                {safePage} / {totalPages}
              </span>
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="text-[#1e4e8c] hover:underline disabled:opacity-40 font-semibold"
              >
                Next &gt;
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Sticky/Action Bar */}
      <div className="pt-2 border-t border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="text-xs font-bold text-slate-700">
            Your progress is saved automatically.
          </div>
          <div className="text-[11px] text-slate-400">
            Check all {activeSession.totalExpectedDevices} phones before completing this session.
          </div>
        </div>

        {canStartSessions && (
          <button
            type="button"
            onClick={handleCompleteSession}
            disabled={submitting}
            className={`w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-semibold transition ${
              activeSession.uncheckedCount === 0
                ? 'bg-[#1e4e8c] hover:bg-[#163b6b] text-white shadow-sm'
                : 'bg-slate-200/80 hover:bg-slate-300/80 text-slate-600'
            }`}
          >
            Complete session
          </button>
        )}
      </div>

      {renderRecentSessionsTable()}
      {renderEditSessionModal()}
    </div>
  );
}
