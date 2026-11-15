import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Check,
  X,
  RotateCcw,
  RefreshCw,
  CheckCircle2,
  Plus,
  Edit2,
  Trash2,
  Lock,
  Unlock,
  SlidersHorizontal,
  ArrowRightLeft,
  AlertTriangle
} from 'lucide-react';
import { api } from '../api';

// Default "What Employee CAN Do" and "What Employee CANNOT Do" per function
const DEFAULT_EMPLOYEE_RULES = {
  notifications: {
    canDo: [
      'View real-time missing-phone alerts and system notifications',
      'Filter notifications by unread status',
      'Mark notifications as read'
    ],
    cannotDo: [
      'Cannot create new system notification alerts (Developer only)',
      'Cannot edit notification messages, alert types, or priority (Developer only)',
      'Cannot delete notifications from the notification panel (Developer only)'
    ]
  },
  checking_sessions: {
    canDo: [
      'Access the Checking Sessions tab and view active 2-hour session progress',
      'View recent checking sessions summary and completion counts',
      'Filter session phones by group and check status'
    ],
    cannotDo: [
      'Cannot edit or delete checking session records (Developer only)',
      'Cannot start or complete 2-hour sessions (unless Start Checking Sessions is enabled)',
      'Cannot mark phones Available or Missing (unless Mark Availability is enabled)'
    ]
  },
  view_dashboard: {
    canDo: [
      'View live mobile phone availability KPIs and counts',
      'View active 2-hour checking session progress and group status',
      'View recent checking activity feed'
    ],
    cannotDo: [
      'Cannot start or cancel 2-hour checking sessions from dashboard',
      'Cannot modify dashboard KPIs or global interval settings (Developer only)'
    ]
  },
  manage_mobile_phones: {
    canDo: [
      'View all company mobile phones and search by Mobile ID',
      'Filter mobile phones by group and availability status'
    ],
    cannotDo: [
      'Cannot register, edit, or delete mobile phones (unless Edit access is unlocked)',
      'Cannot purge device audit history (Developer only)'
    ]
  },
  manage_groups: {
    canDo: [
      'View department and employee device groups',
      'Inspect total, available, and missing phones per group'
    ],
    cannotDo: [
      'Cannot create, rename, or delete device groups (unless Edit access is unlocked)',
      'Cannot permanently delete group check records (Developer only)'
    ]
  },
  start_checking_sessions: {
    canDo: [
      'Start a new 2-hour mobile phone checking session',
      'Complete an active checking session with summary notes'
    ],
    cannotDo: [
      'Cannot edit or delete completed session records (Developer only)',
      'Cannot change global 2-hour checking interval settings (Developer only)'
    ]
  },
  mark_availability: {
    canDo: [
      'Mark mobile phones as Available or Missing during an active checking session',
      'Add inspection notes for individual phones during checking'
    ],
    cannotDo: [
      'Cannot delete historical check logs or alter past sessions (Developer only)'
    ]
  },
  view_checking_history: {
    canDo: [
      'View historical checking records across all 2-hour sessions',
      'Filter checking history by Mobile ID, group, status, and date'
    ],
    cannotDo: [
      'Cannot edit historical check status or notes (Developer only)',
      'Cannot delete checking history records (Developer only)'
    ]
  },
  view_missing_reports: {
    canDo: [
      'View Missing Incidents list and Daily Check Reports calendar',
      'Select any calendar date to filter checking sessions, times, and missing items'
    ],
    cannotDo: [
      'Cannot create, edit, or delete missing incident records (Developer only)',
      'Cannot change incident status (Open / Recovered / Escalated)'
    ]
  },
  add_user_accounts: {
    canDo: [
      'View user account directory and assigned roles'
    ],
    cannotDo: [
      'Cannot create, edit, or delete Developer accounts (Developer only)',
      'Cannot modify role permissions or system configuration (Developer only)'
    ]
  }
};

function getDefaultRulesForFunction(functionKey, functionName) {
  const key = (functionKey || '').toLowerCase().trim().replace(/\s+/g, '_');
  if (DEFAULT_EMPLOYEE_RULES[key]) {
    return {
      canDo: [...DEFAULT_EMPLOYEE_RULES[key].canDo],
      cannotDo: [...DEFAULT_EMPLOYEE_RULES[key].cannotDo]
    };
  }
  const label = functionName?.trim() || functionKey || 'this section';
  return {
    canDo: [
      `View and access the ${label} section in read-only mode`,
      `Filter and inspect records in ${label}`
    ],
    cannotDo: [
      `Cannot create, edit, or delete records in ${label} panel (Developer only)`,
      `Cannot modify configuration or settings for ${label} (Developer only)`
    ]
  };
}

