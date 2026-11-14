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
  Trash2
} from 'lucide-react';
import { api } from '../api';

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
    employee: false
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

  const handleToggle = async (functionKey, role, currentVal) => {
    const cellId = `${functionKey}:${role}`;
    setTogglingCell(cellId);
    setError('');
    setStatusMessage('');

    const nextVal = !currentVal;

    // Optimistic update
    setPermissions((prev) =>
      prev.map((row) => {
        if (row.functionKey !== functionKey) return row;
        return {
          ...row,
          developer: role === 'Developer' ? nextVal : row.developer,
          itAdmin: role === 'ITAdmin' ? nextVal : row.itAdmin,
          employee: role === 'Employee' ? nextVal : row.employee
        };
      })
    );

    try {
      const updatedRow = await api.togglePermission(functionKey, role, nextVal);
      setPermissions((prev) =>
        prev.map((row) =>
          row.functionKey === functionKey ? updatedRow : row
        )
      );
      const roleDisplay = role === 'ITAdmin' ? 'IT Admin' : role;
      setStatusMessage(
        `${updatedRow.functionName} is now ${nextVal ? 'Active' : 'Inactive'} for ${roleDisplay}.`
      );
      if (onPermissionsChange) onPermissionsChange();
    } catch (err) {
      setError(err.message || 'Failed to update permission');
      await loadPermissions();
    } finally {
      setTogglingCell(null);
    }
  };

  const openAddModal = () => {
    setEditingRow(null);
    setFormData({
      functionKey: '',
      functionName: '',
      description: '',
      developer: true,
      itAdmin: true,
      employee: false
    });
    setModalOpen(true);
  };

  const openEditModal = (row) => {
    setEditingRow(row);
    setFormData({
      functionKey: row.functionKey,
      functionName: row.functionName,
      description: row.description || '',
      developer: row.developer,
      itAdmin: row.itAdmin,
      employee: row.employee
    });
    setModalOpen(true);
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
      if (editingRow) {
        await api.updatePermission(editingRow.functionKey, {
          functionName: formData.functionName.trim(),
          description: formData.description.trim(),
          developer: formData.developer,
          itAdmin: formData.itAdmin,
          employee: formData.employee
        });
        setStatusMessage(`Updated function "${formData.functionName.trim()}".`);
      } else {
        await api.createPermission({
          functionKey: formData.functionKey.trim() || formData.functionName.trim(),
          functionName: formData.functionName.trim(),
          description: formData.description.trim(),
          developer: formData.developer,
          itAdmin: formData.itAdmin,
          employee: formData.employee
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

  const renderRoleCell = (row, roleKey, isEnabled) => {
    const cellId = `${row.functionKey}:${roleKey}`;
    const isBusy = togglingCell === cellId;
    const roleLabel = roleKey === 'ITAdmin' ? 'IT Admin' : roleKey;

    return (
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
          onClick={() => handleToggle(row.functionKey, roleKey, isEnabled)}
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
    );
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-[11px] font-bold tracking-wider uppercase text-[#1d4ed8]">
            ADMINISTRATION · FULL CRUD
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-0.5 flex items-center space-x-2">
            <ShieldCheck className="w-6 h-6 text-[#1e4e8c] shrink-0" />
            <span>User Permission Dashboard</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Create, edit, delete, and toggle system functions for Developer, IT Admin, and Employee roles.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={loadPermissions}
            className="inline-flex items-center space-x-1.5 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 shadow-2xs transition"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={handleResetDefaults}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 shadow-2xs transition"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span>Reset defaults</span>
          </button>

          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-[#1e4e8c] hover:bg-[#163b6b] text-white rounded-lg text-xs font-semibold shadow-xs transition"
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
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2
              id="permissions-matrix-heading"
              className="text-sm font-bold text-slate-900"
            >
              Role Function Matrix
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Toggle any switch to immediately enable (✓) or disable (✕) that function, or use Edit / Delete on any row.
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
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-[#0f172a] text-white text-xs font-bold border-b border-slate-800">
                  <th className="py-3.5 px-5 w-[34%]">Function</th>
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
                    className="hover:bg-slate-50/90 transition"
                  >
                    <th
                      scope="row"
                      className="py-4 px-5 font-semibold text-slate-900 text-left"
                    >
                      <div className="text-sm font-bold text-slate-900">
                        {row.functionName}
                      </div>
                      <div className="text-[11px] font-normal text-slate-400 mt-0.5">
                        {row.description}
                      </div>
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
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden">
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
                  placeholder="e.g. Export Audit Logs"
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
                <div className="font-semibold text-slate-700">Role Access</div>
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
                      onChange={(e) =>
                        setFormData({ ...formData, employee: e.target.checked })
                      }
                      className="rounded border-slate-300 text-[#1e4e8c]"
                    />
                    <span className="font-semibold text-slate-800">Employee</span>
                  </label>
                </div>
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
    </div>
  );
}
