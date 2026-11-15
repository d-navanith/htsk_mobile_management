import React, { useState, useEffect } from 'react';
import {
  ArrowLeftRight,
  RotateCcw,
  UserCheck,
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  Search,
  History,
  ArrowRight,
  ShieldCheck,
  Download,
  PackageCheck
} from 'lucide-react';
import { api } from '../api';

const CONDITION_OPTIONS = [
  'Good / Working',
  'Fair / Minor Wear',
  'Screen Cracked / Damaged',
  'Battery / Charging Issue',
  'Hardware Fault / Needs Repair'
];

export default function ReturnReplacementView({
  user,
  userPermissions,
  permissionDetails,
  onDataChange,
  initialDevice = null,
  onClearInitialDevice = () => {}
}) {
  const canProcess =
    user?.role === 'Developer' ||
    (user?.role === 'ITAdmin' && (userPermissions?.manage_mobile_phones ?? true)) ||
    (user?.role === 'Employee' &&
      Boolean(userPermissions?.manage_mobile_phones) &&
      Boolean(permissionDetails?.manage_mobile_phones?.employeeCanEdit));

  const [counts, setCounts] = useState({
    totalDevices: 0,
    assignedDevices: 0,
    availableDevices: 0,
    missingDevices: 0
  });
  const [employees, setEmployees] = useState([]);
  const [availableDevices, setAvailableDevices] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  // Workflow Mode: 'stepped' (Step 1 Return -> Step 2 Replace) or 'atomic' (1-Step Return & Replace together)
  const [workflowMode, setWorkflowMode] = useState('stepped');

  // Step 1: Device Return state
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [selectedReturnDeviceId, setSelectedReturnDeviceId] = useState(null);
  const [deviceCondition, setDeviceCondition] = useState('Good / Working');
  const [returnRemarks, setReturnRemarks] = useState('');
  const [processingReturn, setProcessingReturn] = useState(false);

  // Step 2: Device Replacement state
  const [availableSearch, setAvailableSearch] = useState('');
  const [availableCategory, setAvailableCategory] = useState('ALL');
  const [selectedReplacementId, setSelectedReplacementId] = useState(null);
  const [replacementRemarks, setReplacementRemarks] = useState('');
  const [processingReplace, setProcessingReplace] = useState(false);
  const [lastCompletedReturnTx, setLastCompletedReturnTx] = useState(null);

  // History filter
  const [historySearch, setHistorySearch] = useState('');

  // Status banner messages
  const [feedback, setFeedback] = useState(null); // { type: 'success' | 'error', title, message, countTransition }

  const loadAll = async (preserveSelection = true) => {
    setLoading(true);
    try {
      const [cntData, empList, availList, histList] = await Promise.all([
        api.getReturnReplacementCounts(),
        api.getReturnEmployees(),
        api.getAvailableDevicesForReplacement(),
        api.getReturnReplacementHistory()
      ]);

      if (cntData) setCounts(cntData);
      const safeEmployees = Array.isArray(empList) ? empList : [];
      const safeAvail = Array.isArray(availList) ? availList : [];
      const safeHist = Array.isArray(histList) ? histList : [];

      setEmployees(safeEmployees);
      setAvailableDevices(safeAvail);
      setHistory(safeHist);

      if (initialDevice && initialDevice.phoneNumber) {
        const matchEmp = safeEmployees.find(
          (e) =>
            e.employeeName.toLowerCase() ===
            initialDevice.phoneNumber.trim().toLowerCase()
        );
        if (matchEmp) {
          setSelectedEmployee(matchEmp);
          setSelectedReturnDeviceId(initialDevice.deviceId);
        }
        onClearInitialDevice();
      } else if (preserveSelection && selectedEmployee) {
        const refreshedEmp = safeEmployees.find(
          (e) =>
            e.employeeName.toLowerCase() ===
            selectedEmployee.employeeName.toLowerCase()
        );
        if (refreshedEmp) {
          setSelectedEmployee(refreshedEmp);
          if (refreshedEmp.assignedDevices.length > 0) {
            setSelectedReturnDeviceId(refreshedEmp.assignedDevices[0].deviceId);
          } else {
            setSelectedReturnDeviceId(null);
          }
        }
      } else if (!selectedEmployee && safeEmployees.length > 0) {
        const firstWithDevice =
          safeEmployees.find((e) => e.assignedDevices.length > 0) ||
          safeEmployees[0];
        setSelectedEmployee(firstWithDevice);
        if (firstWithDevice?.assignedDevices?.length > 0) {
          setSelectedReturnDeviceId(firstWithDevice.assignedDevices[0].deviceId);
        }
      }
    } catch (err) {
      console.error('Failed to load Return & Replacement data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll(false);
  }, []);

  const handleSelectEmployee = (emp) => {
    setSelectedEmployee(emp);
    setFeedback(null);
    if (emp?.assignedDevices?.length > 0) {
      setSelectedReturnDeviceId(emp.assignedDevices[0].deviceId);
    } else {
      setSelectedReturnDeviceId(null);
    }
  };

  // Step 1 Handler: Receive Returned Device
  const handleProcessReturn = async (e) => {
    e.preventDefault();
    if (!selectedEmployee) {
      setFeedback({
        type: 'error',
        title: 'Employee Required',
        message: 'Please select the employee returning their device.'
      });
      return;
    }
    if (!selectedReturnDeviceId) {
      setFeedback({
        type: 'error',
        title: 'No Assigned Device Selected',
        message:
          'This employee has no currently assigned device to return. You can assign them an Available replacement device in Step 2.'
      });
      return;
    }

    const beforeAssigned = counts.assignedDevices;
    const beforeAvail = counts.availableDevices;

    setProcessingReturn(true);
    setFeedback(null);
    try {
      const res = await api.processDeviceReturn({
        employeeId: selectedEmployee.employeeId,
        employeeName: selectedEmployee.employeeName,
        deviceId: Number(selectedReturnDeviceId),
        deviceCondition,
        remarks: returnRemarks.trim() || null
      });

      const afterAssigned = res?.counts?.assignedDevices ?? beforeAssigned - 1;
      const afterAvail = res?.counts?.availableDevices ?? beforeAvail + 1;

      if (res?.counts) setCounts(res.counts);
      if (res?.transaction) setLastCompletedReturnTx(res.transaction);

      setReturnRemarks('');
      setFeedback({
        type: 'success',
        title: 'Step 1 Complete — Device Returned & Now Available in Inventory',
        message: res.message,
        countTransition: `Active / Assigned: ${beforeAssigned} → ${afterAssigned}   |   Available Devices: ${beforeAvail} → ${afterAvail}   |   Total Devices: ${
          res?.counts?.totalDevices ?? counts.totalDevices
        } (Unchanged)`
      });

      await loadAll(true);
      if (onDataChange) onDataChange();
    } catch (err) {
      setFeedback({
        type: 'error',
        title: 'Device Return Prevented',
        message: err.message || 'Could not process device return.'
      });
    } finally {
      setProcessingReturn(false);
    }
  };

  // Step 2 Handler: Assign Replacement Device
  const handleProcessReplacement = async (e) => {
    e.preventDefault();
    if (!selectedEmployee) {
      setFeedback({
        type: 'error',
        title: 'Employee Required',
        message: 'Please select the employee who will receive the replacement device.'
      });
      return;
    }
    if (!selectedReplacementId) {
      setFeedback({
        type: 'error',
        title: 'Replacement Device Required',
        message: 'Please select an Available device from the inventory list in Step 2.'
      });
      return;
    }

    const beforeAssigned = counts.assignedDevices;
    const beforeAvail = counts.availableDevices;

    setProcessingReplace(true);
    setFeedback(null);
    try {
      const prevDevId =
        selectedEmployee.assignedDevices?.[0]?.deviceId ||
        lastCompletedReturnTx?.returnedDeviceId ||
        null;
      const returnTxId =
        lastCompletedReturnTx?.employeeName?.toLowerCase() ===
        selectedEmployee.employeeName.toLowerCase()
          ? lastCompletedReturnTx.transactionId
          : selectedEmployee.pendingReturnTransactionId || null;

      const res = await api.processDeviceReplacement({
        employeeId: selectedEmployee.employeeId,
        employeeName: selectedEmployee.employeeName,
        replacementDeviceId: Number(selectedReplacementId),
        returnTransactionId: returnTxId,
        previouslyAssignedDeviceId: prevDevId,
        groupName: selectedEmployee.groupName,
        remarks: replacementRemarks.trim() || null
      });

      const afterAssigned = res?.counts?.assignedDevices ?? beforeAssigned + 1;
      const afterAvail = res?.counts?.availableDevices ?? beforeAvail - 1;

      if (res?.counts) setCounts(res.counts);
      setSelectedReplacementId(null);
      setReplacementRemarks('');
      setLastCompletedReturnTx(null);

      setFeedback({
        type: 'success',
        title: 'Step 2 Complete — Replacement Device Assigned to Employee',
        message: res.message,
        countTransition: `Active / Assigned: ${beforeAssigned} → ${afterAssigned}   |   Available Devices: ${beforeAvail} → ${afterAvail}   |   Total Devices: ${
          res?.counts?.totalDevices ?? counts.totalDevices
        } (Unchanged)`
      });

      await loadAll(true);
      if (onDataChange) onDataChange();
    } catch (err) {
      setFeedback({
        type: 'error',
        title: 'Replacement Assignment Failed (Inventory Safely Preserved)',
        message: err.message || 'Could not assign replacement device.'
      });
    } finally {
      setProcessingReplace(false);
    }
  };

  // Atomic 1-Click Return & Replace Handler
  const handleAtomicReturnAndReplace = async (e) => {
    e.preventDefault();
    if (!selectedEmployee || !selectedReturnDeviceId) {
      setFeedback({
        type: 'error',
        title: 'Assigned Device Required',
        message: 'Please select an employee with an active assigned device to return.'
      });
      return;
    }
    if (!selectedReplacementId) {
      setFeedback({
        type: 'error',
        title: 'Replacement Device Required',
        message: 'Please select an Available replacement device from inventory.'
      });
      return;
    }

    const beforeAssigned = counts.assignedDevices;
    const beforeAvail = counts.availableDevices;

    setProcessingReplace(true);
    setFeedback(null);
    try {
      const combinedRemarks = [returnRemarks.trim(), replacementRemarks.trim()]
        .filter(Boolean)
        .join(' | ');

      const res = await api.processReturnAndReplace({
        employeeId: selectedEmployee.employeeId,
        employeeName: selectedEmployee.employeeName,
        returnedDeviceId: Number(selectedReturnDeviceId),
        deviceCondition,
        replacementDeviceId: Number(selectedReplacementId),
        remarks: combinedRemarks || null
      });

      if (res?.counts) setCounts(res.counts);
      setSelectedReplacementId(null);
      setReturnRemarks('');
      setReplacementRemarks('');

      setFeedback({
        type: 'success',
        title: 'Atomic Return & Replacement Completed Successfully',
        message: res.message,
        countTransition: `Step 1 Return: Active ${beforeAssigned} → ${
          beforeAssigned - 1
        }, Available ${beforeAvail} → ${
          beforeAvail + 1
        }   |   Step 2 Replace: Active ${beforeAssigned - 1} → ${
          res?.counts?.assignedDevices ?? beforeAssigned
        }, Available ${beforeAvail + 1} → ${
          res?.counts?.availableDevices ?? beforeAvail
        }   |   Total: ${res?.counts?.totalDevices ?? counts.totalDevices}`
      });

      await loadAll(true);
      if (onDataChange) onDataChange();
    } catch (err) {
      setFeedback({
        type: 'error',
        title: 'Transaction Rolled Back Safely',
        message: err.message || 'Return & Replacement failed.'
      });
    } finally {
      setProcessingReplace(false);
    }
  };

  const handleExportHistoryCsv = () => {
    const headers = [
      'Transaction ID',
      'Type',
      'Employee ID',
      'Employee Name',
      'Group',
      'Previously Assigned Device ID',
      'Returned Device ID',
      'Returned Model',
      'Return Date (Colombo)',
      'Device Condition',
      'Return Processed By',
      'Replacement Device ID',
      'Replacement Model',
      'New Assignment Date (Colombo)',
      'Replacement Assigned By',
      'Remarks'
    ];
    const rows = filteredHistory.map((h) => [
      `TX-${String(h.transactionId).padStart(4, '0')}`,
      h.transactionType,
      h.employeeId,
      h.employeeName,
      h.groupName || '',
      h.previouslyAssignedMobileCode || '—',
      h.returnedMobileCode || '—',
      h.returnedDeviceModel || '—',
      h.returnDateColombo || '—',
      h.deviceCondition || '—',
      h.returnProcessedByName || '—',
      h.replacementMobileCode || '—',
      h.replacementDeviceModel || '—',
      h.newAssignmentDateColombo || '—',
      h.replacementAssignedByName || '—',
      h.remarks || ''
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers, ...rows]
        .map((e) =>
          e.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
        )
        .join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'htsk_device_return_replacement_history.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredEmployees = employees.filter((e) => {
    if (!employeeSearch.trim()) return true;
    const q = employeeSearch.trim().toLowerCase();
    return (
      e.employeeName.toLowerCase().includes(q) ||
      e.employeeId.toLowerCase().includes(q) ||
      (e.groupName || '').toLowerCase().includes(q) ||
      e.assignedDevices.some(
        (d) =>
          d.mobileCode.toLowerCase().includes(q) ||
          (d.model || '').toLowerCase().includes(q)
      )
    );
  });

  const filteredAvailableDevices = availableDevices.filter((d) => {
    if (availableCategory !== 'ALL') {
      const code = (d.mobileCode || '').toLowerCase();
      if (!code.startsWith(availableCategory.toLowerCase())) return false;
    }
    if (availableSearch.trim()) {
      const q = availableSearch.trim().toLowerCase();
      return (
        (d.mobileCode || '').toLowerCase().includes(q) ||
        (d.mobileName || '').toLowerCase().includes(q) ||
        (d.brand || '').toLowerCase().includes(q) ||
        (d.model || '').toLowerCase().includes(q) ||
        (d.imei || '').toLowerCase().includes(q) ||
        (d.serialNumber || '').toLowerCase().includes(q) ||
        (d.description || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const filteredHistory = history.filter((h) => {
    if (!historySearch.trim()) return true;
    const q = historySearch.trim().toLowerCase();
    return (
      (h.employeeName || '').toLowerCase().includes(q) ||
      (h.employeeId || '').toLowerCase().includes(q) ||
      (h.returnedMobileCode || '').toLowerCase().includes(q) ||
      (h.replacementMobileCode || '').toLowerCase().includes(q) ||
      (h.previouslyAssignedMobileCode || '').toLowerCase().includes(q) ||
      (h.deviceCondition || '').toLowerCase().includes(q) ||
      (h.remarks || '').toLowerCase().includes(q)
    );
  });

  const currentAssignedDevice =
    selectedEmployee?.assignedDevices?.find(
      (d) => d.deviceId === Number(selectedReturnDeviceId)
    ) ||
    selectedEmployee?.assignedDevices?.[0] ||
    null;

  const selectedReplacementObj =
    availableDevices.find((d) => d.deviceId === Number(selectedReplacementId)) ||
    null;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="text-[11px] font-bold tracking-wider uppercase text-[#1a6e3c]">
            DEVICE RETURN &amp; REPLACEMENT MANAGEMENT
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-950 mt-0.5">
            Device Return &amp; Replacement Workflow
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Receive returned employee devices back into Available inventory, assign verified Available replacement devices, and maintain complete handover history.
          </p>
        </div>

        {/* Workflow Mode Switcher */}
        <div className="inline-flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-2xs self-start">
          <button
            type="button"
            onClick={() => setWorkflowMode('stepped')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              workflowMode === 'stepped'
                ? 'bg-[#c8f53b] text-slate-950 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            2-Step Guided Process (Return → Replace)
          </button>
          <button
            type="button"
            onClick={() => setWorkflowMode('atomic')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              workflowMode === 'atomic'
                ? 'bg-[#c8f53b] text-slate-950 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Simultaneous Swap (1-Step Atomic)
          </button>
        </div>
      </div>

      {/* Live Automatic Device Count KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border-2 border-slate-100 p-4 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600">Total Devices</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
              Constant Fleet
            </span>
          </div>
          <div className="text-3xl font-extrabold text-slate-950 my-2">
            {counts.totalDevices}
          </div>
          <div className="text-[11px] text-slate-400">
            Remains unchanged during return &amp; replacement
          </div>
        </div>

        <div className="bg-[#c4f5fc] rounded-2xl border-2 border-white p-4 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900">
              Active / Assigned Devices
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/80 text-slate-900">
              In Employee Use
            </span>
          </div>
          <div className="text-3xl font-extrabold text-slate-950 my-2">
            {counts.assignedDevices}
          </div>
          <div className="text-[11px] text-slate-700 font-medium">
            Decreases (-1) on Return · Increases (+1) on Replace
          </div>
        </div>

        <div className="bg-[#ecfccb] rounded-2xl border-2 border-white p-4 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900">
              Available Devices (In Stock)
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/80 text-[#1a6e3c]">
              Ready to Assign
            </span>
          </div>
          <div className="text-3xl font-extrabold text-slate-950 my-2">
            {counts.availableDevices}
          </div>
          <div className="text-[11px] text-slate-700 font-medium">
            Increases (+1) on Return · Decreases (-1) on Replace
          </div>
        </div>

        <div className="bg-[#ffc5c5] rounded-2xl border-2 border-white p-4 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900">Missing Devices</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/80 text-rose-800">
              Blocked from Assign
            </span>
          </div>
          <div className="text-3xl font-extrabold text-slate-950 my-2">
            {counts.missingDevices}
          </div>
          <div className="text-[11px] text-rose-900 font-medium">
            Cannot be assigned until recovered
          </div>
        </div>
      </div>

      {/* Live Feedback & Count Transition Banner */}
      {feedback && (
        <div
          role="alert"
          className={`rounded-2xl border p-4 flex items-start space-x-3 ${
            feedback.type === 'success'
              ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950'
              : 'bg-rose-50/90 border-rose-300 text-rose-950'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          )}
          <div className="flex-1 text-xs space-y-1">
            <div className="font-extrabold text-sm">{feedback.title}</div>
            <div>{feedback.message}</div>
            {feedback.countTransition && (
              <div className="inline-block mt-1.5 px-3 py-1 rounded-lg bg-white/90 border border-emerald-200 font-mono font-bold text-[11px] text-slate-900">
                {feedback.countTransition}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main 2-Column Return & Replacement Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN (6 cols): STEP 1 — DEVICE RETURN PROCESS */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2.5">
              <span className="w-7 h-7 rounded-lg bg-slate-900 text-[#c8f53b] font-extrabold text-xs flex items-center justify-center">
                1
              </span>
              <div>
                <h2 className="text-base font-extrabold text-slate-900">
                  Step 1: Device Return Process
                </h2>
                <p className="text-[11px] text-slate-500">
                  Select employee, inspect currently assigned device, and receive it into Available stock.
                </p>
              </div>
            </div>
            <RotateCcw className="w-5 h-5 text-slate-400" />
          </div>

          {/* 1A: Search & Select Employee */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700">
              1. Select Employee Returning Device
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                placeholder="Search employee name, Employee ID, or assigned Phone ID..."
                value={employeeSearch}
                onChange={(e) => setEmployeeSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#68c73a]"
              />
            </div>

            <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-slate-50/40">
              {loading ? (
                <div className="p-4 text-center text-xs text-slate-400">
                  Loading employees...
                </div>
              ) : filteredEmployees.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">
                  No employees match your search.
                </div>
              ) : (
                filteredEmployees.slice(0, 60).map((emp) => {
                  const isSel =
                    selectedEmployee?.employeeName?.toLowerCase() ===
                    emp.employeeName.toLowerCase();
                  const hasActive = emp.assignedDevices.length > 0;
                  return (
                    <button
                      type="button"
                      key={emp.employeeName}
                      onClick={() => handleSelectEmployee(emp)}
                      className={`w-full px-3.5 py-2.5 text-left flex items-center justify-between text-xs transition ${
                        isSel
                          ? 'bg-[#f6f9f4] border-l-4 border-[#1a6e3c] font-bold text-slate-950'
                          : 'hover:bg-white text-slate-700'
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-slate-900 truncate">
                            {emp.employeeName}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-slate-200/70 text-[10px] font-mono text-slate-700">
                            {emp.employeeId}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 text-[10px] font-semibold text-slate-600">
                            Group {emp.groupName}
                          </span>
                        </div>
                        {emp.lastReturnedMobileCode && !hasActive && (
                          <div className="text-[10px] text-amber-700 font-semibold mt-0.5">
                            Returned {emp.lastReturnedMobileCode} · Ready for Step 2 Replacement
                          </div>
                        )}
                      </div>

                      <div className="shrink-0">
                        {hasActive ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#c4f5fc] text-slate-900">
                            {emp.assignedDevices.map((d) => d.mobileCode).join(', ')}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900">
                            Awaiting Replacement
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* 1B: Currently Assigned Device Card */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700">
              2. Currently Assigned Mobile Device
            </label>

            {!selectedEmployee ? (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-400 text-center">
                Select an employee above to view their currently assigned mobile device.
              </div>
            ) : selectedEmployee.assignedDevices.length === 0 ? (
              <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200 text-xs text-amber-950 space-y-1">
                <div className="font-bold flex items-center space-x-1.5">
                  <PackageCheck className="w-4 h-4 text-amber-700" />
                  <span>
                    {selectedEmployee.employeeName} ({selectedEmployee.employeeId}) has returned their previous device!
                  </span>
                </div>
                <p className="text-[11px] text-amber-800">
                  {selectedEmployee.lastReturnedMobileCode
                    ? `Previously returned device '${selectedEmployee.lastReturnedMobileCode}' (${selectedEmployee.lastReturnedDeviceModel || 'Mobile'}) is now Available in company inventory. Proceed to Step 2 on the right to assign a replacement device.`
                    : 'No active device is currently assigned to this employee. Use Step 2 on the right to assign an Available device.'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {selectedEmployee.assignedDevices.length > 1 && (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedEmployee.assignedDevices.map((d) => (
                      <button
                        key={d.deviceId}
                        type="button"
                        onClick={() => setSelectedReturnDeviceId(d.deviceId)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition ${
                          Number(selectedReturnDeviceId) === d.deviceId
                            ? 'bg-slate-900 text-white border-slate-900'
                            : 'bg-white text-slate-700 border-slate-200'
                        }`}
                      >
                        {d.mobileCode}
                      </button>
                    ))}
                  </div>
                )}

                {currentAssignedDevice && (
                  <div className="p-4 rounded-xl bg-[#f6f9f4] border-2 border-[#68c73a]/40 space-y-2.5">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-[#1a6e3c]">
                          <Smartphone className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="text-sm font-extrabold text-slate-950">
                            {currentAssignedDevice.mobileCode}
                          </div>
                          <div className="text-xs font-semibold text-slate-600">
                            {currentAssignedDevice.brand || 'Apple'}{' '}
                            {currentAssignedDevice.model ||
                              currentAssignedDevice.mobileName ||
                              'iPhone 15'}
                          </div>
                        </div>
                      </div>

                      <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-[#c4f5fc] text-slate-900 border border-cyan-300">
                        Active / Assigned
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1 text-[11px] text-slate-600 border-t border-slate-200/70">
                      <div>
                        <span className="text-slate-400">Assigned Employee:</span>{' '}
                        <strong className="text-slate-900">
                          {selectedEmployee.employeeName} ({selectedEmployee.employeeId})
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-400">Group:</span>{' '}
                        <strong className="text-slate-900">
                          Group {currentAssignedDevice.groupName}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-400">IMEI:</span>{' '}
                        <span className="font-mono text-slate-800">
                          {currentAssignedDevice.imei || '—'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400">Serial:</span>{' '}
                        <span className="font-mono text-slate-800">
                          {currentAssignedDevice.serialNumber || '—'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 1C: Return Condition & Remarks Form */}
          <form onSubmit={handleProcessReturn} className="space-y-3 pt-1">
            <div>
              <label
                htmlFor="return-condition"
                className="block text-xs font-bold text-slate-700 mb-1"
              >
                3. Returned Device Condition <span className="text-rose-500">*</span>
              </label>
              <select
                id="return-condition"
                value={deviceCondition}
                onChange={(e) => setDeviceCondition(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#68c73a]"
              >
                {CONDITION_OPTIONS.map((cond) => (
                  <option key={cond} value={cond}>
                    {cond}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="return-remarks"
                className="block text-xs font-bold text-slate-700 mb-1"
              >
                4. Return Remarks / Inspection Notes
              </label>
              <input
                id="return-remarks"
                type="text"
                placeholder="e.g. Returned charger & cable, minor scratch on case, requested upgrade..."
                value={returnRemarks}
                onChange={(e) => setReturnRemarks(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#68c73a]"
              />
            </div>

            {workflowMode === 'stepped' && canProcess && (
              <button
                type="submit"
                disabled={processingReturn || !currentAssignedDevice}
                className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-[#c8f53b] rounded-xl text-xs font-extrabold tracking-wide transition flex items-center justify-center space-x-2 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>
                  {processingReturn
                    ? 'Receiving Returned Device...'
                    : currentAssignedDevice
                    ? `Receive ${currentAssignedDevice.mobileCode} (Status: Active → Available)`
                    : 'No Active Device to Return'}
                </span>
              </button>
            )}
          </form>
        </div>

        {/* RIGHT COLUMN (6 cols): STEP 2 — DEVICE REPLACEMENT PROCESS */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2.5">
              <span className="w-7 h-7 rounded-lg bg-[#c8f53b] text-slate-950 font-extrabold text-xs flex items-center justify-center">
                2
              </span>
              <div>
                <h2 className="text-base font-extrabold text-slate-900">
                  Step 2: Device Replacement Process
                </h2>
                <p className="text-[11px] text-slate-500">
                  Select a verified Available device from inventory and assign it to{' '}
                  <strong className="text-slate-800">
                    {selectedEmployee?.employeeName || 'the selected employee'}
                  </strong>
                  .
                </p>
              </div>
            </div>
            <ArrowLeftRight className="w-5 h-5 text-[#1a6e3c]" />
          </div>

          {/* Selected Employee Summary Bar */}
          {selectedEmployee && (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2">
                <UserCheck className="w-4 h-4 text-[#1a6e3c]" />
                <div>
                  <span className="text-slate-500">Assigning Replacement To: </span>
                  <strong className="text-slate-950">
                    {selectedEmployee.employeeName}
                  </strong>{' '}
                  <span className="font-mono text-[10px] text-slate-500">
                    ({selectedEmployee.employeeId})
                  </span>
                </div>
              </div>
              {selectedEmployee.lastReturnedMobileCode && (
                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 text-[10px] font-bold">
                  Prev Returned: {selectedEmployee.lastReturnedMobileCode}
                </span>
              )}
            </div>
          )}

          {/* 2A: Search & Filter Available Devices Pool */}
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="block text-xs font-bold text-slate-700">
                1. Currently Available Devices ({filteredAvailableDevices.length} Available)
              </label>
              <div className="flex items-center space-x-1">
                {['ALL', 'Phone', 'New', 'Cass'].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setAvailableCategory(cat)}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                      availableCategory === cat
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {cat === 'ALL' ? 'All' : cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                placeholder="Search Available device by ID, model, brand, or IMEI..."
                value={availableSearch}
                onChange={(e) => setAvailableSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#68c73a]"
              />
            </div>

            <div className="max-h-52 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
              {filteredAvailableDevices.length === 0 ? (
                <div className="p-5 text-center text-xs text-slate-400">
                  No Available unassigned devices match your filter. Return a device in Step 1 to immediately make it Available here.
                </div>
              ) : (
                filteredAvailableDevices.map((dev) => {
                  const isChosen =
                    Number(selectedReplacementId) === dev.deviceId;
                  return (
                    <button
                      type="button"
                      key={dev.deviceId}
                      onClick={() => setSelectedReplacementId(dev.deviceId)}
                      className={`w-full px-3.5 py-2.5 text-left flex items-center justify-between text-xs transition ${
                        isChosen
                          ? 'bg-[#ecfccb]/70 border-l-4 border-[#1a6e3c] font-bold text-slate-950'
                          : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-extrabold text-slate-900">
                            {dev.mobileCode}
                          </span>
                          <span className="text-slate-600 font-medium">
                            {dev.brand || 'Apple'}{' '}
                            {dev.model || dev.mobileName || 'iPhone 15'}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 text-[10px] font-semibold text-slate-600">
                            Group {dev.groupName}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          IMEI: {dev.imei || '—'} · {dev.description || 'In Stock'}
                        </div>
                      </div>

                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 shrink-0">
                        AVAILABLE
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* 2B: Selected Replacement Confirmation Card */}
          {selectedReplacementObj ? (
            <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <div className="font-extrabold text-emerald-950 flex items-center space-x-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>
                    Selected Replacement: {selectedReplacementObj.mobileCode} (
                    {selectedReplacementObj.brand || 'Apple'}{' '}
                    {selectedReplacementObj.model ||
                      selectedReplacementObj.mobileName ||
                      'iPhone 15'}
                    )
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-extrabold">
                  CONFIRMED AVAILABLE
                </span>
              </div>
              <div className="text-[11px] text-emerald-800">
                Status will change from <strong>Available</strong> →{' '}
                <strong>Active / Assigned</strong> under{' '}
                <strong>{selectedEmployee?.employeeName || 'Selected Employee'}</strong>.
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-500 text-center">
              Click any Available device above to confirm availability for replacement assignment.
            </div>
          )}

          {/* 2C: Replacement Remarks & Submit */}
          <form
            onSubmit={
              workflowMode === 'atomic'
                ? handleAtomicReturnAndReplace
                : handleProcessReplacement
            }
            className="space-y-3"
          >
            <div>
              <label
                htmlFor="replace-remarks"
                className="block text-xs font-bold text-slate-700 mb-1"
              >
                2. Replacement Assignment Remarks
              </label>
              <input
                id="replace-remarks"
                type="text"
                placeholder="e.g. Issued replacement unit with SIM transferred & protective case..."
                value={replacementRemarks}
                onChange={(e) => setReplacementRemarks(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#68c73a]"
              />
            </div>

            {canProcess &&
              (workflowMode === 'stepped' ? (
                <button
                  type="submit"
                  disabled={
                    processingReplace ||
                    !selectedEmployee ||
                    !selectedReplacementObj
                  }
                  className="w-full py-2.5 px-4 bg-[#c8f53b] hover:bg-[#b8e629] disabled:opacity-40 text-slate-950 rounded-xl text-xs font-extrabold tracking-wide shadow-xs transition flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>
                    {processingReplace
                      ? 'Assigning Replacement Device...'
                      : selectedReplacementObj && selectedEmployee
                      ? `Assign ${selectedReplacementObj.mobileCode} to ${selectedEmployee.employeeName} (Available → Active)`
                      : 'Select Employee & Available Replacement Device'}
                  </span>
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={
                    processingReplace ||
                    !selectedEmployee ||
                    !currentAssignedDevice ||
                    !selectedReplacementObj
                  }
                  className="w-full py-2.5 px-4 bg-[#c8f53b] hover:bg-[#b8e629] disabled:opacity-40 text-slate-950 rounded-xl text-xs font-extrabold tracking-wide shadow-xs transition flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <ArrowLeftRight className="w-4 h-4" />
                  <span>
                    {processingReplace
                      ? 'Processing Atomic Return & Replacement...'
                      : currentAssignedDevice && selectedReplacementObj
                      ? `Return ${currentAssignedDevice.mobileCode} & Assign ${selectedReplacementObj.mobileCode} to ${selectedEmployee.employeeName}`
                      : 'Select Both Returned Device (Step 1) & Replacement Device (Step 2)'}
                  </span>
                </button>
              ))}
          </form>
        </div>
      </div>

      {/* BOTTOM SECTION: COMPLETE DEVICE RETURN & REPLACEMENT HISTORY TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-[#f6f9f4] border border-slate-200 text-[#1a6e3c]">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                Device Return &amp; Replacement History ({filteredHistory.length})
              </h2>
              <p className="text-xs text-slate-500">
                Permanent, non-deletable audit trail of all returned devices, replacement assignments, device conditions, and administrators.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                placeholder="Search history by employee, ID, condition..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                className="w-56 pl-8 pr-3 py-1.5 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none"
              />
            </div>

            <button
              type="button"
              onClick={handleExportHistoryCsv}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 transition"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export History CSV</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          {filteredHistory.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-400">
              No device return or replacement transactions recorded yet. Process a return or replacement above to see the live audit record here.
            </div>
          ) : (
            <table className="w-full text-left border-collapse min-w-[980px] text-xs">
              <thead>
                <tr className="bg-slate-50 border-y border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-2.5 px-3">EMPLOYEE ID &amp; NAME</th>
                  <th className="py-2.5 px-3">PREVIOUSLY ASSIGNED ID</th>
                  <th className="py-2.5 px-3">RETURNED DEVICE ID</th>
                  <th className="py-2.5 px-3">REPLACEMENT DEVICE ID</th>
                  <th className="py-2.5 px-3">RETURN DATE</th>
                  <th className="py-2.5 px-3">NEW ASSIGNMENT DATE</th>
                  <th className="py-2.5 px-3">DEVICE CONDITION</th>
                  <th className="py-2.5 px-3">PROCESSED BY (RETURN)</th>
                  <th className="py-2.5 px-3">ASSIGNED BY (REPLACE)</th>
                  <th className="py-2.5 px-3">REMARKS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredHistory.map((item) => (
                  <tr key={item.transactionId} className="hover:bg-lime-50/40">
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-900">
                        {item.employeeName}
                      </div>
                      <div className="text-[10px] font-mono text-slate-500">
                        {item.employeeId} · Group {item.groupName || 'General'}
                      </div>
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-700">
                      {item.previouslyAssignedMobileCode || '—'}
                      {item.previouslyAssignedDeviceModel && (
                        <div className="text-[10px] text-slate-400">
                          {item.previouslyAssignedDeviceModel}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      {item.returnedMobileCode ? (
                        <div>
                          <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200 font-bold text-[11px]">
                            {item.returnedMobileCode}
                          </span>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {item.returnedDeviceModel || 'Now Available'}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      {item.replacementMobileCode ? (
                        <div>
                          <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-[11px]">
                            {item.replacementMobileCode}
                          </span>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {item.replacementDeviceModel || 'Active / Assigned'}
                          </div>
                        </div>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-500 text-[10px] font-semibold">
                          Pending / Return Only
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-slate-700 font-mono text-[11px]">
                      {item.returnDateColombo || '—'}
                    </td>
                    <td className="py-3 px-3 text-slate-700 font-mono text-[11px]">
                      {item.newAssignmentDateColombo || '—'}
                    </td>
                    <td className="py-3 px-3">
                      {item.deviceCondition ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800">
                          {item.deviceCondition}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-3 px-3 font-medium text-slate-700">
                      {item.returnProcessedByName || '—'}
                    </td>
                    <td className="py-3 px-3 font-medium text-slate-700">
                      {item.replacementAssignedByName || '—'}
                    </td>
                    <td className="py-3 px-3 text-slate-600 max-w-[200px] truncate" title={item.remarks || ''}>
                      {item.remarks || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
