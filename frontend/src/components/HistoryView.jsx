import React, { useState, useEffect } from 'react';
import {
  History,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Edit2,
  Trash2,
  X
} from 'lucide-react';
import { api } from '../api';

export default function HistoryView({ user, onDataChange }) {
  const [history, setHistory] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    mobileCode: '',
    groupId: '',
    status: '',
    date: '',
    sessionId: ''
  });

  // Edit Record Modal State
  const [editingRecord, setEditingRecord] = useState(null);
  const [editForm, setEditForm] = useState({
    deviceStatus: 'Available',
    notes: ''
  });
  const [saving, setSaving] = useState(false);

  const canManage = user?.role === 'Developer' || user?.role === 'ITAdmin';

  const loadHistory = async () => {
    setLoading(true);
    setError('');
    try {
      const [histData, grpData] = await Promise.all([
        api.getHistory(filters),
        api.getGroups()
      ]);
      setHistory(Array.isArray(histData) ? histData : []);
      setGroups(Array.isArray(grpData) ? grpData : []);
    } catch (err) {
      setError(err.message || 'Failed to load checking history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [filters]);

  const handleReset = () => {
    setFilters({
      mobileCode: '',
      groupId: '',
      status: '',
      date: '',
      sessionId: ''
    });
  };

  const openEditModal = (record) => {
    setEditingRecord(record);
    setEditForm({
      deviceStatus: record.deviceStatus || 'Available',
      notes: record.notes || ''
    });
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingRecord) return;
    setSaving(true);
    setError('');
    try {
      await api.updateHistoryRecord(editingRecord.checkRecordId, editForm);
      setEditingRecord(null);
      await loadHistory();
      if (onDataChange) onDataChange();
    } catch (err) {
      setError(err.message || 'Failed to update check record');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRecord = async (record) => {
    if (
      !window.confirm(
        `Delete Check Record #${record.checkRecordId} (${record.mobileCode})?`
      )
    ) {
      return;
    }
    try {
      await api.deleteHistoryRecord(record.checkRecordId);
      await loadHistory();
      if (onDataChange) onDataChange();
    } catch (err) {
      setError(err.message || 'Failed to delete check record');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center space-x-2">
          <History className="w-5 h-5 text-indigo-600" />
          <h2 className="text-lg font-bold text-slate-900">
            Historical Checking Log
          </h2>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Complete audit trail of every mobile device check across all checking sessions (Colombo Standard Time)
        </p>

        {/* Filters */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 pt-4 border-t border-slate-100 text-xs">
          <div>
            <label className="block text-slate-500 font-semibold mb-1">
              Mobile Code
            </label>
            <input
              type="text"
              placeholder="e.g. MOB-0001"
              value={filters.mobileCode}
              onChange={(e) =>
                setFilters({ ...filters, mobileCode: e.target.value })
              }
              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
            />
          </div>

          <div>
            <label className="block text-slate-500 font-semibold mb-1">
              Employee Group
            </label>
            <select
              value={filters.groupId}
              onChange={(e) =>
                setFilters({ ...filters, groupId: e.target.value })
              }
              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
            >
              <option value="">All Groups</option>
              {groups.map((g) => (
                <option key={g.groupId} value={g.groupId}>
                  {g.groupName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-500 font-semibold mb-1">
              Inspection Result
            </label>
            <select
              value={filters.status}
              onChange={(e) =>
                setFilters({ ...filters, status: e.target.value })
              }
              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
            >
              <option value="">All Results</option>
              <option value="Available">Available</option>
              <option value="Missing">Missing</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-500 font-semibold mb-1">
              Inspection Date
            </label>
            <input
              type="date"
              value={filters.date}
              onChange={(e) => setFilters({ ...filters, date: e.target.value })}
              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
            />
          </div>

          <div className="flex items-end space-x-2">
            <button
              type="button"
              onClick={handleReset}
              className="px-3 py-1.5 border border-slate-300 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-semibold flex items-center space-x-1"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700">
          {error}
        </div>
      )}

      {/* History Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            Loading checking records...
          </div>
        ) : history.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            No checking records match the selected filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4 text-left">Check ID</th>
                  <th className="py-3 px-4 text-left">Session</th>
                  <th className="py-3 px-4 text-left">Mobile Code</th>
                  <th className="py-3 px-4 text-left">Group</th>
                  <th className="py-3 px-4 text-left">Checked Status</th>
                  <th className="py-3 px-4 text-left">
                    Checked Timestamp (Colombo)
                  </th>
                  <th className="py-3 px-4 text-left">IT Admin</th>
                  <th className="py-3 px-4 text-left">Notes</th>
                  {canManage && <th className="py-3 px-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {history.map((record) => (
                  <tr
                    key={record.checkRecordId}
                    className="hover:bg-slate-50/80 transition"
                  >
                    <td className="py-3 px-4 font-mono font-medium text-slate-500">
                      #{record.checkRecordId}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-indigo-600">
                      Session #{record.sessionId}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-800">
                      {record.mobileCode}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {record.groupName}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {record.deviceStatus === 'Available' ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 inline-flex items-center space-x-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Available</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 inline-flex items-center space-x-1">
                          <XCircle className="w-3 h-3 text-rose-600" />
                          <span>Missing</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600 whitespace-nowrap">
                      {record.checkedAtColombo}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-800 whitespace-nowrap">
                      {record.checkedByAdmin}
                    </td>
                    <td className="py-3 px-4 text-slate-500 max-w-xs truncate">
                      {record.notes || '—'}
                    </td>
                    {canManage && (
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center space-x-1">
                          <button
                            type="button"
                            onClick={() => openEditModal(record)}
                            title={`Edit Check #${record.checkRecordId}`}
                            className="p-1.5 text-slate-400 hover:text-[#1e4e8c] hover:bg-blue-50 rounded-lg transition"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteRecord(record)}
                            title={`Delete Check #${record.checkRecordId}`}
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
        )}
      </div>

      {/* Edit Check Record Modal */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">
                Edit Check Record #{editingRecord.checkRecordId} ({editingRecord.mobileCode})
              </h3>
              <button
                type="button"
                onClick={() => setEditingRecord(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Checked Status
                </label>
                <select
                  value={editForm.deviceStatus}
                  onChange={(e) =>
                    setEditForm({ ...editForm, deviceStatus: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-800"
                >
                  <option value="Available">Available</option>
                  <option value="Missing">Missing</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Notes
                </label>
                <input
                  type="text"
                  placeholder="Optional inspection note"
                  value={editForm.notes}
                  onChange={(e) =>
                    setEditForm({ ...editForm, notes: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setEditingRecord(null)}
                  className="px-4 py-2 border border-slate-300 rounded-lg font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-[#1e4e8c] hover:bg-[#163b6b] text-white rounded-lg font-semibold disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
