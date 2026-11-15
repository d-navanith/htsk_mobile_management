import React, { useState, useEffect } from 'react';
import {
  ArrowUpRight,
  Check,
  Search,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  UserPlus,
  Edit,
  X,
  CreditCard,
  UserCheck
} from 'lucide-react';
import { api } from '../api';

export default function DashboardView({
  dashboard,
  user,
  userPermissions,
  onNavigateToChecking,
  onNavigateToIncidents,
  onNavigateToGroups,
  onNavigateToReports,
  onNavigateToHistory,
  onNavigateToDevices,
  onNavigateToReturns,
  onStartSession,
  onDataChange
}) {
  const [devices, setDevices] = useState([]);
  const [loadingDevices, setLoadingDevices] = useState(true);
  const [tableSearch, setTableSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const isPrivileged = user?.role === 'Developer' || user?.role === 'ITAdmin';
  const [showRawImei, setShowRawImei] = useState(() => isPrivileged);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Manual Assign Modal State
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedDeviceForAssign, setSelectedDeviceForAssign] = useState(null);
  const [manualAssigneeName, setManualAssigneeName] = useState('');
  const [manualDepartment, setManualDepartment] = useState('Operations');
  const [assignSaving, setAssignSaving] = useState(false);
  const [assignError, setAssignError] = useState('');

  const canManagePhones =
    user?.role === 'Developer' ||
    (user?.role === 'ITAdmin' && (userPermissions?.manage_mobile_phones ?? true));

  // Live 1-hour / 2-hour countdown timer state
  const [secondsLeft, setSecondsLeft] = useState(3540); // 00:59:00 default matching mockup

  useEffect(() => {
    let mounted = true;
    const loadDevices = async () => {
      setLoadingDevices(true);
      try {
        const list = await api.getDevices({ isActive: true });
        if (mounted) {
          setDevices(Array.isArray(list) ? list : []);
        }
      } catch (err) {
        console.error('Failed to load in-use phones for dashboard:', err);
      } finally {
        if (mounted) setLoadingDevices(false);
      }
    };
    loadDevices();
    return () => {
      mounted = false;
    };
  }, [dashboard]);

  // Synchronize countdown with dashboard.minutesUntilNextDue when available, otherwise run smooth live 00:59:00 countdown
  useEffect(() => {
    if (
      dashboard &&
      typeof dashboard.minutesUntilNextDue === 'number' &&
      dashboard.minutesUntilNextDue > 0
    ) {
      setSecondsLeft(dashboard.minutesUntilNextDue * 60);
    } else {
      setSecondsLeft(59 * 60); // 00:59:00
    }
  }, [dashboard?.minutesUntilNextDue]);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 3540));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

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
    assignedDevices: dtoAssignedDevices,
    availableUnassignedDevices: dtoAvailableUnassignedDevices,
    latestSession,
    uncheckedInCurrentSession = 0,
    repeatedMissingAlertCount = 0,
    highPriorityAlerts,
    groupProgress,
    recentActivities,
    activeIncidentsCount = 0
  } = dashboard;

  const safeHighPriorityAlerts = Array.isArray(highPriorityAlerts)
    ? highPriorityAlerts
    : [];
  const safeGroupProgress = Array.isArray(groupProgress) ? groupProgress : [];
  const safeRecentActivities = Array.isArray(recentActivities)
    ? recentActivities
    : [];

  const isSessionActive = latestSession?.sessionStatus === 'InProgress';
  const canManageSessions =
    userPermissions?.start_checking_sessions !== undefined
      ? userPermissions.start_checking_sessions
      : user?.role === 'ITAdmin' || user?.role === 'Developer';

  const sessionChecked = latestSession?.checkedCount ?? 0;
  const sessionAvail = latestSession?.availableCount ?? 0;
  const sessionMissing = latestSession?.missingCount ?? 0;
  const sessionPending = isSessionActive
    ? uncheckedInCurrentSession
    : Math.max(0, (latestSession?.totalDevices ?? totalDevices) - sessionChecked);
  const sessionTotal = Math.max(
    latestSession?.totalDevices || 0,
    totalDevices || 0,
    sessionChecked + sessionPending
  );
  const sessionPct =
    sessionTotal > 0
      ? Math.min(100, Math.round((sessionChecked / sessionTotal) * 100))
      : 0;

  // Format HH:MM:SS for Count Down card
  const hrs = String(Math.floor(secondsLeft / 3600)).padStart(2, '0');
  const mins = String(Math.floor((secondsLeft % 3600) / 60)).padStart(2, '0');
  const secs = String(secondsLeft % 60).padStart(2, '0');

  // Assigned (Active) vs Available (In Stock) vs Found calculations
  const computedAssignedCount = devices.filter(
    (d) =>
      d.currentStatus !== 'Missing' &&
      d.assignedEmployeeName &&
      d.assignedEmployeeName.trim().length > 0
  ).length;
  const computedAvailableStockCount = devices.filter(
    (d) =>
      d.currentStatus !== 'Missing' &&
      (!d.assignedEmployeeName || d.assignedEmployeeName.trim().length === 0)
  ).length;

  const assignedPhonesCount = computedAssignedCount;
  const availableUnassignedCount = computedAvailableStockCount;
  const activeOrFoundCount = assignedPhonesCount;

  const openAssignModal = (dev) => {
    setSelectedDeviceForAssign(dev);
    setManualAssigneeName(dev.assignedEmployeeName || '');
    setManualDepartment(dev.department || 'Operations');
    setAssignError('');
    setAssignModalOpen(true);
  };

  const handleSaveManualAssign = async (e) => {
    e.preventDefault();
    if (!selectedDeviceForAssign) return;
    setAssignSaving(true);
    setAssignError('');
    try {
      if (!manualAssigneeName.trim()) {
        await api.unassignDevice(selectedDeviceForAssign.deviceId);
      } else {
        await api.assignDevice(selectedDeviceForAssign.deviceId, {
          employeeName: manualAssigneeName.trim(),
          department: manualDepartment.trim()
        });
      }
      setAssignModalOpen(false);
      // Reload devices list
      const list = await api.getDevices({ isActive: true });
      setDevices(Array.isArray(list) ? list : []);
      if (onDataChange) onDataChange();
    } catch (err) {
      setAssignError(err.message || 'Failed to save assignee');
    } finally {
      setAssignSaving(false);
    }
  };

  // Unique groups for quick filter
  const uniqueGroups = Array.from(
    new Set(devices.map((d) => d.groupName).filter(Boolean))
  ).sort();

  // Filter In Use Phones table
  const filteredInUse = devices.filter((d) => {
    if (groupFilter !== 'ALL' && d.groupName !== groupFilter) return false;
    if (categoryFilter !== 'ALL') {
      const code = (d.mobileCode || '').toLowerCase();
      if (categoryFilter === 'Phone' && !code.startsWith('phone')) return false;
      if (categoryFilter === 'New' && !code.startsWith('new')) return false;
      if (categoryFilter === 'Cass' && !code.startsWith('cass')) return false;
    }
    if (tableSearch.trim()) {
      const q = tableSearch.trim().toLowerCase();
      const match =
        (d.mobileCode || '').toLowerCase().includes(q) ||
        (d.phoneNumber || '').toLowerCase().includes(q) ||
        (d.mobileName || '').toLowerCase().includes(q) ||
        (d.model || '').toLowerCase().includes(q) ||
        (d.groupName || '').toLowerCase().includes(q) ||
        (d.imei || '').toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredInUse.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const startIdx = (safePage - 1) * pageSize;
  const visiblePhones = filteredInUse.slice(startIdx, startIdx + pageSize);

  return (
    <div className="space-y-6">
      {/* Top Greeting matching HTSK UI design */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl sm:text-[28px] font-extrabold text-slate-950 tracking-tight">
            Welcome ..!
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Company Mobile Device Management, Physical Verification &amp; Missing Device Tracking
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onNavigateToReturns && (
            <button
              type="button"
              onClick={() => onNavigateToReturns()}
              className="px-3.5 py-2 bg-[#c8f53b] hover:bg-[#b8e629] rounded-xl text-xs font-extrabold text-slate-950 shadow-2xs transition cursor-pointer"
            >
              Return &amp; Replace Device
            </button>
          )}
          <button
            type="button"
            onClick={onNavigateToDevices}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 shadow-2xs transition"
          >
            All Registered Devices ({totalDevices})
          </button>
          <button
            type="button"
            onClick={onNavigateToReports}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 shadow-2xs transition"
          >
            Inspection Reports
          </button>
        </div>
      </div>

      {/* 4 KPI Cards Row — Matching uploaded HTSK Dashboard Design */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Total Phone (White) */}
        <div
          onClick={onNavigateToDevices}
          className="cursor-pointer bg-white p-5 rounded-[26px] border-2 border-slate-100 shadow-sm hover:shadow-md transition relative min-h-[148px] flex flex-col justify-between"
        >
          <div className="text-sm font-medium text-slate-800">Total Phone</div>
          <div className="text-4xl font-extrabold text-slate-950 text-center my-2">
            {totalDevices}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-medium">
              Registered fleet
            </span>
            <span className="w-8 h-8 rounded-full bg-slate-200/80 flex items-center justify-center text-slate-800">
              <ArrowUpRight className="w-4 h-4 stroke-[2.25]" />
            </span>
          </div>
        </div>

        {/* Card 2: Active Phones / Assigned (Cyan #c4f5fc) */}
        <div
          onClick={onNavigateToDevices}
          className="cursor-pointer bg-[#c4f5fc] p-5 rounded-[26px] border-2 border-white shadow-sm hover:shadow-md transition relative min-h-[148px] flex flex-col justify-between"
        >
          <div className="text-sm font-medium text-slate-900">Active Phones</div>
          <div className="text-4xl font-extrabold text-slate-950 text-center my-2">
            {activeOrFoundCount}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-700 font-medium">
              Active / Assigned ({availableDevices} verified FOUND)
            </span>
            <span className="w-8 h-8 rounded-full bg-white/70 flex items-center justify-center text-slate-900">
              <ArrowUpRight className="w-4 h-4 stroke-[2.25]" />
            </span>
          </div>
        </div>

        {/* Card 3: Missing (Soft Coral Pink #ffc5c5) */}
        <div
          onClick={onNavigateToIncidents}
          className="cursor-pointer bg-[#ffc5c5] p-5 rounded-[26px] border-2 border-white shadow-sm hover:shadow-md transition relative min-h-[148px] flex flex-col justify-between"
        >
          <div className="text-sm font-medium text-slate-900">Missing</div>
          <div className="text-4xl font-extrabold text-slate-950 text-center my-2">
            {missingDevices}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-rose-900 font-semibold">
              {missingDevices > 0
                ? `${missingDevices} unverified / missing`
                : '0 missing devices'}
            </span>
            <span className="w-8 h-8 rounded-full bg-white/70 flex items-center justify-center text-slate-900">
              <ArrowUpRight className="w-4 h-4 stroke-[2.25]" />
            </span>
          </div>
        </div>

        {/* Card 4: Available (White) */}
        <div
          onClick={() =>
            onNavigateToReturns ? onNavigateToReturns() : onNavigateToDevices()
          }
          className="cursor-pointer bg-white p-5 rounded-[26px] border-2 border-slate-100 shadow-sm hover:shadow-md transition relative min-h-[148px] flex flex-col justify-between"
        >
          <div className="text-sm font-medium text-slate-800">Available</div>
          <div className="text-4xl font-extrabold text-slate-950 text-center my-2">
            {availableUnassignedCount}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-medium">
              Available in stock (Ready to assign)
            </span>
            <span className="w-8 h-8 rounded-full bg-slate-200/80 flex items-center justify-center text-slate-800">
              <ArrowUpRight className="w-4 h-4 stroke-[2.25]" />
            </span>
          </div>
        </div>
      </div>

      {/* Middle Row: Checking Session START Card + Count Down Card (matching HTSK UI) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Left: Checking Session Card (9 cols) */}
        <div className="lg:col-span-9 bg-white rounded-[28px] border-2 border-slate-100 p-6 sm:p-8 shadow-sm flex flex-col items-center justify-center text-center relative">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-950 tracking-tight">
            Checking Session
          </h2>

          {isSessionActive ? (
            <div className="mt-3 w-full max-w-lg space-y-3">
              <div className="text-xs text-slate-500">
                Active Physical Inspection in Progress ·{' '}
                <strong className="text-slate-900">
                  {sessionChecked} / {sessionTotal}
                </strong>{' '}
                devices verified ({sessionAvail} FOUND, {sessionMissing} Missing,{' '}
                {sessionPending} Unverified)
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-[#c8f53b] h-full rounded-full transition-all duration-300"
                  style={{ width: `${sessionPct}%` }}
                />
              </div>
              <div className="pt-1">
                <button
                  type="button"
                  onClick={onNavigateToChecking}
                  className="px-10 py-3.5 rounded-xl bg-[#c8f53b] hover:bg-[#b8e629] text-[#2c5e1a] font-extrabold text-xl tracking-wide shadow-sm transition cursor-pointer"
                >
                  CONTINUE ({sessionPct}%)
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-4 flex flex-col items-center">
              <button
                type="button"
                onClick={
                  canManageSessions ? onStartSession : onNavigateToChecking
                }
                className="px-12 py-3.5 rounded-xl bg-[#c8f53b] hover:bg-[#b8e629] text-[#2c5e1a] font-extrabold text-2xl tracking-wider shadow-sm transition cursor-pointer"
              >
                START
              </button>
              <span className="text-[11px] text-slate-400 mt-2.5">
                Start physical inspection to verify all {totalDevices} registered devices and auto-identify missing phones
              </span>
            </div>
          )}
        </div>

        {/* Right: Count Down Timer Card (3 cols) */}
        <div className="lg:col-span-3 bg-white rounded-[28px] border-2 border-slate-100 p-6 shadow-sm flex flex-col items-center justify-center text-center">
          <div className="text-lg font-bold text-red-600 tracking-tight">
            Count Down
          </div>
          <div className="mt-2 font-mono text-xl sm:text-2xl font-bold text-slate-950 tracking-wider">
            {hrs}:{mins}:{secs}
          </div>
          <div className="mt-1 flex items-center justify-center space-x-3 text-[9px] font-bold uppercase tracking-widest text-slate-500">
            <span>HOUR</span>
            <span>MIN</span>
            <span>SEC</span>
          </div>
        </div>
      </div>

      {/* Missing / Unverified Devices Alert Banner (When any device is Missing) */}
      {missingDevices > 0 && (
        <div className="bg-rose-50/90 border border-rose-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start space-x-3">
            <div className="p-2 rounded-xl bg-rose-100 text-rose-600 shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-rose-950">
                {missingDevices} Missing / Unverified{' '}
                {missingDevices === 1 ? 'Device' : 'Devices'} Identified
              </h3>
              <p className="text-xs text-rose-700 mt-0.5">
                Inspect last assigned employee, last known location, previous assignment history, and last verification date.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onNavigateToIncidents}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition shrink-0"
          >
            Investigate Missing Devices →
          </button>
        </div>
      )}

      {/* Bottom Section: "In Use Phones" Table matching HTSK Mockup + Excel Sheet Data */}
      <div className="bg-white rounded-[28px] border-2 border-slate-100 p-5 sm:p-7 shadow-sm space-y-4">
        {/* Header Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <h2 className="text-sm sm:text-base font-bold text-slate-600">
              In Use Phones
            </h2>
            <button
              type="button"
              onClick={() => setShowRawImei((prev) => !prev)}
              className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200/70 text-[11px] font-semibold text-slate-600 transition"
              title="Toggle masked or visible IMEI numbers"
            >
              {showRawImei ? (
                <>
                  <EyeOff className="w-3 h-3" />
                  <span>Mask IMEI</span>
                </>
              ) : (
                <>
                  <Eye className="w-3 h-3" />
                  <span>Show IMEI</span>
                </>
              )}
            </button>
          </div>

          {/* Search, Category & Group Filters + Total In Use Lime Badge */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                placeholder="Search Phone ID or employee..."
                value={tableSearch}
                onChange={(e) => {
                  setTableSearch(e.target.value);
                  setPage(1);
                }}
                className="w-48 sm:w-56 pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-slate-400"
              />
            </div>

            <select
              aria-label="Filter by category prefix"
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700"
            >
              <option value="ALL">All Categories</option>
              <option value="Phone">Phone (Standard)</option>
              <option value="New">New (New Fleet)</option>
              <option value="Cass">Cass (Cassette)</option>
            </select>

            <select
              aria-label="Filter by group"
              value={groupFilter}
              onChange={(e) => {
                setGroupFilter(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700"
            >
              <option value="ALL">All Groups</option>
              {uniqueGroups.map((g) => (
                <option key={g} value={g}>
                  Group {g}
                </option>
              ))}
            </select>

            <div className="flex items-center space-x-2 pl-1">
              <span className="text-xs font-semibold text-slate-500">
                Total In Use
              </span>
              <span className="px-2.5 py-1 rounded-md bg-[#c8f53b] text-slate-900 font-extrabold text-xs shadow-2xs">
                {filteredInUse.length}
              </span>
            </div>
          </div>
        </div>

        {/* Mockup Table */}
        <div className="overflow-x-auto">
          {loadingDevices ? (
            <div className="py-10 text-center text-xs text-slate-400">
              Loading registered mobile devices...
            </div>
          ) : visiblePhones.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-400">
              No mobile devices match your current filter.
            </div>
          ) : (
            <table className="w-full border-collapse text-xs min-w-[680px]">
              <thead>
                <tr>
                  <th className="w-10 py-2.5 pr-2 text-center font-semibold text-slate-400">
                    #
                  </th>
                  <th className="border border-slate-300 py-2.5 px-4 text-center font-bold uppercase tracking-wide text-slate-900 bg-white">
                    PHONE ID
                  </th>
                  <th className="border border-slate-300 py-2.5 px-4 text-center font-bold uppercase tracking-wide text-slate-900 bg-white">
                    GROUP
                  </th>
                  <th className="border border-slate-300 py-2.5 px-4 text-center font-bold uppercase tracking-wide text-slate-900 bg-white">
                    IMEI NUMBER 1/2
                  </th>
                  <th className="border border-slate-300 py-2.5 px-4 text-center font-bold uppercase tracking-wide text-slate-900 bg-white">
                    Device name
                  </th>
                  <th className="border border-slate-300 py-2.5 px-4 text-center font-bold uppercase tracking-wide text-slate-900 bg-white">
                    Bank Account / Details
                  </th>
                  <th className="border border-slate-300 py-2.5 px-4 text-center font-bold uppercase tracking-wide text-slate-900 bg-white">
                    Assigned To
                  </th>
                  <th className="border border-slate-300 py-2.5 px-4 text-center font-bold uppercase tracking-wide text-slate-900 bg-white">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {visiblePhones.map((d, index) => {
                  const rowNum = startIdx + index + 1;
                  const isMissing = d.currentStatus === 'Missing';
                  const rowBg =
                    index % 2 === 0 ? 'bg-[#f4f4f5]' : 'bg-[#fafafa]';

                  return (
                    <tr
                      key={d.deviceId}
                      className={`${rowBg} hover:bg-lime-50/50 transition`}
                    >
                      <td className="py-3 pr-2 text-center font-semibold text-slate-700">
                        {rowNum}.
                      </td>
                      <td className="border border-slate-200/90 py-3 px-4 text-center font-bold text-slate-900">
                        <div className="flex items-center justify-center space-x-1.5">
                          <span className="px-1.5 py-0.5 rounded bg-slate-900 text-[#c8f53b] font-mono text-[10px] font-black tracking-tight" title="Permanent 1-to-Infinity Auto-Increment Identification Number">
                            #{d.identificationNumber || d.deviceId}
                          </span>
                          <span>{d.mobileCode}</span>
                        </div>
                      </td>
                      <td className="border border-slate-200/90 py-3 px-4 text-center font-semibold text-slate-800">
                        {d.groupName}
                      </td>
                      <td className="border border-slate-200/90 py-2.5 px-4 text-center font-mono text-[11px] leading-tight text-slate-800">
                        {showRawImei ? (
                          <div>
                            <div>{d.imei || '358401000000137'}</div>
                            <div className="text-slate-400">
                              {d.serialNumber || 'SN-HTSK-0001'}
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div>***********</div>
                            <div>***********</div>
                          </div>
                        )}
                      </td>
                      <td className="border border-slate-200/90 py-3 px-4 text-center font-medium text-slate-900">
                        {d.mobileName || d.model || 'iPhone 15'}
                      </td>
                      <td className="border border-slate-200/90 py-3 px-4 text-center font-semibold text-slate-900">
                        <div className="font-bold text-slate-900 flex items-center justify-center space-x-1.5">
                          <CreditCard className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span>{d.bankAccountName || d.phoneNumber || '—'}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-medium">
                          Bank Details
                        </div>
                      </td>
                      <td className="border border-slate-200/90 py-3 px-4 text-center font-semibold text-slate-900">
                        {d.assignedEmployeeName ? (
                          <div className="inline-flex items-center space-x-1.5">
                            <span className="font-bold text-slate-900">{d.assignedEmployeeName}</span>
                            {canManagePhones && (
                              <button
                                type="button"
                                onClick={() => openAssignModal(d)}
                                title="Edit assigned employee"
                                className="p-1 text-slate-400 hover:text-slate-800 transition cursor-pointer"
                              >
                                <Edit className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        ) : canManagePhones ? (
                          <button
                            type="button"
                            onClick={() => openAssignModal(d)}
                            className="px-2.5 py-1 text-[11px] font-bold text-slate-900 bg-[#c8f53b] hover:bg-[#b8e629] rounded-lg transition cursor-pointer inline-flex items-center space-x-1 shadow-2xs"
                          >
                            <UserPlus className="w-3 h-3" />
                            <span>+ Assign</span>
                          </button>
                        ) : (
                          <span className="text-slate-400 font-medium text-[11px]">Unassigned</span>
                        )}
                      </td>
                      <td className="border border-slate-200/90 py-3 px-4 text-center">
                        {isMissing ? (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                            <span>MISSING</span>
                          </span>
                        ) : d.assignedEmployeeName ? (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#c4f5fc] text-slate-900">
                            <Check className="w-3 h-3 stroke-[2.5]" />
                            <span>ACTIVE / ASSIGNED</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            <Check className="w-3 h-3 stroke-[2.5]" />
                            <span>AVAILABLE</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Table Pagination */}
        <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500">
          <span>
            Showing {filteredInUse.length === 0 ? 0 : startIdx + 1}–
            {Math.min(startIdx + pageSize, filteredInUse.length)} of{' '}
            {filteredInUse.length} registered company devices
          </span>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-bold text-slate-700">
              Page {safePage} of {totalPages}
            </span>
            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Secondary Row: Group Inspection Progress + Recent Activity & Handover Log */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-900">
              Physical Verification Progress by Group
            </h3>
            <button
              type="button"
              onClick={onNavigateToGroups}
              className="text-xs font-semibold text-[#1a6e3c] hover:underline"
            >
              Manage Groups →
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="text-left text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                  <th className="py-2 pr-4">GROUP</th>
                  <th className="py-2 px-4">VERIFIED</th>
                  <th className="py-2 px-4 w-44">PROGRESS</th>
                  <th className="py-2 pl-4">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {safeGroupProgress.slice(0, 6).map((gp) => {
                  const pct =
                    gp.totalDevices > 0
                      ? Math.round((gp.checkedCount / gp.totalDevices) * 100)
                      : 0;
                  const isComp = gp.status === 'Completed';
                  return (
                    <tr key={gp.groupId}>
                      <td className="py-2.5 pr-4 font-bold text-slate-800">
                        Group {gp.groupName}
                      </td>
                      <td className="py-2.5 px-4 text-slate-600">
                        {gp.checkedCount} / {gp.totalDevices}
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              isComp ? 'bg-emerald-600' : 'bg-[#68c73a]'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </td>
                      <td className="py-2.5 pl-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isComp
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {gp.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Activity & Handover Log */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900">
                Recent Checks &amp; Updates
              </h3>
              <button
                type="button"
                onClick={onNavigateToHistory}
                className="text-xs font-semibold text-[#1a6e3c] hover:underline"
              >
                Full Audit Log →
              </button>
            </div>
            <div className="space-y-3">
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
                      : 'bg-[#68c73a]';
                  return (
                    <div key={act.id} className="flex items-start space-x-2.5">
                      <span
                        className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${dotColor}`}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-slate-800 truncate">
                          {act.title}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate">
                          {act.subtitle}
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {act.timeColombo}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {safeHighPriorityAlerts.length > 0 && (
            <div className="mt-4 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onNavigateToIncidents}
                className="text-xs font-bold text-rose-600 hover:underline"
              >
                {repeatedMissingAlertCount} High-Priority Missing{' '}
                {repeatedMissingAlertCount === 1 ? 'Incident' : 'Incidents'} (
                {activeIncidentsCount} total) →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Manual Employee Assignment Modal */}
      {assignModalOpen && selectedDeviceForAssign && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in duration-150">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-[#c8f53b]/40 text-slate-950 flex items-center justify-center">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Assign Mobile Device to Staff
                  </h3>
                  <p className="text-[10px] text-slate-500">
                    Manual staff assignment &amp; custody tracking
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAssignModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveManualAssign} className="p-6 space-y-4 text-xs">
              {/* Phone Details Banner */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-extrabold text-slate-950 text-sm">
                    {selectedDeviceForAssign.mobileCode}
                  </div>
                  <span className="px-2 py-0.5 rounded bg-slate-200/80 text-slate-800 font-bold text-[10px]">
                    Group {selectedDeviceForAssign.groupName || '—'}
                  </span>
                </div>
                <div className="text-slate-600 text-[11px]">
                  {selectedDeviceForAssign.mobileName || selectedDeviceForAssign.model || 'iPhone 15'} · IMEI: <span className="font-mono font-bold text-slate-800">{selectedDeviceForAssign.imei || '—'}</span>
                </div>

                {/* Bank Account Identification Callout */}
                <div className="mt-2 pt-2 border-t border-slate-200/80">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-blue-700 flex items-center space-x-1">
                    <CreditCard className="w-3 h-3" />
                    <span>Bank Transaction Profile:</span>
                  </div>
                  <div className="text-xs font-black text-slate-900 mt-0.5">
                    {selectedDeviceForAssign.bankAccountName || selectedDeviceForAssign.phoneNumber || '—'}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    This phone is dedicated to transactions for this bank entity. Assign the operator below.
                  </div>
                </div>
              </div>

              {/* Form Input: Staff Name */}
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Assigned Employee / Operator Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Jonney, Kahn, Joy, Pinnay, Ury"
                  value={manualAssigneeName}
                  onChange={(e) => setManualAssigneeName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 font-medium placeholder-slate-400 focus:outline-none focus:border-[#1a6e3c] focus:ring-1 focus:ring-[#1a6e3c]"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Leave empty and save to unassign and return phone to Available inventory.
                </span>
              </div>

              {/* Form Input: Department */}
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Department / Team
                </label>
                <input
                  type="text"
                  placeholder="e.g. Operations, Finance, IT"
                  value={manualDepartment}
                  onChange={(e) => setManualDepartment(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 font-medium placeholder-slate-400 focus:outline-none focus:border-[#1a6e3c]"
                />
              </div>

              {assignError && (
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                  {assignError}
                </div>
              )}

              {/* Modal Buttons */}
              <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                {selectedDeviceForAssign.assignedEmployeeName ? (
                  <button
                    type="button"
                    disabled={assignSaving}
                    onClick={() => {
                      setManualAssigneeName('');
                      setTimeout(() => {
                        const form = document.querySelector('form');
                        if (form) form.requestSubmit();
                      }, 0);
                    }}
                    className="px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-lg transition cursor-pointer"
                  >
                    Unassign Phone
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    disabled={assignSaving}
                    onClick={() => setAssignModalOpen(false)}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={assignSaving}
                    className="px-4 py-1.5 text-xs font-extrabold text-slate-950 bg-[#c8f53b] hover:bg-[#b8e629] rounded-lg shadow-2xs transition cursor-pointer inline-flex items-center space-x-1"
                  >
                    {assignSaving ? (
                      <span>Saving...</span>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>Save Assignment</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
