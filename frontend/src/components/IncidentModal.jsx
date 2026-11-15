import React, { useState, useEffect } from 'react';
import { X, AlertOctagon, CheckCircle2 } from 'lucide-react';

export default function IncidentModal({ isOpen, onClose, onSave, incident }) {
  const [actionTaken, setActionTaken] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('Open');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (incident) {
      setActionTaken(incident.actionTaken || '');
      setNotes(incident.notes || '');
      setStatus(incident.incidentStatus || 'Open');
    }
    setError('');
  }, [incident, isOpen]);

  if (!isOpen || !incident) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await onSave({
        actionTaken,
        notes,
        status,
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to update incident');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden">
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className={`p-2 rounded-lg ${incident.isEscalated ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
              <AlertOctagon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Manage Missing Incident #{incident.incidentId}
              </h3>
              <p className="text-xs text-slate-500 font-mono">
                Device: {incident.mobileCode} ({incident.groupName})
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
              {error}
            </div>
          )}

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-500">Unique Device ID &amp; Model:</span>
              <span className="font-bold text-slate-900">
                {incident.mobileCode} · {incident.mobileName || incident.model || 'iPhone 15'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Last Assigned Employee:</span>
              <span className="font-bold text-slate-900">
                {incident.assignedTo || 'Unassigned'} (Group {incident.groupName})
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Last Known Location:</span>
              <span className="font-semibold text-slate-800">
                {incident.lastKnownLocation || `Group ${incident.groupName} Station`}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Last Physical Verification:</span>
              <span className="font-mono font-semibold text-slate-800">
                {incident.lastVerifiedAtColombo || incident.firstMissingAtColombo}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Flagged Missing (Colombo):</span>
              <span className="font-mono font-semibold text-rose-600">{incident.firstMissingAtColombo}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Consecutive Missing Checks:</span>
              <span className="font-bold text-rose-600">{incident.consecutiveMissingCount} sessions</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Current Incident Status:</span>
              <span className="font-semibold uppercase text-slate-700">{incident.incidentStatus}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Update Incident Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#68c73a] font-semibold"
            >
              <option value="Recovered">FOUND (Device Recovered &amp; Available)</option>
              <option value="Open">Missing (Open Investigation)</option>
              <option value="Escalated">Escalated (High Priority Missing Alert)</option>
              <option value="Closed">Closed (Written off or archived)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Action Taken / Investigation Follow-up
            </label>
            <textarea
              rows={3}
              placeholder="e.g. CCTV reviewed at entrance, employee contacted, security log filed."
              value={actionTaken}
              onChange={(e) => setActionTaken(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Additional Notes
            </label>
            <textarea
              rows={2}
              placeholder="Optional notes or admin remarks"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="pt-4 border-t border-slate-200 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow transition disabled:opacity-50"
            >
              {saving ? 'Updating...' : 'Save Incident Action'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