export default function PermissionsView({ onPermissionsChange }) {
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [togglingCell, setTogglingCell] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState('');

  // CRUD Modal State for Adding / Editing a Function
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRow, setEditingRow] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    functionKey: '',
    functionName: '',
    description: '',
    developer: true,
    itAdmin: true,
    employee: false,
    employeeCanEdit: false,
    employeeCanDo: [],
    employeeCannotDo: []
  });

  // Pre-Assignment Popup State ("What Employee CAN Do & CANNOT Do")
  const [empPopup, setEmpPopup] = useState({
    open: false,
    mode: 'toggle', // 'toggle' | 'editRules' | 'fromForm'
    functionKey: '',
    functionName: '',
    description: '',
    employeeCanEdit: false,
    canDoList: [],
    cannotDoList: [],
    newCanDoText: '',
    newCannotDoText: ''
  });

  const loadPermissions = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getPermissions();
      setPermissions(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Failed to load user permissions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPermissions();
  }, []);

  // Open the Employee Access & Restrictions Popup before assigning or when editing rules
  const openEmployeeAccessPopup = ({
    mode,
    row,
    customKey = '',
    customName = '',
    customDesc = '',
    existingCanEdit = false,
    existingCanDo = null,
    existingCannotDo = null
  }) => {
    const fnKey = row ? row.functionKey : customKey || customName.toLowerCase().replace(/\s+/g, '_');
    const fnName = row ? row.functionName : customName || 'New Function';
    const fnDesc = row ? row.description : customDesc || '';
    const defaults = getDefaultRulesForFunction(fnKey, fnName);

    const canDo =
      Array.isArray(existingCanDo) && existingCanDo.length > 0
        ? [...existingCanDo]
        : row && Array.isArray(row.employeeCanDo) && row.employeeCanDo.length > 0
        ? [...row.employeeCanDo]
        : defaults.canDo;

    const cannotDo =
      Array.isArray(existingCannotDo) && existingCannotDo.length > 0
        ? [...existingCannotDo]
        : row && Array.isArray(row.employeeCannotDo) && row.employeeCannotDo.length > 0
        ? [...row.employeeCannotDo]
        : defaults.cannotDo;

    setEmpPopup({
      open: true,
      mode,
      functionKey: fnKey,
      functionName: fnName,
      description: fnDesc,
      employeeCanEdit: Boolean(row ? row.employeeCanEdit : existingCanEdit),
      canDoList: canDo,
      cannotDoList: cannotDo,
      newCanDoText: '',
      newCannotDoText: ''
    });
  };

  const handleToggle = async (row, role, currentVal) => {
    const nextVal = !currentVal;

    // CRITICAL REQUIREMENT:
    // Whenever Developer assigns (turns ON) a function for Employee, immediately open the
    // "What Employee CAN Do & CANNOT Do" popup BEFORE assigning!
    if (role === 'Employee' && nextVal === true) {
      openEmployeeAccessPopup({
        mode: 'toggle',
        row
      });
      return;
    }

    await executeToggle(row.functionKey, role, nextVal);
  };

  const executeToggle = async (functionKey, role, nextVal, extraRules = {}) => {
    const cellId = `${functionKey}:${role}`;
    setTogglingCell(cellId);
    setError('');
    setStatusMessage('');

    try {
      const updatedRow = await api.togglePermission(functionKey, role, nextVal, extraRules);
      setPermissions((prev) =>
        prev.map((row) =>
          row.functionKey === functionKey ? updatedRow : row
        )
      );
      const roleDisplay = role === 'ITAdmin' ? 'IT Admin' : role;
      setStatusMessage(
        `${updatedRow.functionName} is now ${nextVal ? 'Active' : 'Inactive'} for ${roleDisplay}${
          role === 'Employee' && nextVal
            ? ` (${updatedRow.employeeCanEdit ? 'Edit Unlocked' : 'Read-Only / Edit Locked to Developer'})`
            : ''
        }.`
      );
      if (onPermissionsChange) onPermissionsChange();
    } catch (err) {
      setError(err.message || 'Failed to update permission');
      await loadPermissions();
    } finally {
      setTogglingCell(null);
    }
  };

  // Confirm button handler inside the Employee Access & Restrictions Popup
  const handleConfirmEmployeePopup = async () => {
    const cleanedCanDo = empPopup.canDoList.map((s) => s.trim()).filter(Boolean);
    const cleanedCannotDo = empPopup.cannotDoList.map((s) => s.trim()).filter(Boolean);

    if (empPopup.mode === 'fromForm') {
      // Save rules into the Add/Edit Function form state and keep Employee checked
      setFormData((prev) => ({
        ...prev,
        employee: true,
        employeeCanEdit: empPopup.employeeCanEdit,
        employeeCanDo: cleanedCanDo,
        employeeCannotDo: cleanedCannotDo
      }));
      setEmpPopup((prev) => ({ ...prev, open: false }));
      return;
    }

    // Mode 'toggle' or 'editRules': save directly to backend and activate for Employee
    setEmpPopup((prev) => ({ ...prev, open: false }));
    await executeToggle(empPopup.functionKey, 'Employee', true, {
      employeeCanEdit: empPopup.employeeCanEdit,
      employeeCanDo: cleanedCanDo,
      employeeCannotDo: cleanedCannotDo
    });
  };

  const openAddModal = () => {
    setEditingRow(null);
    const defaults = getDefaultRulesForFunction('', 'New Function');
    setFormData({
      functionKey: '',
      functionName: '',
      description: '',
      developer: true,
      itAdmin: true,
      employee: false,
      employeeCanEdit: false,
      employeeCanDo: defaults.canDo,
      employeeCannotDo: defaults.cannotDo
    });
    setModalOpen(true);
  };

  const openEditModal = (row) => {
    setEditingRow(row);
    const defaults = getDefaultRulesForFunction(row.functionKey, row.functionName);
    setFormData({
      functionKey: row.functionKey,
      functionName: row.functionName,
      description: row.description || '',
      developer: row.developer,
      itAdmin: row.itAdmin,
      employee: row.employee,
      employeeCanEdit: Boolean(row.employeeCanEdit),
      employeeCanDo:
        Array.isArray(row.employeeCanDo) && row.employeeCanDo.length > 0
          ? [...row.employeeCanDo]
          : defaults.canDo,
      employeeCannotDo:
        Array.isArray(row.employeeCannotDo) && row.employeeCannotDo.length > 0
          ? [...row.employeeCannotDo]
          : defaults.cannotDo
    });
    setModalOpen(true);
  };

  // When Developer checks "Employee" inside the Add/Edit Function Modal, immediately open the popup!
  const handleFormEmployeeCheckbox = (checked) => {
    if (checked) {
      const fnName = formData.functionName.trim() || 'New Function';
      const fnKey = formData.functionKey.trim() || fnName.toLowerCase().replace(/\s+/g, '_');
      const defaults = getDefaultRulesForFunction(fnKey, fnName);

      openEmployeeAccessPopup({
        mode: 'fromForm',
        row: editingRow,
        customKey: fnKey,
        customName: fnName,
        customDesc: formData.description,
        existingCanEdit: formData.employeeCanEdit,
        existingCanDo:
          formData.employeeCanDo && formData.employeeCanDo.length > 0
            ? formData.employeeCanDo
            : defaults.canDo,
        existingCannotDo:
          formData.employeeCannotDo && formData.employeeCannotDo.length > 0
            ? formData.employeeCannotDo
            : defaults.cannotDo
      });
    } else {
      setFormData((prev) => ({
        ...prev,
        employee: false,
        employeeCanEdit: false
      }));
    }
  };

  const handleSaveFunction = async (e) => {
    e.preventDefault();
    if (!formData.functionName.trim()) {
      setError('Function name is required.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const defaults = getDefaultRulesForFunction(
        formData.functionKey || formData.functionName,
        formData.functionName
      );
      const payloadCanDo =
        formData.employeeCanDo && formData.employeeCanDo.length > 0
          ? formData.employeeCanDo
          : defaults.canDo;
      const payloadCannotDo =
        formData.employeeCannotDo && formData.employeeCannotDo.length > 0
          ? formData.employeeCannotDo
          : defaults.cannotDo;

      if (editingRow) {
        await api.updatePermission(editingRow.functionKey, {
          functionName: formData.functionName.trim(),
          description: formData.description.trim(),
          developer: formData.developer,
          itAdmin: formData.itAdmin,
          employee: formData.employee,
          employeeCanEdit: formData.employee ? formData.employeeCanEdit : false,
          employeeCanDo: payloadCanDo,
          employeeCannotDo: payloadCannotDo
        });
        setStatusMessage(`Updated function "${formData.functionName.trim()}".`);
      } else {
        await api.createPermission({
          functionKey: formData.functionKey.trim() || formData.functionName.trim(),
          functionName: formData.functionName.trim(),
          description: formData.description.trim(),
          developer: formData.developer,
          itAdmin: formData.itAdmin,
          employee: formData.employee,
          employeeCanEdit: formData.employee ? formData.employeeCanEdit : false,
          employeeCanDo: payloadCanDo,
          employeeCannotDo: payloadCannotDo
        });
        setStatusMessage(`Added new function "${formData.functionName.trim()}".`);
      }
      setModalOpen(false);
      await loadPermissions();
      if (onPermissionsChange) onPermissionsChange();
    } catch (err) {
      setError(err.message || 'Failed to save function permission');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteFunction = async (row) => {
    if (
      !window.confirm(
        `Delete function "${row.functionName}" from the permission matrix?`
      )
    ) {
      return;
    }

    setError('');
    try {
      await api.deletePermission(row.functionKey);
      setStatusMessage(`Deleted function "${row.functionName}".`);
      await loadPermissions();
      if (onPermissionsChange) onPermissionsChange();
    } catch (err) {
      setError(err.message || 'Failed to delete function permission');
    }
  };

  const handleResetDefaults = async () => {
    if (
      !window.confirm(
        'Reset all role permissions back to the default SRS configuration?'
      )
    ) {
      return;
    }

    setLoading(true);
    setError('');
    try {
      const resetData = await api.resetPermissions();
      setPermissions(resetData);
      setStatusMessage('All role permissions restored to default settings.');
      if (onPermissionsChange) onPermissionsChange();
    } catch (err) {
      setError(err.message || 'Failed to reset permissions');
    } finally {
      setLoading(false);
    }
  };

  // Toggle "Employee Can Edit Panel" inside the popup and adjust rules automatically
  const handlePopupToggleCanEdit = (allowEdit) => {
    setEmpPopup((prev) => {
      const label = prev.functionName || 'this section';
      let nextCanDo = [...prev.canDoList];
      let nextCannotDo = [...prev.cannotDoList];

      if (allowEdit) {
        const editRule = `Create and edit records in ${label} panel`;
        if (!nextCanDo.some((item) => item.toLowerCase().includes('edit'))) {
          nextCanDo.push(editRule);
        }
        nextCannotDo = nextCannotDo.filter(
          (item) => !item.toLowerCase().includes('cannot edit') && !item.toLowerCase().includes('cannot create')
        );
        if (nextCannotDo.length === 0) {
          nextCannotDo.push(`Cannot delete system-critical audit logs in ${label} (Developer only)`);
        }
      } else {
        nextCanDo = nextCanDo.filter(
          (item) => !item.toLowerCase().includes('create and edit') && !item.toLowerCase().includes('edit records')
        );
        const defaults = getDefaultRulesForFunction(prev.functionKey, prev.functionName);
        defaults.cannotDo.forEach((rule) => {
          if (!nextCannotDo.includes(rule)) {
            nextCannotDo.push(rule);
          }
        });
      }

      return {
        ...prev,
        employeeCanEdit: allowEdit,
        canDoList: nextCanDo,
        cannotDoList: nextCannotDo
      };
    });
  };

  const renderRoleCell = (row, roleKey, isEnabled) => {
    const cellId = `${row.functionKey}:${roleKey}`;
    const isBusy = togglingCell === cellId;
    const roleLabel = roleKey === 'ITAdmin' ? 'IT Admin' : roleKey;

    return (
      <div className="flex flex-col items-center justify-center space-y-1.5">
        <div className="inline-flex items-center justify-center space-x-2.5">
          <span
            className={`inline-flex items-center justify-center w-6 h-6 rounded-md text-xs font-extrabold transition ${
              isEnabled
                ? 'bg-emerald-500/15 text-emerald-500'
                : 'bg-rose-500/15 text-rose-500'
            }`}
            aria-hidden="true"
          >
            {isEnabled ? (
              <Check className="w-4 h-4 stroke-[2.75]" />
            ) : (
              <X className="w-4 h-4 stroke-[2.75]" />
            )}
          </span>

          <button
            type="button"
            role="switch"
            aria-checked={isEnabled}
            aria-label={`${row.functionName} for ${roleLabel}`}
            disabled={isBusy}
            onClick={() => handleToggle(row, roleKey, isEnabled)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:opacity-50 ${
              isEnabled ? 'bg-emerald-600' : 'bg-slate-300'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                isEnabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>

          <span
            className={`hidden xl:inline-block text-[11px] font-semibold w-14 text-left ${
              isEnabled ? 'text-emerald-600' : 'text-rose-500'
            }`}
          >
            {isEnabled ? 'Active' : 'Inactive'}
          </span>
        </div>

        {/* For Employee Column: show whether Edit is locked to Developer and a button to view/edit Can Do & Cannot Do */}
        {roleKey === 'Employee' && (
          <button
            type="button"
            onClick={() =>
              openEmployeeAccessPopup({
                mode: isEnabled ? 'editRules' : 'toggle',
                row
              })
            }
            className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border transition ${
              isEnabled
                ? row.employeeCanEdit
                  ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                  : 'bg-blue-50 text-[#1e4e8c] border-blue-200 hover:bg-blue-100'
                : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200/70'
            }`}
            title="View and edit what Employee CAN do and CANNOT do"
          >
            <SlidersHorizontal className="w-3 h-3 shrink-0" />
            <span>
              {isEnabled
                ? row.employeeCanEdit
                  ? 'Can Edit · Rules'
                  : 'View Only · Rules'
                : 'Preview Rules'}
            </span>
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-[11px] font-bold tracking-wider uppercase text-[#1a6e3c]">
            ADMINISTRATION · ACCESS GOVERNANCE
          </div>
          <h1 className="text-2xl sm:text-[28px] font-extrabold text-slate-950 tracking-tight mt-0.5 flex items-center space-x-2.5">
            <ShieldCheck className="w-6 h-6 text-[#1a6e3c] shrink-0" />
            <span>User Permissions</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Assign functions to roles and configure exact &ldquo;Can Do&rdquo; &amp; &ldquo;Cannot Do&rdquo; rules before assigning to Employees. Only Developer has full edit access.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={loadPermissions}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-bold text-slate-800 shadow-2xs transition cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={handleResetDefaults}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-bold text-slate-800 shadow-2xs transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span>Reset defaults</span>
          </button>

          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex items-center space-x-1.5 px-4 py-2 bg-[#c8f53b] hover:bg-[#b8e629] text-slate-950 rounded-xl text-xs font-extrabold shadow-xs transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Function</span>
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      {statusMessage && (
        <div
          role="status"
          className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs font-semibold text-emerald-800"
        >
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{statusMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusMessage('')}
            className="text-emerald-600 hover:text-emerald-800 text-xs font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700"
        >
          {error}
        </div>
      )}

      {/* Permission Matrix Table Card */}
      <div className="bg-white rounded-[28px] border-2 border-slate-100 shadow-sm overflow-hidden p-4 sm:p-6">
        <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2
              id="permissions-matrix-heading"
              className="text-sm font-bold text-slate-900"
            >
              Role Function Matrix
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              When assigning any function to <strong>Employee</strong>, a confirmation popup appears so you can review and edit what Employee CAN and CANNOT do.
            </p>
          </div>
          <div className="flex items-center space-x-4 text-xs font-semibold">
            <span className="inline-flex items-center space-x-1.5 text-emerald-600">
              <Check className="w-3.5 h-3.5 stroke-[2.75]" />
              <span>Active</span>
            </span>
            <span className="inline-flex items-center space-x-1.5 text-rose-500">
              <X className="w-3.5 h-3.5 stroke-[2.75]" />
              <span>Inactive</span>
            </span>
          </div>
        </div>

        <div
          role="region"
          aria-labelledby="permissions-matrix-heading"
          tabIndex={0}
          className="overflow-x-auto focus:outline-none"
        >
          {loading ? (
            <div className="p-12 text-center text-xs text-slate-400">
              Loading permission matrix...
            </div>
          ) : (
            <table className="w-full text-left border-collapse min-w-[760px]">
              <thead>
                <tr className="bg-[#0f172a] text-white text-xs font-bold border-b border-slate-800">
                  <th className="py-3.5 px-5 w-[38%]">Function &amp; Employee Scope</th>
                  <th className="py-3.5 px-4 text-center">Developer</th>
                  <th className="py-3.5 px-4 text-center">IT Admin</th>
                  <th className="py-3.5 px-4 text-center">Employee</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80 text-xs">
                {permissions.map((row) => (
                  <tr
                    key={row.functionKey}
                    className="hover:bg-slate-50/90 transition align-top"
                  >
                    <th
                      scope="row"
                      className="py-4 px-5 font-semibold text-slate-900 text-left"
                    >
                      <div className="flex items-center flex-wrap gap-2">
                        <span className="text-sm font-bold text-slate-900">
                          {row.functionName}
                        </span>
                        {row.employee && (
                          <span
                            className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              row.employeeCanEdit
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {row.employeeCanEdit ? (
                              <>
                                <Unlock className="w-2.5 h-2.5" />
                                <span>Employee: Can Edit</span>
                              </>
                            ) : (
                              <>
                                <Lock className="w-2.5 h-2.5" />
                                <span>Employee: View Only (Developer Full Access)</span>
                              </>
                            )}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] font-normal text-slate-500 mt-0.5">
                        {row.description}
                      </div>

                      {/* Compact Summary of Employee Can Do / Cannot Do when assigned */}
                      {row.employee && (
                        <div className="mt-2.5 pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-normal">
                          <div className="bg-emerald-50/70 border border-emerald-200/70 rounded-lg p-2">
                            <div className="font-bold text-emerald-800 mb-1 flex items-center space-x-1">
                              <Check className="w-3 h-3 stroke-[2.5]" />
                              <span>Employee CAN Do:</span>
                            </div>
                            <ul className="space-y-0.5 text-emerald-900">
                              {(row.employeeCanDo || []).slice(0, 2).map((item, idx) => (
                                <li key={idx} className="truncate" title={item}>
                                  • {item}
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div className="bg-rose-50/70 border border-rose-200/70 rounded-lg p-2">
                            <div className="font-bold text-rose-800 mb-1 flex items-center space-x-1">
                              <X className="w-3 h-3 stroke-[2.5]" />
                              <span>Employee CANNOT Do:</span>
                            </div>
                            <ul className="space-y-0.5 text-rose-900">
                              {(row.employeeCannotDo || []).slice(0, 2).map((item, idx) => (
                                <li key={idx} className="truncate" title={item}>
                                  • {item}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}
                    </th>

                    {/* Developer Column */}
                    <td className="py-4 px-4 text-center">
                      {renderRoleCell(row, 'Developer', row.developer)}
                    </td>

                    {/* IT Admin Column */}
                    <td className="py-4 px-4 text-center">
                      {renderRoleCell(row, 'ITAdmin', row.itAdmin)}
                    </td>

                    {/* Employee Column */}
                    <td className="py-4 px-4 text-center">
                      {renderRoleCell(row, 'Employee', row.employee)}
                    </td>

                    {/* CRUD Actions Column */}
                    <td className="py-4 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center space-x-1">
                        <button
                          type="button"
                          onClick={() => openEditModal(row)}
                          title={`Edit ${row.functionName}`}
                          className="p-1.5 text-slate-500 hover:text-[#1e4e8c] hover:bg-blue-50 rounded-lg transition"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteFunction(row)}
                          title={`Delete ${row.functionName}`}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add / Edit Function Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">
                {editingRow ? `Edit Function: ${editingRow.functionName}` : 'Add New System Function'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveFunction} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Function Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Notifications or Export Audit Logs"
                  value={formData.functionName}
                  onChange={(e) =>
                    setFormData({ ...formData, functionName: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>

              {!editingRow && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Function Key (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. export_audit_logs (auto-generated if blank)"
                    value={formData.functionKey}
                    onChange={(e) =>
                      setFormData({ ...formData, functionKey: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-slate-800"
                  />
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  placeholder="Short description of what this function allows"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800"
                />
              </div>

              <div className="pt-2 space-y-2">
                <div className="font-semibold text-slate-700">
                  Assign to Roles (Checking &ldquo;Employee&rdquo; opens the Access &amp; Restrictions popup)
                </div>
                <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.developer}
                      onChange={(e) =>
                        setFormData({ ...formData, developer: e.target.checked })
                      }
                      className="rounded border-slate-300 text-[#1e4e8c]"
                    />
                    <span className="font-semibold text-slate-800">Developer</span>
                  </label>

                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.itAdmin}
                      onChange={(e) =>
                        setFormData({ ...formData, itAdmin: e.target.checked })
                      }
                      className="rounded border-slate-300 text-[#1e4e8c]"
                    />
                    <span className="font-semibold text-slate-800">IT Admin</span>
                  </label>

                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.employee}
                      onChange={(e) => handleFormEmployeeCheckbox(e.target.checked)}
                      className="rounded border-slate-300 text-[#1e4e8c]"
                    />
                    <span className="font-semibold text-slate-800">Employee</span>
                  </label>
                </div>

                {formData.employee && (
                  <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl flex items-center justify-between">
                    <div>
                      <div className="font-bold text-[#1e4e8c]">
                        Employee Access Configured:{' '}
                        {formData.employeeCanEdit
                          ? 'Can Edit Panel'
                          : 'View Only (Edit Locked to Developer)'}
                      </div>
                      <div className="text-[11px] text-slate-600 mt-0.5">
                        {formData.employeeCanDo.length} allowed actions ·{' '}
                        {formData.employeeCannotDo.length} restrictions
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        openEmployeeAccessPopup({
                          mode: 'fromForm',
                          row: editingRow,
                          customKey: formData.functionKey,
                          customName: formData.functionName,
                          customDesc: formData.description,
                          existingCanEdit: formData.employeeCanEdit,
                          existingCanDo: formData.employeeCanDo,
                          existingCannotDo: formData.employeeCannotDo
                        })
                      }
                      className="px-3 py-1.5 bg-white hover:bg-blue-50 text-[#1e4e8c] border border-blue-300 rounded-lg font-semibold text-xs transition"
                    >
                      Edit Can / Cannot Do
                    </button>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-[#1e4e8c] hover:bg-[#163b6b] text-white rounded-lg font-semibold disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingRow ? 'Update Function' : 'Create Function'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRE-ASSIGNMENT POPUP: What Employee CAN Do & What Employee CANNOT Do */}
      {empPopup.open && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden my-8">
            {/* Popup Header */}
            <div className="px-6 py-4 bg-[#0f172a] text-white flex items-start justify-between gap-4">
              <div>
                <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-400/30 mb-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Pre-Assignment Access &amp; Restrictions Review</span>
                </div>
                <h3 className="text-base sm:text-lg font-bold text-white">
                  Assign &ldquo;{empPopup.functionName}&rdquo; to Employee
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Review and edit what an <strong>Employee</strong> can do and cannot do before assigning this function.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEmpPopup((prev) => ({ ...prev, open: false }))}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Popup Body */}
            <div className="p-6 space-y-5 text-xs max-h-[75vh] overflow-y-auto">
              {/* Developer Exclusive Full Access Callout + Panel Edit Switch */}
              <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-slate-900">
                      Panel Editing Protection — Developer Has Full Access
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">
                      By default, Employees only get <strong>Read-Only / View</strong> access to{' '}
                      <strong>{empPopup.functionName}</strong> and <strong>cannot edit, create, or delete</strong> panel records. Only Developer has full CRUD access.
                    </p>
                  </div>
                </div>

                <div className="shrink-0 flex items-center space-x-2 bg-white px-3 py-2 rounded-lg border border-amber-200">
                  <input
                    id="emp-can-edit-toggle"
                    type="checkbox"
                    checked={empPopup.employeeCanEdit}
                    onChange={(e) => handlePopupToggleCanEdit(e.target.checked)}
                    className="rounded border-slate-300 text-[#1e4e8c]"
                  />
                  <label
                    htmlFor="emp-can-edit-toggle"
                    className="font-bold text-slate-800 cursor-pointer select-none"
                  >
                    Allow Employee Edit
                  </label>
                </div>
              </div>

              {/* Two Editable Columns: What Employee CAN Do vs What Employee CANNOT Do */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* LEFT COLUMN: WHAT EMPLOYEE CAN DO */}
                <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-4 flex flex-col justify-between space-y-3">
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between border-b border-emerald-200/80 pb-2">
                      <div className="flex items-center space-x-1.5 font-bold text-emerald-900 text-sm">
                        <Check className="w-4 h-4 text-emerald-600 stroke-[2.75]" />
                        <span>What Employee CAN Do</span>
                      </div>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        {empPopup.canDoList.length} Allowed
                      </span>
                    </div>

                    {empPopup.canDoList.length === 0 ? (
                      <div className="text-xs text-emerald-700/70 italic py-2">
                        No allowed actions listed. Add one below.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {empPopup.canDoList.map((item, idx) => (
                          <div
                            key={idx}
                            className="flex items-center space-x-1.5 bg-white p-1.5 rounded-lg border border-emerald-200 shadow-2xs"
                          >
                            <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 ml-1" />
                            <input
                              type="text"
                              value={item}
                              onChange={(e) => {
                                const updated = [...empPopup.canDoList];
                                updated[idx] = e.target.value;
                                setEmpPopup({ ...empPopup, canDoList: updated });
                              }}
                              className="flex-1 text-xs text-slate-800 bg-transparent focus:outline-none focus:bg-slate-50 px-1 py-0.5 rounded"
                            />
                            <button
                              type="button"
                              title="Move to Cannot Do"
                              onClick={() => {
                                const moved = empPopup.canDoList[idx];
                                setEmpPopup({
                                  ...empPopup,
                                  canDoList: empPopup.canDoList.filter((_, i) => i !== idx),
                                  cannotDoList: [...empPopup.cannotDoList, `Cannot: ${moved}`]
                                });
                              }}
                              className="p-1 text-slate-400 hover:text-amber-600 rounded"
                            >
                              <ArrowRightLeft className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              title="Remove item"
                              onClick={() =>
                                setEmpPopup({
                                  ...empPopup,
                                  canDoList: empPopup.canDoList.filter((_, i) => i !== idx)
                                })
                              }
                              className="p-1 text-slate-400 hover:text-rose-600 rounded"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Add new "Can Do" item */}
                  <div className="pt-2 border-t border-emerald-200/70 flex items-center space-x-1.5">
                    <input
                      type="text"
                      placeholder="Add what Employee can do..."
                      value={empPopup.newCanDoText}
                      onChange={(e) =>
                        setEmpPopup({ ...empPopup, newCanDoText: e.target.value })
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (empPopup.newCanDoText.trim()) {
                            setEmpPopup({
                              ...empPopup,
                              canDoList: [...empPopup.canDoList, empPopup.newCanDoText.trim()],
                              newCanDoText: ''
                            });
                          }
                        }
                      }}
                      className="flex-1 px-2.5 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs text-slate-800"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!empPopup.newCanDoText.trim()) return;
                        setEmpPopup({
                          ...empPopup,
                          canDoList: [...empPopup.canDoList, empPopup.newCanDoText.trim()],
                          newCanDoText: ''
                        });
                      }}
                      className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-xs shrink-0"
                    >
                      + Add
                    </button>
                  </div>
                </div>

                {/* RIGHT COLUMN: WHAT EMPLOYEE CANNOT DO */}
                <div className="bg-rose-50/60 border border-rose-200 rounded-xl p-4 flex flex-col justify-between space-y-3">
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between border-b border-rose-200/80 pb-2">
                      <div className="flex items-center space-x-1.5 font-bold text-rose-900 text-sm">
                        <X className="w-4 h-4 text-rose-600 stroke-[2.75]" />
                        <span>What Employee CANNOT Do</span>
                      </div>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                        {empPopup.cannotDoList.length} Restricted
                      </span>
                    </div>

                    {empPopup.cannotDoList.length === 0 ? (
                      <div className="text-xs text-rose-700/70 italic py-2">
                        No restrictions listed. Add one below.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {empPopup.cannotDoList.map((item, idx) => (
                          <div
                            key={idx}
                            className="flex items-center space-x-1.5 bg-white p-1.5 rounded-lg border border-rose-200 shadow-2xs"
                          >
                            <X className="w-3.5 h-3.5 text-rose-600 shrink-0 ml-1" />
                            <input
                              type="text"
                              value={item}
                              onChange={(e) => {
                                const updated = [...empPopup.cannotDoList];
                                updated[idx] = e.target.value;
                                setEmpPopup({ ...empPopup, cannotDoList: updated });
                              }}
                              className="flex-1 text-xs text-slate-800 bg-transparent focus:outline-none focus:bg-slate-50 px-1 py-0.5 rounded"
                            />
                            <button
                              type="button"
                              title="Move to Can Do"
                              onClick={() => {
                                const moved = empPopup.cannotDoList[idx].replace(/^Cannot:\s*/i, '');
                                setEmpPopup({
                                  ...empPopup,
                                  cannotDoList: empPopup.cannotDoList.filter((_, i) => i !== idx),
                                  canDoList: [...empPopup.canDoList, moved]
                                });
                              }}
                              className="p-1 text-slate-400 hover:text-emerald-600 rounded"
                            >
                              <ArrowRightLeft className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              title="Remove restriction"
                              onClick={() =>
                                setEmpPopup({
                                  ...empPopup,
                                  cannotDoList: empPopup.cannotDoList.filter((_, i) => i !== idx)
                                })
                              }
                              className="p-1 text-slate-400 hover:text-rose-600 rounded"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Add new "Cannot Do" item */}
                  <div className="pt-2 border-t border-rose-200/70 flex items-center space-x-1.5">
                    <input
                      type="text"
                      placeholder="Add what Employee cannot do..."
                      value={empPopup.newCannotDoText}
                      onChange={(e) =>
                        setEmpPopup({ ...empPopup, newCannotDoText: e.target.value })
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (empPopup.newCannotDoText.trim()) {
                            setEmpPopup({
                              ...empPopup,
                              cannotDoList: [
                                ...empPopup.cannotDoList,
                                empPopup.newCannotDoText.trim()
                              ],
                              newCannotDoText: ''
                            });
                          }
                        }
                      }}
                      className="flex-1 px-2.5 py-1.5 bg-white border border-rose-300 rounded-lg text-xs text-slate-800"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!empPopup.newCannotDoText.trim()) return;
                        setEmpPopup({
                          ...empPopup,
                          cannotDoList: [
                            ...empPopup.cannotDoList,
                            empPopup.newCannotDoText.trim()
                          ],
                          newCannotDoText: ''
                        });
                      }}
                      className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg text-xs shrink-0"
                    >
                      + Add
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Popup Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs text-slate-500">
                Status:{' '}
                <strong className="text-slate-800">
                  {empPopup.employeeCanEdit
                    ? 'Employee Edit Access Unlocked'
                    : 'Employee Edit Disabled (Developer Only Full Access)'}
                </strong>
              </div>
              <div className="flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setEmpPopup((prev) => ({ ...prev, open: false }))}
                  className="px-4 py-2 border border-slate-300 bg-white hover:bg-slate-50 rounded-lg font-semibold text-xs text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmEmployeePopup}
                  className="px-5 py-2 bg-[#1e4e8c] hover:bg-[#163b6b] text-white rounded-lg font-semibold text-xs shadow-sm"
                >
                  {empPopup.mode === 'editRules'
                    ? 'Save Employee Access Rules'
                    : 'Confirm & Assign to Employee'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
