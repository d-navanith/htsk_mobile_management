import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Shield,
  Edit2,
  Trash2,
  X
} from 'lucide-react';
import { api } from '../api';

export default function UsersView({ user: currentUser, onNavigateToPermissions }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    email: '',
    password: '',
    roleId: 2, // Default ITAdmin
    isActive: true
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const loadUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const list = await api.getUsers();
      setUsers(Array.isArray(list) ? list : []);
    } catch (err) {
      setError(err.message || 'Failed to load user accounts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const openCreateModal = () => {
    setEditingUser(null);
    setError('');
    setFormData({
      fullName: '',
      username: '',
      email: '',
      password: '',
      roleId: 2,
      isActive: true
    });
    setModalOpen(true);
  };

  const openEditModal = (u) => {
    setEditingUser(u);
    setError('');
    setFormData({
      fullName: u.fullName || '',
      username: u.username || '',
      email: u.email || '',
      password: '',
      roleId: u.roleId || (u.role === 'Developer' ? 1 : u.role === 'ITAdmin' ? 2 : 3),
      isActive: u.isActive !== false
    });
    setModalOpen(true);
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (editingUser) {
        await api.updateUser(editingUser.userId, {
          fullName: formData.fullName.trim(),
          email: formData.email.trim(),
          roleId: Number(formData.roleId),
          isActive: formData.isActive,
          newPassword: formData.password.trim() || null
        });
      } else {
        await api.createUser({
          fullName: formData.fullName.trim(),
          username: formData.username.trim(),
          email: formData.email.trim(),
          password: formData.password,
          roleId: Number(formData.roleId)
        });
      }
      setModalOpen(false);
      await loadUsers();
    } catch (err) {
      setError(err.message || 'Failed to save user account');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async (u) => {
    if (currentUser?.userId === u.userId) {
      alert('You cannot delete your own currently logged-in account.');
      return;
    }
    if (!window.confirm(`Delete user account "${u.username}" (${u.fullName})?`)) {
      return;
    }
    try {
      await api.deleteUser(u.userId);
      await loadUsers();
    } catch (err) {
      setError(err.message || 'Failed to delete user account');
    }
  };

  const getRoleBadge = (role) => {
    if (role === 'Developer')
      return 'bg-purple-100 text-purple-800 border-purple-300';
    if (role === 'ITAdmin')
      return 'bg-blue-100 text-blue-800 border-blue-300';
    return 'bg-emerald-100 text-emerald-800 border-emerald-300';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 sm:p-7 rounded-[28px] border-2 border-slate-100 shadow-sm">
        <div>
          <div className="flex items-center space-x-2.5">
            <Users className="w-5 h-5 text-[#1a6e3c]" />
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-950 tracking-tight">
              User Management
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Create, edit, and manage user accounts and system access credentials.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {onNavigateToPermissions && (
            <button
              type="button"
              onClick={onNavigateToPermissions}
              className="flex items-center space-x-2 px-4 py-2.5 bg-white hover:bg-slate-50 border-2 border-slate-200 text-slate-900 font-bold text-xs rounded-xl shadow-2xs transition shrink-0 cursor-pointer"
            >
              <Shield className="w-4 h-4 text-[#1a6e3c]" />
              <span>User Permission Dashboard</span>
            </button>
          )}
          <button
            type="button"
            onClick={openCreateModal}
            className="flex items-center space-x-2 px-4 py-2.5 bg-[#c8f53b] hover:bg-[#b8e629] text-slate-950 font-extrabold text-xs rounded-xl shadow-xs transition shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create New User</span>
          </button>
        </div>
      </div>

      {error && !modalOpen && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-semibold text-rose-700">
          {error}
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white rounded-[28px] border-2 border-slate-100 overflow-hidden shadow-sm p-5 sm:p-6">
        {loading ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            Loading user accounts...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4 text-left">User ID</th>
                  <th className="py-3 px-4 text-left">Full Name</th>
                  <th className="py-3 px-4 text-left">Username</th>
                  <th className="py-3 px-4 text-left">Email Address</th>
                  <th className="py-3 px-4 text-left">System Role</th>
                  <th className="py-3 px-4 text-left">Account Status</th>
                  <th className="py-3 px-4 text-left">Created At (Colombo)</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.userId} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 font-mono font-bold text-slate-500">
                      #{u.userId}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800">
                      {u.fullName}
                    </td>
                    <td className="py-3 px-4 font-mono text-indigo-700 font-bold">
                      {u.username}
                    </td>
                    <td className="py-3 px-4 text-slate-600">{u.email}</td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${getRoleBadge(
                          u.role
                        )}`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {u.isActive ? (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          Active
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          Disabled
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500">
                      {u.createdAtColombo}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center space-x-1">
                        <button
                          type="button"
                          onClick={() => openEditModal(u)}
                          title={`Edit ${u.username}`}
                          className="p-1.5 text-slate-400 hover:text-[#1e4e8c] hover:bg-blue-50 rounded-lg transition"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteUser(u)}
                          disabled={currentUser?.userId === u.userId}
                          title={
                            currentUser?.userId === u.userId
                              ? 'Cannot delete current logged-in account'
                              : `Delete ${u.username}`
                          }
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition disabled:opacity-30"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit User Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">
                {editingUser
                  ? `Edit User: ${editingUser.username}`
                  : 'Create New System User'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="p-6 space-y-4 text-xs">
              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
                  {error}
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kasun Perera"
                  value={formData.fullName}
                  onChange={(e) =>
                    setFormData({ ...formData, fullName: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              {!editingUser && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Username <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. kasunp"
                    value={formData.username}
                    onChange={(e) =>
                      setFormData({ ...formData, username: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Email <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. kasun@company.com"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {editingUser
                    ? 'New Password (leave blank to keep existing)'
                    : 'Password *'}
                </label>
                <input
                  type="password"
                  required={!editingUser}
                  placeholder={
                    editingUser ? 'Leave blank to keep unchanged' : 'Min 6 characters'
                  }
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Role
                </label>
                <select
                  value={formData.roleId}
                  onChange={(e) =>
                    setFormData({ ...formData, roleId: parseInt(e.target.value, 10) })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                >
                  <option value={2}>
                    IT Admin (Conduct 2-hr checks, manage devices &amp; groups)
                  </option>
                  <option value={3}>Employee (Read-only visibility)</option>
                  <option value={1}>Developer (Full system administrator)</option>
                </select>
              </div>

              {editingUser && (
                <label className="flex items-center space-x-2 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) =>
                      setFormData({ ...formData, isActive: e.target.checked })
                    }
                    className="rounded border-slate-300 text-[#1e4e8c]"
                  />
                  <span className="font-semibold text-slate-700">
                    Account Active
                  </span>
                </label>
              )}

              <div className="pt-4 border-t border-slate-200 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg font-medium text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-[#1e4e8c] hover:bg-[#163b6b] text-white rounded-lg font-semibold disabled:opacity-50"
                >
                  {saving
                    ? 'Saving...'
                    : editingUser
                    ? 'Save Changes'
                    : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
