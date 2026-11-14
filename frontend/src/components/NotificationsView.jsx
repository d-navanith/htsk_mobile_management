import React, { useState, useEffect } from 'react';
import {
  Bell,
  CheckCircle2,
  AlertOctagon,
  AlertTriangle,
  CheckCheck,
  Plus,
  Edit2,
  Trash2,
  X
} from 'lucide-react';
import { api } from '../api';

export default function NotificationsView({
  user,
  userPermissions,
  onNotificationsChange
}) {
  const [notifications, setNotifications] = useState([]);
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterUnread, setFilterUnread] = useState(false);
  const [error, setError] = useState('');

  // CRUD Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingNotif, setEditingNotif] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    deviceId: '',
    notificationType: 'SystemAlert',
    message: '',
    priority: 'High',
    isRead: false
  });

  const canManage =
    user?.role === 'Developer' ||
    user?.role === 'ITAdmin' ||
    userPermissions?.notifications;

  const loadNotifications = async () => {
    setLoading(true);
    setError('');
    try {
      const [list, devList] = await Promise.all([
        api.getNotifications(filterUnread),
        api.getDevices({ isActive: true }).catch(() => [])
      ]);
      setNotifications(Array.isArray(list) ? list : []);
      setDevices(Array.isArray(devList) ? devList : []);
    } catch (err) {
      setError(err.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, [filterUnread]);

  const handleMarkRead = async (id) => {
    try {
      await api.markNotificationRead(id);
      await loadNotifications();
      if (onNotificationsChange) onNotificationsChange();
    } catch (err) {
      setError(err.message || 'Failed to mark notification read');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      await loadNotifications();
      if (onNotificationsChange) onNotificationsChange();
    } catch (err) {
      setError(err.message || 'Failed to mark all notifications read');
    }
  };

  const openCreateModal = () => {
    setEditingNotif(null);
    setFormData({
      deviceId: '',
      notificationType: 'SystemAlert',
      message: '',
      priority: 'High',
      isRead: false
    });
    setModalOpen(true);
  };

  const openEditModal = (n) => {
    setEditingNotif(n);
    setFormData({
      deviceId: n.deviceId ? String(n.deviceId) : '',
      notificationType: n.notificationType || 'SystemAlert',
      message: n.message || '',
      priority: n.priority || 'Medium',
      isRead: Boolean(n.isRead)
    });
    setModalOpen(true);
  };

  const handleSaveNotification = async (e) => {
    e.preventDefault();
    if (!formData.message.trim()) {
      setError('Notification message is required.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      if (editingNotif) {
        await api.updateNotification(editingNotif.notificationId, {
          notificationType: formData.notificationType,
          message: formData.message.trim(),
          priority: formData.priority,
          isRead: formData.isRead
        });
      } else {
        await api.createNotification({
          deviceId: formData.deviceId ? Number(formData.deviceId) : null,
          notificationType: formData.notificationType,
          message: formData.message.trim(),
          priority: formData.priority
        });
      }
      setModalOpen(false);
      await loadNotifications();
      if (onNotificationsChange) onNotificationsChange();
    } catch (err) {
      setError(err.message || 'Failed to save notification');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteNotification = async (n) => {
    if (!window.confirm('Delete this notification alert?')) return;
    try {
      await api.deleteNotification(n.notificationId);
      await loadNotifications();
      if (onNotificationsChange) onNotificationsChange();
    } catch (err) {
      setError(err.message || 'Failed to delete notification');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-[11px] font-bold tracking-wider uppercase text-[#1d4ed8]">
            SYSTEM ALERTS
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-0.5">
            Notifications
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time alerts for missing phones, consecutive missing escalations, and recoveries.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setFilterUnread((prev) => !prev)}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold border transition ${
              filterUnread
                ? 'bg-[#edf4ff] text-[#1d4ed8] border-[#bfdbfe]'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {filterUnread ? 'Showing Unread Only' : 'Show Unread Only'}
          </button>

          <button
            type="button"
            onClick={handleMarkAllRead}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-2xs transition"
          >
            <CheckCheck className="w-3.5 h-3.5 text-slate-500" />
            <span>Mark all as read</span>
          </button>

          {canManage && (
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-[#1e4e8c] hover:bg-[#163b6b] text-white shadow-xs transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Alert</span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700">
          {error}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500">
            Loading notifications...
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-12 text-center">
            <Bell className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <div className="text-sm font-semibold text-slate-700">
              No notifications
            </div>
            <p className="text-xs text-slate-500 mt-1">
              You are all caught up on system alerts.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {notifications.map((n) => {
              const isHigh = n.priority === 'High';
              const isMed = n.priority === 'Medium';
              return (
                <div
                  key={n.notificationId}
                  className={`p-4 sm:px-6 flex flex-col sm:flex-row sm:items-start justify-between gap-3 transition ${
                    !n.isRead ? 'bg-[#f8faff]' : 'bg-white hover:bg-slate-50/70'
                  }`}
                >
                  <div className="flex items-start space-x-3.5">
                    <div
                      className={`mt-0.5 p-2 rounded-xl shrink-0 ${
                        isHigh
                          ? 'bg-rose-100 text-rose-600'
                          : isMed
                          ? 'bg-amber-100 text-amber-600'
                          : 'bg-emerald-100 text-emerald-600'
                      }`}
                    >
                      {isHigh ? (
                        <AlertOctagon className="w-4 h-4" />
                      ) : isMed ? (
                        <AlertTriangle className="w-4 h-4" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            isHigh
                              ? 'bg-rose-100 text-rose-700'
                              : isMed
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}
                        >
                          {n.priority} Priority
                        </span>
                        {n.mobileCode && (
                          <span className="font-mono text-xs font-bold text-slate-700">
                            {n.mobileCode}
                          </span>
                        )}
                        {!n.isRead && (
                          <span
                            className="w-2 h-2 rounded-full bg-[#1d4ed8]"
                            title="Unread"
                          />
                        )}
                      </div>
                      <p className="text-sm font-medium text-slate-900 mt-1">
                        {n.message}
                      </p>
                      <span className="text-xs text-slate-400 font-mono mt-1 block">
                        {n.createdAtColombo} (Asia/Colombo)
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center">
                    {!n.isRead && (
                      <button
                        type="button"
                        onClick={() => handleMarkRead(n.notificationId)}
                        className="text-xs font-semibold text-[#1d4ed8] hover:underline px-2 py-1"
                      >
                        Mark read
                      </button>
                    )}

                    {canManage && (
                      <>
                        <button
                          type="button"
                          onClick={() => openEditModal(n)}
                          title="Edit notification"
                          className="p-1.5 text-slate-400 hover:text-[#1e4e8c] hover:bg-blue-50 rounded-lg transition"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteNotification(n)}
                          title="Delete notification"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create / Edit Notification Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">
                {editingNotif ? 'Edit Notification Alert' : 'Create System Notification'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveNotification} className="p-6 space-y-4 text-xs">
              {!editingNotif && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Related Mobile Phone (Optional)
                  </label>
                  <select
                    value={formData.deviceId}
                    onChange={(e) =>
                      setFormData({ ...formData, deviceId: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-800"
                  >
                    <option value="">General System Alert (No specific phone)</option>
                    {devices.map((d) => (
                      <option key={d.deviceId} value={d.deviceId}>
                        {d.mobileCode} — {d.mobileName || d.model || 'Phone'}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Priority
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) =>
                      setFormData({ ...formData, priority: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-800"
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Alert Type
                  </label>
                  <select
                    value={formData.notificationType}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        notificationType: e.target.value
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-800"
                  >
                    <option value="SystemAlert">System Alert</option>
                    <option value="FirstMissing">First Missing</option>
                    <option value="RepeatedMissing">Repeated Missing</option>
                    <option value="Recovered">Recovered</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Alert Message <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Enter notification message..."
                  value={formData.message}
                  onChange={(e) =>
                    setFormData({ ...formData, message: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800"
                />
              </div>

              {editingNotif && (
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isRead}
                    onChange={(e) =>
                      setFormData({ ...formData, isRead: e.target.checked })
                    }
                    className="rounded border-slate-300 text-[#1e4e8c]"
                  />
                  <span className="font-semibold text-slate-700">
                    Mark as Read
                  </span>
                </label>
              )}

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
                  {saving ? 'Saving...' : editingNotif ? 'Save Changes' : 'Create Alert'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
