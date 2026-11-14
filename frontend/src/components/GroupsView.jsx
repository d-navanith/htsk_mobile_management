import React, { useState, useEffect } from 'react';
import { Layers, Plus, Edit, Trash2, Smartphone, CheckCircle2, AlertTriangle } from 'lucide-react';
import { api } from '../api';
import GroupModal from './GroupModal';

export default function GroupsView({ user, userPermissions, onDataChange }) {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);

  const canEdit =
    userPermissions?.manage_groups !== undefined
      ? userPermissions.manage_groups
      : user?.role === 'ITAdmin' || user?.role === 'Developer';

  const loadGroups = async () => {
    setLoading(true);
    setError('');
    try {
      const list = await api.getGroups();
      setGroups(list);
    } catch (err) {
      setError(err.message || 'Failed to load groups');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGroups();
  }, []);

  const handleSaveGroup = async (formData) => {
    if (editingGroup) {
      await api.updateGroup(editingGroup.groupId, formData);
    } else {
      await api.createGroup(formData);
    }
    await loadGroups();
    if (onDataChange) onDataChange();
  };

  const handleDeactivate = async (group) => {
    if (!canEdit) return;
    const confirm = window.confirm(`Are you sure you want to delete/deactivate group "${group.groupName}"?`);
    if (!confirm) return;

    try {
      await api.deleteGroup(group.groupId);
      await loadGroups();
      if (onDataChange) onDataChange();
    } catch (err) {
      alert(err.message || 'Failed to delete group');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <Layers className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-slate-900">Employee Groups & Departments</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Mobile devices are assigned to groups for organized 2-hour physical inspections
          </p>
        </div>

        {canEdit && (
          <button
            onClick={() => {
              setEditingGroup(null);
              setModalOpen(true);
            }}
            className="flex items-center space-x-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow transition shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Group</span>
          </button>
        )}
      </div>

      {/* Groups Grid */}
      {loading ? (
        <div className="p-8 text-center text-slate-500 text-xs">Loading groups...</div>
      ) : groups.length === 0 ? (
        <div className="p-8 text-center text-slate-500 text-xs">No employee groups registered yet.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((group) => {
            const availPct = group.totalDevices > 0
              ? Math.round((group.availableDevices / group.totalDevices) * 100)
              : 100;

            return (
              <div
                key={group.groupId}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-base text-slate-900">{group.groupName}</h3>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                        {group.description || 'No description provided'}
                      </p>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      group.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {group.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  {/* Device Count Metrics */}
                  <div className="mt-5 grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                    <div>
                      <span className="text-[10px] font-semibold uppercase text-slate-400 block">Total</span>
                      <span className="text-base font-bold text-slate-800">{group.totalDevices}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold uppercase text-emerald-600 block">Available</span>
                      <span className="text-base font-bold text-emerald-600">{group.availableDevices}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold uppercase text-rose-600 block">Missing</span>
                      <span className="text-base font-bold text-rose-600">{group.missingDevices}</span>
                    </div>
                  </div>

                  {/* Availability Progress Bar */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-[11px] font-medium text-slate-500 mb-1">
                      <span>Availability Rate</span>
                      <span className="font-bold text-slate-700">{availPct}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          availPct === 100 ? 'bg-emerald-500' : availPct >= 70 ? 'bg-amber-500' : 'bg-rose-500'
                        }`}
                        style={{ width: `${availPct}%` }}
                      />
                    </div>
                  </div>
                </div>

                {canEdit && (
                  <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                    <button
                      onClick={() => {
                        setEditingGroup(group);
                        setModalOpen(true);
                      }}
                      className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition flex items-center space-x-1"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => handleDeactivate(group)}
                      className="px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition flex items-center space-x-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <GroupModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveGroup}
        group={editingGroup}
      />
    </div>
  );
}
