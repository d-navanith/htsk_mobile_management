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
  X,
  UserCheck,
  MapPin,
  Clock,
  CreditCard
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

  const handleMarkFoundQuick = async (incident) => {
    try {
      await api.updateIncident(incident.incidentId, {
        status: 'Recovered',
        actionTaken: 'Physically located and verified FOUND',
        notes: incident.notes || 'Marked FOUND via quick action'
      });
      await loadIncidents();
      if (onDataChange) onDataChange();
    } catch (err) {
      setError(err.message || 'Failed to mark device as FOUND');
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
    if (status === 'Recovered' || status === 'Found' || status === 'FOUND') {
      return (
        <span className="px-2.5 py-1 rounded text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 inline-flex items-center space-x-1">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>Recovered (FOUND)</span>
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
    if (status === 'Escalated' || (count >= 2 && status === 'Open')) {
      return (
        <span className="px-2.5 py-1 rounded text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300 inline-flex items-center space-x-1">
          <AlertOctagon className="w-3.5 h-3.5 text-rose-600" />
          <span>Escalated ({count} Checks)</span>
        </span>
      );
    }
    return (
      <span
        title="Missing / Unverified — awaiting investigation or recovery"
        className="px-2.5 py-1 rounded text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 inline-flex items-center space-x-1"
      >
        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
        <span>Missing (Open)</span>
      </span>
    );
  };

  // Also show any devices whose CurrentStatus === 'Missing'
  const missingDevicesCount = devices.filter(
    (d) => d.currentStatus === 'Missing'
  ).length;
  const foundDevicesCount = devices.filter(
    (d) => d.currentStatus === 'Available'
  ).length;

  return (
    <div className="space-y-6">
      {/* View Header + Missing Device Identification Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 sm:p-7 rounded-[28px] border-2 border-slate-100 shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <ShieldAlert className="w-6 h-6 text-rose-600" />
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-950 tracking-tight">
              Missing &amp; Unverified Devices
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Of <strong>{devices.length}</strong> registered company devices,{' '}
            <strong className="text-emerald-700">{foundDevicesCount} are FOUND</strong>{' '}
            and{' '}
            <strong className="text-rose-600">
              {missingDevicesCount} are MISSING / Unverified
            </strong>
            . Complete investigation profile: unique ID, model, last assigned employee, last known location, previous assignment details, and last physical verification date.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Filter by status */}
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-[#68c73a]"
            >
              <option value="">All Missing &amp; Recovery Records</option>
              <option value="Escalated">Escalated (Critical)</option>
              <option value="Open">Open (Currently Missing)</option>
              <option value="Recovered">Recovered (Found)</option>
              <option value="Closed">Closed</option>
            </select>
          </div>

          {canEdit && (
            <button
              type="button"
              onClick={() => setCreateModalOpen(true)}
              className="inline-flex items-center space-x-1.5 px-4 py-2.5 bg-[#c8f53b] hover:bg-[#b8e629] text-slate-950 rounded-xl text-xs font-extrabold shadow-xs transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Report Missing Device</span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-semibold text-rose-700">
          {error}
        </div>
      )}

      {/* Missing Devices Investigation Table */}
      <div className="bg-white rounded-[28px] border-2 border-slate-100 overflow-hidden shadow-sm p-5 sm:p-6">
        {loading ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            Loading missing device investigation records...
          </div>
        ) : incidents.length === 0 ? (
          <div className="p-10 text-center text-slate-500 text-xs">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <div className="font-bold text-slate-800 text-sm">
              All {devices.length} Registered Devices Are Verified &amp; Accounted For
            </div>
            <p className="text-xs text-slate-400 mt-1">
              When a device is marked Missing or left unverified during an inspection, its full investigation profile appears here automatically.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4 text-left">Unique Device ID &amp; Model</th>
                  <th className="py-3 px-4 text-left">Bank Profile</th>
                  <th className="py-3 px-4 text-left">Last Assigned Staff</th>
                  <th className="py-3 px-4 text-left">Last Known Location</th>
                  <th className="py-3 px-4 text-left">Previous Assignment &amp; Notes</th>
                  <th className="py-3 px-4 text-left">Last Physical Verification</th>
                  <th className="py-3 px-4 text-left">Status</th>
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
                    <td className="py-3.5 px-4">
                      <div className="font-extrabold text-xs text-slate-900">
                        {incident.mobileCode}{' '}
                        <span className="ml-1 px-1.5 py-0.5 rounded bg-slate-100 text-[10px] font-bold text-slate-600">
                          Group {incident.groupName}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {incident.mobileName || incident.model || 'iPhone 15'} · IMEI:{' '}
                        <span className="font-mono">{incident.imei || '—'}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 flex items-center space-x-1.5">
                        <CreditCard className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span>{incident.bankAccountName || '—'}</span>
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Bank Transaction Profile
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 flex items-center space-x-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-[#1a6e3c] shrink-0" />
                        <span>{incident.assignedEmployeeName || incident.assignedTo || 'Unassigned'}</span>
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Group {incident.groupName}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-800 flex items-center space-x-1">
                        <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        <span>
                          {incident.lastKnownLocation ||
                            `Main Floor · Group ${incident.groupName} Station`}
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="text-slate-800 font-medium truncate">
                        {incident.actionTaken || (
                          <span className="text-slate-400 italic">
                            Awaiting investigation update
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 truncate mt-0.5">
                        {incident.previousAssignmentDetails ||
                          incident.notes ||
                          `Assigned to ${incident.assignedTo || 'Employee'}`}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-slate-700 whitespace-nowrap">
                      <div className="flex items-center space-x-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>
                          {incident.lastVerifiedAtColombo ||
                            incident.firstMissingAtColombo}
                        </span>
                      </div>
                      <div className="text-[10px] text-rose-600 font-sans">
                        Flagged missing: {incident.firstMissingAtColombo}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {getStatusBadge(
                        incident.incidentStatus,
                        incident.consecutiveMissingCount
                      )}
                    </td>

                    {canEdit && (
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center space-x-1.5">
                          {incident.incidentStatus !== 'Recovered' && (
                            <button
                              type="button"
                              onClick={() => handleMarkFoundQuick(incident)}
                              title="Mark phone as FOUND & Available immediately"
                              className="px-2.5 py-1 text-xs font-bold text-emerald-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition inline-flex items-center space-x-1 cursor-pointer shadow-2xs"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-950" />
                              <span>Mark FOUND</span>
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setSelectedIncident(incident);
                              setModalOpen(true);
                            }}
                            className="px-2.5 py-1 text-xs font-bold text-slate-900 bg-[#c8f53b] hover:bg-[#b8e629] rounded-lg transition inline-flex items-center space-x-1 cursor-pointer"
                          >
                            <Edit className="w-3.5 h-3.5" />
                            <span>Investigate / Update</span>
                          </button>
                          <button
                            onClick={() => handleDeleteIncident(incident)}
                            title={`Delete Incident #${incident.incidentId}`}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
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
                Report Missing or Unverified Device
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
                  <option value="">Select a registered device...</option>
                  {devices.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.mobileCode} — [Bank: {d.bankAccountName || d.phoneNumber || '—'}] {d.assignedEmployeeName ? `(Operator: ${d.assignedEmployeeName})` : '(Unassigned)'} (Group {d.groupName})
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
                    <option value="Open">Open (Missing)</option>
                    <option value="Escalated">Escalated</option>
                    <option value="Recovered">Recovered (Found)</option>
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
                  Action Taken / Investigation Details
                </label>
                <input
                  type="text"
                  placeholder="e.g. Contacted assigned employee & checked station"
                  value={createForm.actionTaken}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, actionTaken: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Previous Assignment / Location Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Previous assignment details or last known location..."
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
                  className="px-4 py-2 bg-[#c8f53b] hover:bg-[#b8e629] text-slate-950 rounded-lg font-extrabold disabled:opacity-50"
                >
                  {creating ? 'Saving...' : 'Report Missing'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
