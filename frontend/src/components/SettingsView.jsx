import React, { useState, useEffect } from 'react';
import {
  Settings,
  Clock,
  AlertOctagon,
  Globe,
  Save,
  CheckCircle2,
  Plus,
  Trash2,
  X
} from 'lucide-react';
import { api } from '../api';

export default function SettingsView({ onSettingsChange }) {
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [error, setError] = useState('');

  // Create Setting Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newSetting, setNewSetting] = useState({
    settingKey: '',
    settingValue: '',
    description: ''
  });

  const loadSettings = async () => {
    setLoading(true);
    try {
      const list = await api.getSettings();
      setSettings(Array.isArray(list) ? list : []);
    } catch (err) {
      setError(err.message || 'Failed to load system settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleValueChange = (key, newVal) => {
    setSettings((prev) =>
      prev.map((s) =>
        s.settingKey === key ? { ...s, settingValue: newVal } : s
      )
    );
  };

  const handleSave = async (e, setting) => {
    e.preventDefault();
    setSavingKey(setting.settingKey);
    setError('');
    setSuccessMsg('');
    try {
      await api.updateSetting(
        setting.settingKey,
        setting.settingValue,
        setting.description
      );
      setSuccessMsg(
        `Updated "${setting.settingKey}" to ${setting.settingValue}.`
      );
      if (onSettingsChange) onSettingsChange();
      setTimeout(() => setSuccessMsg(''), 3500);
    } catch (err) {
      setError(err.message || 'Failed to update setting');
    } finally {
      setSavingKey('');
    }
  };

  const handleCreateSetting = async (e) => {
    e.preventDefault();
    if (!newSetting.settingKey.trim()) {
      setError('Setting key is required.');
      return;
    }
    setCreating(true);
    setError('');
    try {
      await api.createSetting({
        settingKey: newSetting.settingKey.trim(),
        settingValue: newSetting.settingValue.trim(),
        description: newSetting.description.trim() || 'Custom configuration parameter'
      });
      setModalOpen(false);
      setNewSetting({ settingKey: '', settingValue: '', description: '' });
      setSuccessMsg(`Created setting "${newSetting.settingKey.trim()}".`);
      await loadSettings();
      if (onSettingsChange) onSettingsChange();
    } catch (err) {
      setError(err.message || 'Failed to create setting');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteSetting = async (setting) => {
    if (
      !window.confirm(`Delete system setting "${setting.settingKey}"?`)
    ) {
      return;
    }
    setError('');
    try {
      await api.deleteSetting(setting.settingKey);
      setSuccessMsg(`Deleted setting "${setting.settingKey}".`);
      await loadSettings();
      if (onSettingsChange) onSettingsChange();
    } catch (err) {
      setError(err.message || 'Failed to delete setting');
    }
  };

  const getSettingIcon = (key) => {
    if (key.includes('Interval')) return Clock;
    if (key.includes('Threshold')) return AlertOctagon;
    return Globe;
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 sm:p-7 rounded-[28px] border-2 border-slate-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <Settings className="w-5 h-5 text-[#1a6e3c]" />
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-950 tracking-tight">
              System Settings
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Configure global checking intervals, escalation rules, and system parameters.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center space-x-1.5 px-4 py-2.5 bg-[#c8f53b] hover:bg-[#b8e629] text-slate-950 rounded-xl text-xs font-extrabold shadow-xs transition shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Parameter</span>
        </button>
      </div>

      {successMsg && (
        <div
          role="status"
          aria-live="polite"
          className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-2xl text-emerald-950 text-xs font-bold flex items-center space-x-2"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div
          role="alert"
          aria-live="polite"
          className="p-3.5 bg-rose-50 border border-rose-300 rounded-2xl text-rose-950 text-xs font-bold"
        >
          {error}
        </div>
      )}

      {loading ? (
        <div className="p-8 text-center text-slate-500 text-xs">
          Loading system configurations...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {settings.map((setting) => {
            const Icon = getSettingIcon(setting.settingKey);
            const isProtected = setting.settingKey === 'TimeZone';
            return (
              <form
                key={setting.settingId || setting.settingKey}
                onSubmit={(e) => handleSave(e, setting)}
                className="bg-white rounded-[28px] border-2 border-slate-100 p-6 shadow-sm flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2.5">
                      <div className="p-2 rounded-xl bg-[#f6f9f4] text-[#1a6e3c] border border-slate-200">
                        <Icon className="w-5 h-5" />
                      </div>
                      <label
                        htmlFor={`setting-${setting.settingKey}`}
                        className="font-mono font-bold text-xs text-slate-900"
                      >
                        {setting.settingKey}
                      </label>
                    </div>

                    {!isProtected && (
                      <button
                        type="button"
                        onClick={() => handleDeleteSetting(setting)}
                        title={`Delete ${setting.settingKey}`}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed mb-4">
                    {setting.description}
                  </p>

                  <input
                    id={`setting-${setting.settingKey}`}
                    name={setting.settingKey}
                    type="text"
                    value={setting.settingValue}
                    onChange={(e) =>
                      handleValueChange(setting.settingKey, e.target.value)
                    }
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm font-mono font-semibold text-slate-900 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
                  <button
                    type="submit"
                    disabled={savingKey === setting.settingKey}
                    className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-[#1e4e8c] hover:bg-[#163b6b] text-white text-xs font-semibold shadow-sm transition disabled:opacity-50"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>
                      {savingKey === setting.settingKey
                        ? 'Saving...'
                        : 'Save Value'}
                    </span>
                  </button>
                </div>
              </form>
            );
          })}
        </div>
      )}

      {/* Add Parameter Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">
                Add System Parameter
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSetting} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Parameter Key <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. MaxSessionDurationMinutes"
                  value={newSetting.settingKey}
                  onChange={(e) =>
                    setNewSetting({ ...newSetting, settingKey: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-slate-800"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Parameter Value <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 120"
                  value={newSetting.settingValue}
                  onChange={(e) =>
                    setNewSetting({
                      ...newSetting,
                      settingValue: e.target.value
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-slate-800"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  placeholder="What this parameter controls"
                  value={newSetting.description}
                  onChange={(e) =>
                    setNewSetting({
                      ...newSetting,
                      description: e.target.value
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800"
                />
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
                  disabled={creating}
                  className="px-4 py-2 bg-[#1e4e8c] hover:bg-[#163b6b] text-white rounded-lg font-semibold disabled:opacity-50"
                >
                  {creating ? 'Creating...' : 'Create Parameter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
