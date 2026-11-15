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
  Trash2,
  CreditCard,
  UserCheck
} from 'lucide-react';
import { api } from '../api';

export default function CheckingSessionView({
  user,
  userPermissions,
  permissionDetails,
  onSessionChange,
  onSaveAndExit
}) {
  const [activeSession, setActiveSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('ALL_GROUPS');
  const [tabFilter, setTabFilter] = useState('ALL'); // PENDING, CHECKED, ALL, LAST
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [startNotes, setStartNotes] = useState('');
  const [recentSessions, setRecentSessions] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [saveIndicator, setSaveIndicator] = useState('All changes saved');
  const [editingSession, setEditingSession] = useState(null);
  const [sessionForm, setSessionForm] = useState({ sessionStatus: 'Completed', notes: '' });

  const pageSize = 10;
  const canManageSessions =
    user?.role === 'Developer' ||
    (user?.role === 'Employee' && Boolean(permissionDetails?.checking_sessions?.employeeCanEdit));
  const canStartSessions =
    user?.role === 'Developer' ||
    user?.role === 'ITAdmin' ||
    Boolean(userPermissions?.start_checking_sessions);
  const canMarkAvailability =
    user?.role === 'Developer' ||
    user?.role === 'ITAdmin' ||
    Boolean(userPermissions?.mark_availability);
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
        `There are ${activeSession.uncheckedCount} unverified devices remaining. Completing the session now will automatically identify and mark those ${activeSession.uncheckedCount} unverified devices as MISSING for investigation. Proceed?`
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

        <div className="bg-white rounded-[28px] border-2 border-slate-100 p-8 text-center max-w-xl mx-auto shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-[#c8f53b]/30 text-[#1a6e3c] flex items-center justify-center mx-auto mb-3.5">
            <Clock className="w-7 h-7 stroke-[2.2]" />
          </div>
          <h2 className="text-xl font-extrabold text-slate-950">
            Ready for the next 2-hour physical inspection
          </h2>
          <p className="text-xs text-slate-500 mt-1.5 max-w-md mx-auto leading-relaxed">
            Inspect mobile phones group by group and record whether each device is physically Available (FOUND) or Missing in Colombo Standard Time.
          </p>

          {canStartSessions ? (
            <div className="mt-5 space-y-3 max-w-sm mx-auto">
              <input
                type="text"
                placeholder="Optional session notes (e.g. Afternoon 2:00 PM check)"
                value={startNotes}
                onChange={(e) => setStartNotes(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#68c73a]"
              />
              <button
                type="button"
                onClick={handleStartSession}
                disabled={submitting}
                className="w-full inline-flex items-center justify-center space-x-2 py-3.5 px-6 bg-[#c8f53b] hover:bg-[#b8e629] text-slate-950 font-extrabold text-sm rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
              >
                <Play className="w-4 h-4 fill-slate-950" />
                <span>
                  {submitting ? 'Starting session...' : 'START 2-HOUR CHECKING SESSION'}
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

  // --- WHEN A CHECKING SESSION IS ACTIVE ---
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
    selectedGroup === 'ALL_GROUPS'
      ? 'ALL_GROUPS'
      : selectedGroup && groupsMap[selectedGroup]
      ? selectedGroup
      : 'ALL_GROUPS';

  const currentGroupDevices =
    activeGroupName === 'ALL_GROUPS'
      ? devices
      : groupsMap[activeGroupName] || [];
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
      const matchCode = (d.mobileCode || '').toLowerCase().includes(q);
      const matchName = (d.mobileName || '').toLowerCase().includes(q);
      const matchModel = (d.model || '').toLowerCase().includes(q);
      const matchBrand = (d.brand || '').toLowerCase().includes(q);
      const matchBank = ((d.bankAccountName || d.phoneNumber) || '').toLowerCase().includes(q);
      const matchEmployee = (d.assignedEmployeeName || '').toLowerCase().includes(q);
      const matchImei = (d.imei || '').toLowerCase().includes(q);
      if (!matchCode && !matchName && !matchModel && !matchBrand && !matchBank && !matchEmployee && !matchImei) return false;
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
          <div className="text-[11px] font-bold tracking-wider uppercase text-[#1a6e3c]">
            PHYSICAL VERIFICATION / {sessionCode}
          </div>
          <h1 className="text-2xl sm:text-[28px] font-extrabold text-slate-950 mt-0.5 tracking-tight">
            Active Checking Session
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Physically inspect each device against the registered fleet, then record whether it is FOUND or Missing.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <span className="text-xs font-bold text-emerald-800 flex items-center space-x-1 px-2.5 py-1 rounded-full bg-emerald-100">
            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>{saveIndicator}</span>
          </span>
          {onSaveAndExit && (
            <button
              type="button"
              onClick={onSaveAndExit}
              className="px-4 py-2 bg-white hover:bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-bold text-slate-900 shadow-2xs transition cursor-pointer"
            >
              Save &amp; Exit
            </button>
          )}
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-semibold text-rose-700"
        >
          {error}
        </div>
      )}

      {/* Session Summary Banner Card */}
      <div className="bg-white rounded-[28px] border-2 border-slate-100 p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center space-x-3">
            <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-[#c8f53b] text-slate-950">
              <span className="w-2 h-2 rounded-full bg-emerald-800" />
              <span>IN PROGRESS</span>
            </span>
            <span className="text-xs font-extrabold text-slate-950">
              Today, {formatShortTime(activeSession.startedAtColombo)} session
            </span>
            <span className="text-xs text-slate-400">
              Started by {activeSession.startedByAdmin}
            </span>
          </div>

          <div className="flex items-center space-x-1.5 text-xs text-slate-500 font-medium">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>2-Hour Physical Inspection Cycle</span>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <span className="text-3xl font-black text-slate-950">
              {activeSession.checkedCount} / {activeSession.totalExpectedDevices}
            </span>
            <span className="text-xs text-slate-400 ml-2 font-medium">devices verified</span>
          </div>

          <div className="flex items-center space-x-4 text-xs font-bold">
            <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-900">
              {activeSession.availableCount} FOUND
            </span>
            <span className="px-2.5 py-1 rounded-full bg-rose-100 text-rose-900">
              {activeSession.missingCount} Missing
            </span>
            <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
              {activeSession.uncheckedCount} Pending
            </span>
            <span className="text-base font-black text-slate-950">
              {percentChecked}%
            </span>
          </div>
        </div>

        <div className="mt-3 w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
          <div
            className="bg-[#c8f53b] h-full rounded-full transition-all duration-300"
            style={{ width: `${percentChecked}%` }}
          />
        </div>
      </div>

      {/* 2-Column Master-Detail Checking Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Groups Panel (3 cols) */}
        <div className="lg:col-span-3 bg-white rounded-[28px] border-2 border-slate-100 p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-extrabold text-slate-900">Groups</h2>
            <span className="text-[11px] font-bold text-slate-400">
              {groupNames.length} groups
            </span>
          </div>

          <div className="space-y-1.5 max-h-[440px] overflow-y-auto pr-1">
            <button
              type="button"
              onClick={() => {
                setSelectedGroup('ALL_GROUPS');
                setCurrentPage(1);
              }}
              className={`w-full text-left p-3.5 rounded-2xl transition cursor-pointer ${
                activeGroupName === 'ALL_GROUPS'
                  ? 'bg-[#c8f53b]/25 border-2 border-[#68c73a]'
                  : 'hover:bg-slate-50 border-2 border-transparent'
              }`}
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-extrabold text-slate-950">
                  All Registered Devices
                </span>
                <span className="text-[11px] text-slate-600 font-bold">
                  {activeSession.checkedCount}/{activeSession.totalExpectedDevices}
                </span>
              </div>
              <div className="mt-1 text-[11px] font-medium text-slate-500">
                {activeSession.uncheckedCount} unverified remaining
              </div>
            </button>

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
                  className={`w-full text-left p-3.5 rounded-2xl transition cursor-pointer ${
                    isSelected
                      ? 'bg-[#c8f53b]/25 border-2 border-[#68c73a]'
                      : 'hover:bg-slate-50 border-2 border-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span
                      className={`font-extrabold truncate ${
                        isSelected ? 'text-slate-950' : 'text-slate-800'
                      }`}
                    >
                      Group {gName}
                    </span>
                    <span className="text-[11px] text-slate-500 font-bold">
                      {gChecked}/{gTotal}
                    </span>
                  </div>

                  <div className="mt-2 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        isComp ? 'bg-emerald-600' : 'bg-[#c8f53b]'
                      }`}
                      style={{ width: `${gPct}%` }}
                    />
                  </div>

                  <div
                    className={`mt-1.5 text-[10px] font-bold ${
                      isComp ? 'text-emerald-800' : 'text-slate-400'
                    }`}
                  >
                    {isComp ? '✓ Completed' : `${gRem} unverified`}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Selected Group Inspection Panel (9 cols) */}
        <div className="lg:col-span-9 bg-white rounded-[28px] border-2 border-slate-100 p-5 sm:p-7 shadow-sm">
          {/* Group Header & Search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                {activeGroupName === 'ALL_GROUPS'
                  ? 'All Registered Company Devices'
                  : `Group ${activeGroupName}`}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {groupCheckedCount} of {currentGroupDevices.length} verified ·{' '}
                {groupAvailCount} FOUND · {groupMissingCount} MISSING ·{' '}
                {groupPendingCount} Unverified
              </p>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-initial">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="search"
                  placeholder="Search Unique ID or employee..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full sm:w-56 pl-8 pr-3 py-2 sm:py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#68c73a]"
                />
              </div>

              {canEdit && groupPendingCount > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    handleMarkGroupAvailable(activeGroupName, currentGroupDevices)
                  }
                  disabled={submitting}
                  title="Mark all phones in this view FOUND"
                  className="px-3 py-2 sm:py-1.5 bg-[#c8f53b] hover:bg-[#b8e629] text-slate-950 rounded-lg text-xs font-extrabold transition flex items-center space-x-1 shrink-0"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span className="hidden xl:inline">Mark all FOUND</span>
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
              { id: 'ALL', label: `All Registered (${currentGroupDevices.length})` },
              { id: 'PENDING', label: `Unverified (${groupPendingCount})` },
              { id: 'CHECKED', label: `Verified (${groupCheckedCount})` }
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
                      ? 'bg-[#f6f9f4] text-[#1a6e3c] border-[#1a6e3c]'
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
                No phones match the current filter.
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
                      <div className="w-10 h-10 rounded-xl bg-[#f6f9f4] border border-slate-200 text-[#1a6e3c] flex items-center justify-center shrink-0 mt-0.5">
                        <Smartphone className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                          <span className="text-xs font-extrabold text-slate-900">
                            {device.mobileCode}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 text-[10px] font-bold text-slate-700">
                            Group {device.groupName}
                          </span>
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-blue-50 text-[11px] font-bold text-blue-900 border border-blue-200">
                            <CreditCard className="w-3 h-3 text-blue-600 shrink-0" />
                            <span>Bank: {device.bankAccountName || device.phoneNumber || '—'}</span>
                          </span>
                          <span className="inline-flex items-center space-x-1 text-xs font-bold text-slate-800">
                            <UserCheck className="w-3 h-3 text-[#1a6e3c] shrink-0" />
                            <span>Operator: {device.assignedEmployeeName || <span className="text-slate-400 font-normal">Unassigned</span>}</span>
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                          {device.model || device.mobileName || 'iPhone 15'} · Location:{' '}
                          {device.description || `Group ${device.groupName} Station`}
                        </div>
                        {device.previouslyMissing ? (
                          <div className="text-[11px] font-medium text-rose-600 mt-0.5">
                            Previously missing · Missing again triggers a high-priority alert
                          </div>
                        ) : (
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {device.lastSessionSummary ||
                              'Last inspection: Verified FOUND'}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right Action Buttons */}
                    {canEdit ? (
                      <div className="flex items-center gap-2 sm:space-x-2.5 w-full sm:w-auto shrink-0">
                        <button
                          type="button"
                          onClick={() =>
                            handleRecordCheck(device.deviceId, 'Available')
                          }
                          className={`flex-1 sm:flex-initial sm:min-w-[120px] py-2.5 sm:py-2 px-4 rounded-lg text-xs font-bold inline-flex items-center justify-center space-x-1.5 transition ${
                            isChecked && isAvail
                              ? 'bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-200'
                              : 'bg-[#e8f5ee] hover:bg-[#d1fae5] text-[#15803d]'
                          }`}
                        >
                          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>FOUND</span>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handleRecordCheck(device.deviceId, 'Missing')
                          }
                          className={`flex-1 sm:flex-initial sm:min-w-[120px] py-2.5 sm:py-2 px-4 rounded-lg text-xs font-bold inline-flex items-center justify-center space-x-1.5 transition ${
                            isChecked && isMiss
                              ? 'bg-rose-600 text-white shadow-xs ring-2 ring-rose-200'
                              : 'bg-[#fdecec] hover:bg-[#fee2e2] text-[#b91c1c]'
                          }`}
                        >
                          <X className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>MISSING</span>
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
                          {!isChecked
                            ? 'Unverified'
                            : isAvail
                            ? 'FOUND'
                            : 'MISSING'}
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
            className={`w-full sm:w-auto px-8 py-3 rounded-xl text-xs font-extrabold tracking-wide transition cursor-pointer shadow-sm ${
              activeSession.uncheckedCount === 0
                ? 'bg-[#c8f53b] hover:bg-[#b8e629] text-slate-950'
                : 'bg-slate-900 hover:bg-slate-800 text-[#c8f53b]'
            }`}
          >
            COMPLETE SESSION &amp; FLAG UNVERIFIED
          </button>
        )}
      </div>

      {renderRecentSessionsTable()}
      {renderEditSessionModal()}
    </div>
  );
}
