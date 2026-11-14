import React, { useState, useEffect } from 'react';
import { X, Smartphone, Layers, Hash, Phone, Key, AlignLeft } from 'lucide-react';

export default function DeviceModal({ isOpen, onClose, onSave, device, groups }) {
  const [formData, setFormData] = useState({
    groupId: groups[0]?.groupId || '',
    mobileCode: '',
    mobileName: '',
    brand: '',
    model: '',
    imei: '',
    phoneNumber: '',
    serialNumber: '',
    description: '',
    isActive: true,
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (device) {
      setFormData({
        groupId: device.groupId,
        mobileCode: device.mobileCode,
        mobileName: device.mobileName || '',
        brand: device.brand || '',
        model: device.model || '',
        imei: device.imei || '',
        phoneNumber: device.phoneNumber || '',
        serialNumber: device.serialNumber || '',
        description: device.description || '',
        isActive: device.isActive,
      });
    } else {
      setFormData({
        groupId: groups[0]?.groupId || '',
        mobileCode: '',
        mobileName: '',
        brand: '',
        model: '',
        imei: '',
        phoneNumber: '',
        serialNumber: '',
        description: '',
        isActive: true,
      });
    }
    setError('');
  }, [device, groups, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.groupId) {
      setError('Assigned Group is required.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      await onSave(formData);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save device');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {device ? `Edit Device (${device.mobileCode})` : 'Register New Mobile Phone'}
              </h3>
              <p className="text-xs text-slate-500">
                {device ? 'Update assigned group or device details' : 'All device details except Group are optional'}
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

          {/* Assigned Group (Required) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Assigned Employee Group <span className="text-rose-500">*</span>
            </label>
            <select
              value={formData.groupId}
              onChange={(e) => setFormData({ ...formData, groupId: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            >
              {groups.map((g) => (
                <option key={g.groupId} value={g.groupId}>
                  {g.groupName}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Mobile Code (Optional, auto-generated if left blank) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mobile ID / Code <span className="text-slate-400 font-normal">(Auto if blank)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. MOB-0010"
                value={formData.mobileCode}
                disabled={!!device}
                onChange={(e) => setFormData({ ...formData, mobileCode: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100"
              />
            </div>

            {/* Mobile Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mobile Name <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Sales Phone 4"
                value={formData.mobileName}
                onChange={(e) => setFormData({ ...formData, mobileName: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Brand */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Brand <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                placeholder="Samsung, Apple, Xiaomi..."
                value={formData.brand}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Model */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Model <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                placeholder="Galaxy A15, iPhone SE..."
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* IMEI */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                IMEI Number <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                placeholder="15-digit IMEI"
                value={formData.imei}
                onChange={(e) => setFormData({ ...formData, imei: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
              />
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Phone Number <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                placeholder="+94 7X XXX XXXX"
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
              />
            </div>
          </div>

          {/* Serial Number */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Serial Number <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              placeholder="Hardware serial number"
              value={formData.serialNumber}
              onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Description / Notes <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Assigned to warehouse supervisor desk"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {device && (
            <div className="flex items-center space-x-2 pt-1">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="isActive" className="text-xs font-semibold text-slate-700">
                Active in system (Inactive devices are excluded from checking sessions)
              </label>
            </div>
          )}

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
              {saving ? 'Saving...' : device ? 'Save Changes' : 'Register Phone'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
