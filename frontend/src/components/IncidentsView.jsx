import React, { useState, useEffect } from 'react';
import {
  AlertOctagon,
  CheckCircle2,
  AlertTriangle,
  Edit,
  Filter,
  ShieldAlert,
  Plus,
  Trash2,
  X
} from 'lucide-react';
import { api } from '../api';
import IncidentModal from './IncidentModal';

export default function IncidentsView({ user, onDataChange }) {
  const [incidents, setIncidents] = useState([]);
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Create Incident Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    deviceId: '',
    incidentStatus: 'Open',
    consecutiveMissingCount: 1,
    actionTaken: '',
    notes: ''
  });

  const canEdit = user?.role === 'ITAdmin' || user?.role === 'Developer';

  const loadIncidents = async () => {
    setLoading(true);
    setError('');
    try {
      const [list, devList] = await Promise.all([
        api.getIncidents(statusFilter),
        api.getDevices({ isActive: true })
      ]);
      setIncidents(Array.isArray(list) ? list : []);
      setDevices(Array.isArray(devList) ? devList : []);
    } catch (err) {
      setError(err.message || 'Failed to load incidents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIncidents();
  }, [statusFilter]);

  const handleSaveAction = async (data) => {
    if (!selectedIncident) return;
    await api.updateIncident(selectedIncident.incidentId, data);
    await loadIncidents();
    if (onDataChange) onDataChange();
  };

  const handleCreateIncident = async (e) => {
    e.preventDefault();
    if (!createForm.deviceId) {
      setError('Please select a mobile device.');
      return;
    }
    setCreating(true);
    setError('');
    try {
      await api.createIncident({
        deviceId: Number(createForm.deviceId),
        incidentStatus: createForm.incidentStatus,
        consecutiveMissingCount: Number(createForm.consecutiveMissingCount) || 1,
        actionTaken: createForm.actionTaken.trim() || null,
        notes: createForm.notes.trim() || null
      });
      setCreateModalOpen(false);
      setCreateForm({
        deviceId: '',
        incidentStatus: 'Open',
        consecutiveMissingCount: 1,
        actionTaken: '',
        notes: ''
      });
      await loadIncidents();
      if (onDataChange) onDataChange();
    } catch (err) {
      setError(err.message || 'Failed to create incident');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteIncident = async (incident) => {
    if (
      !window.confirm(
        `Delete Incident #${incident.incidentId} for ${incident.mobileCode}?`
      )
    ) {
      return;
    }
    try {
      await api.deleteIncident(incident.incidentId);
      await loadIncidents();
      if (onDataChange) onDataChange();
    } catch (err) {
      setError(err.message || 'Failed to delete incident');
    }
  };

  const getStatusBadge = (status, count) => {
    if (status === 'Escalated' || count >= 2) {
      return (
        <span className="px-2.5 py-1 rounded text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300 flex items-center space-x-1">
          <AlertOctagon className="w-3.5 h-3.5 text-rose-600" />
          <span>Escalated ({count} Checks)</span>
        </span>
      );
    }
    if (status === 'Recovered') {
      return (
        <span className="px-2.5 py-1 rounded text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center space-x-1">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>Recovered</span>
        </span>
      );
    }
    if (status === 'Closed') {
      return (
        <span className="px-2.5 py-1 rounded text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300">
          Closed
        </span>
      );
    }
    return (
      <span
        title="Missing in 1 check — awaiting investigation or recovery"
        className="px-2.5 py-1 rounded text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center space-x-1"
      >
        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
        <span>Open (1st Missing Check)</span>
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <ShieldAlert className="w-5 h-5 text-rose-600" />
            <h2 className="text-lg font-bold text-slate-900">
              Missing Device Incident Management
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Tracks first-time missing devices (Open), consecutive missing alerts (Escalated), and recovery records
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Filter by status */}
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 font-medium focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">All Incidents</option>
              <option value="Escalated">Escalated (Critical)</option>
              <option value="Open">Open (1st Check Missing)</option>
              <option value="Recovered">Recovered</option>
              <option value="Closed">Closed</option>
            </select>
          </div>

          {canEdit && (
            <button
              type="button"
              onClick={() => setCreateModalOpen(true)}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-[#1e4e8c] hover:bg-[#163b6b] text-white rounded-lg text-xs font-semibold shadow-xs transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Incident</span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700">
          {error}
        </div>
      )}

      {/* Incidents Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            Loading missing incidents...
          </div>
        ) : incidents.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            No missing device incidents found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4 text-left">Incident #</th>
                  <th className="py-3 px-4 text-left">Device Code</th>
                  <th className="py-3 px-4 text-left">Group</th>
                  <th className="py-3 px-4 text-left">Incident Status</th>
                  <th className="py-3 px-4 text-left">First Missing (Colombo)</th>
                  <th className="py-3 px-4 text-left">Action Taken</th>
                  <th className="py-3 px-4 text-left">Recovery Time</th>
                  {canEdit && <th className="py-3 px-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {incidents.map((incident) => (
                  <tr
                    key={incident.incidentId}
                    className={`hover:bg-slate-50/80 transition ${
                      incident.isEscalated ? 'bg-rose-50/40' : ''
                    }`}
                  >
                    <td className="py-3 px-4 font-mono font-bold text-slate-800">
                      #{incident.incidentId}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-mono font-bold text-xs text-indigo-700">
                        {incident.mobileCode}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {incident.mobileName || '—'}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-700">
                      {incident.groupName}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {getStatusBadge(
                        incident.incidentStatus,
                        incident.consecutiveMissingCount
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600 whitespace-nowrap">
                      {incident.firstMissingAtColombo}
                    </td>
                    <td className="py-3 px-4 max-w-xs truncate text-slate-700">
                      {incident.actionTaken || (
                        <span className="text-slate-400 italic">
                          No action logged yet
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-emerald-700 whitespace-nowrap">
                      {incident.recoveredAtColombo || '—'}
                    </td>
                    {canEdit && (
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center space-x-1">
                          <button
                            onClick={() => {
                              setSelectedIncident(incident);
                              setModalOpen(true);
                            }}
                            className="px-2.5 py-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition inline-flex items-center space-x-1"
                          >
                            <Edit className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => handleDeleteIncident(incident)}
                            title={`Delete Incident #${incident.incidentId}`}
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

      {/* Edit Incident Modal */}
      <IncidentModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveAction}
        incident={selectedIncident}
      />

      {/* Create Incident Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">
                Create Missing Device Incident
              </h3>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateIncident} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Mobile Phone <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={createForm.deviceId}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, deviceId: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-800"
                >
                  <option value="">Select a phone...</option>
                  {devices.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.mobileCode} — {d.mobileName || d.model || 'Phone'} ({d.groupName})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Incident Status
                  </label>
                  <select
                    value={createForm.incidentStatus}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, incidentStatus: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-800"
                  >
                    <option value="Open">Open (1st Check)</option>
                    <option value="Escalated">Escalated</option>
                    <option value="Recovered">Recovered</option>
                    <option value="Closed">Closed</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Missing Check Count
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={createForm.consecutiveMissingCount}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        consecutiveMissingCount: e.target.value
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Action Taken
                </label>
                <input
                  type="text"
                  placeholder="e.g. Contacted group supervisor"
                  value={createForm.actionTaken}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, actionTaken: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Additional incident details..."
                  value={createForm.notes}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, notes: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 bg-[#1e4e8c] hover:bg-[#163b6b] text-white rounded-lg font-semibold disabled:opacity-50"
                >
                  {creating ? 'Creating...' : 'Create Incident'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
