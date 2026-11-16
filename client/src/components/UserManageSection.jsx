import React, { useState, useEffect } from 'react';
import {
  Clock,
  Shield,
  CheckCircle2,
  Sun,
  Moon,
  Users,
  Key,
  Plus,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Eye,
  EyeOff
} from 'lucide-react';

export default function UserManageSection() {
  // Shift timing states (matching Image 2)
  const [morningStart, setMorningStart] = useState('06:00 AM');
  const [morningEnd, setMorningEnd] = useState('06:00 PM');
  const [nightStart, setNightStart] = useState('06:00 PM');
  const [nightEnd, setNightEnd] = useState('06:00 AM');
  const [shiftDurationHours, setShiftDurationHours] = useState(12);
  const [gracePeriodMinutes, setGracePeriodMinutes] = useState(30);
  const [flagDiscrepancy, setFlagDiscrepancy] = useState(true);
  const [preventAvailable, setPreventAvailable] = useState(true);
  const [shiftSavedMessage, setShiftSavedMessage] = useState(false);

  // Group settings
  const [groups, setGroups] = useState([]);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [groupSavedMessage, setGroupSavedMessage] = useState(false);

  // Shift addition
  const [shifts, setShifts] = useState([]);
  const [newShiftName, setNewShiftName] = useState('');

  // User Accounts
  const [users, setUsers] = useState([]);
  const [newFullName, setNewFullName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState('Admin');
  const [newPassword, setNewPassword] = useState('Admin@123');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [userCreatedMessage, setUserCreatedMessage] = useState(false);

  // Permissions
  const [permissions, setPermissions] = useState([]);

  // Fetch initial data
  const loadData = async () => {
    try {
      // 1. Shift Settings
      const sRes = await fetch('/api/shift-settings');
      const sData = await sRes.json();
      if (sData.success && sData.data) {
        setMorningStart(sData.data.morning_start || '06:00 AM');
        setMorningEnd(sData.data.morning_end || '06:00 PM');
        setNightStart(sData.data.night_start || '06:00 PM');
        setNightEnd(sData.data.night_end || '06:00 AM');
        setShiftDurationHours(sData.data.shift_duration_hours || 12);
        setGracePeriodMinutes(sData.data.grace_period_minutes || 30);
      }

      // 2. Groups
      const gRes = await fetch('/api/groups');
      const gData = await gRes.json();
      if (gData.success) setGroups(gData.data || []);

      // 3. Shifts
      const shRes = await fetch('/api/shifts');
      const shData = await shRes.json();
      if (shData.success) setShifts(shData.data || []);

      // 4. Users
      const uRes = await fetch('/api/users');
      const uData = await uRes.json();
      if (uData.success) setUsers(uData.data || []);

      // 5. Permissions
      const pRes = await fetch('/api/permissions');
      const pData = await pRes.json();
      if (pData.success) setPermissions(pData.data || []);
    } catch (e) {
      console.error('Error loading settings:', e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Save Shift Settings (Image 2)
  const handleSaveShiftSettings = async e => {
    e.preventDefault();
    try {
      await fetch('/api/shift-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          morning_start: morningStart,
          morning_end: morningEnd,
          night_start: nightStart,
          night_end: nightEnd,
          shift_duration_hours: Number(shiftDurationHours),
          grace_period_minutes: Number(gracePeriodMinutes),
          auto_alert_overdue: flagDiscrepancy ? 1 : 0
        })
      });
      setShiftSavedMessage(true);
      setTimeout(() => setShiftSavedMessage(false), 3000);
    } catch (e) {
      console.error(e);
    }
  };

  // Add Group
  const handleAddGroup = async e => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    try {
      await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ group_name: newGroupName.trim(), description: newGroupDesc.trim() })
      });
      setNewGroupName('');
      setNewGroupDesc('');
      setGroupSavedMessage(true);
      setTimeout(() => setGroupSavedMessage(false), 3000);
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  // Add Shift
  const handleAddShift = async () => {
    if (!newShiftName.trim()) return;
    try {
      await fetch('/api/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shift_name: newShiftName.trim() })
      });
      setNewShiftName('');
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  // Create User
  const handleCreateUser = async e => {
    e.preventDefault();
    if (!newFullName.trim() || !newUsername.trim()) return;
    try {
      await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: newFullName.trim(),
          username: newUsername.trim(),
          email: newEmail.trim(),
          role: newRole,
          password: newPassword
        })
      });
      setNewFullName('');
      setNewUsername('');
      setNewEmail('');
      setUserCreatedMessage(true);
      setTimeout(() => setUserCreatedMessage(false), 3000);
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  // Toggle User Active
  const handleToggleUser = async (userId, currentStatus) => {
    try {
      await fetch(`/api/users/${userId}/toggle`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: currentStatus ? 0 : 1 })
      });
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  // Delete User
  const handleDeleteUser = async userId => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      await fetch(`/api/users/${userId}`, { method: 'DELETE' });
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  // Toggle Permission Switch
  const handleTogglePermission = async (permId, currentStatus) => {
    try {
      await fetch(`/api/permissions/${permId}/toggle`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_enabled: currentStatus ? 0 : 1 })
      });
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div style={{ maxWidth: '1360px', margin: '0 auto', paddingBottom: '60px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 700, color: '#111827', margin: 0, letterSpacing: '-0.02em' }}>Mobile Management</h1>
        <div style={{ fontSize: '13px', color: '#9ca3af', marginTop: '4px', fontWeight: 500 }}>Workspace / User manage</div>
      </div>
      {/* SECTION 2: ADMIN USER ACCOUNT MANAGEMENT */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e5e7eb',
        padding: '24px',
        marginBottom: '40px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
          <Users size={20} color="#84cc16" />
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#111827', margin: 0 }}>
              User Account Management (Admin Creation)
            </h2>
            <p style={{ fontSize: '12.5px', color: '#6b7280', margin: '2px 0 0' }}>
              Create and manage administrative and operator user accounts
            </p>
          </div>
        </div>

        {userCreatedMessage && (
          <div style={{
            backgroundColor: '#f0fdf4',
            border: '1px solid #bbf7d0',
            color: '#15803d',
            padding: '10px 14px',
            borderRadius: '10px',
            fontSize: '13px',
            marginBottom: '16px'
          }}>
            User account created successfully!
          </div>
        )}

        <form onSubmit={handleCreateUser} style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr) auto', gap: '12px', alignItems: 'flex-end', marginBottom: '24px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
              Full Name *
            </label>
            <input
              type="text"
              placeholder="e.g. Shanaka"
              value={newFullName}
              onChange={e => setNewFullName(e.target.value)}
              required
              style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '13px' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
              Username *
            </label>
            <input
              type="text"
              placeholder="e.g. shanaka"
              value={newUsername}
              onChange={e => setNewUsername(e.target.value)}
              required
              style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '13px' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
              Email
            </label>
            <input
              type="email"
              placeholder="user@htsk.com"
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '13px' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
              Role
            </label>
            <select
              value={newRole}
              onChange={e => setNewRole(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '13px', backgroundColor: '#fff' }}
            >
              <option value="Admin">Admin</option>
              <option value="Supervisor">Supervisor</option>
              <option value="Staff">Staff</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                style={{ width: '100%', padding: '8px 34px 8px 10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '13px' }}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(v => !v)}
                title={showNewPassword ? 'Hide password' : 'Show password'}
                style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', display: 'flex' }}
              >
                {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <button
              type="submit"
              style={{
                backgroundColor: '#84cc16',
                color: '#000000',
                padding: '9px 18px',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '13px',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              Create User
            </button>
          </div>
        </form>

        {/* Existing Users Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              <th style={{ padding: '10px 14px', fontSize: '12.5px', color: '#4b5563' }}>Full Name</th>
              <th style={{ padding: '10px 14px', fontSize: '12.5px', color: '#4b5563' }}>Username</th>
              <th style={{ padding: '10px 14px', fontSize: '12.5px', color: '#4b5563' }}>Email</th>
              <th style={{ padding: '10px 14px', fontSize: '12.5px', color: '#4b5563' }}>Role</th>
              <th style={{ padding: '10px 14px', fontSize: '12.5px', color: '#4b5563', textAlign: 'center' }}>Status</th>
              <th style={{ padding: '10px 14px', fontSize: '12.5px', color: '#4b5563', textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '12px 14px', fontSize: '13.5px', fontWeight: 600 }}>{u.full_name}</td>
                <td style={{ padding: '12px 14px', fontSize: '13px', color: '#6b7280' }}>{u.username}</td>
                <td style={{ padding: '12px 14px', fontSize: '13px', color: '#6b7280' }}>{u.email || 'â€”'}</td>
                <td style={{ padding: '12px 14px', fontSize: '13px', fontWeight: 600 }}>{u.role}</td>
                <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                  <button
                    onClick={() => handleToggleUser(u.id, u.is_active)}
                    style={{
                      backgroundColor: u.is_active ? '#dcfce7' : '#fee2e2',
                      color: u.is_active ? '#15803d' : '#b91c1c',
                      padding: '3px 10px',
                      borderRadius: '9999px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    {u.is_active ? 'Active' : 'Inactive'}
                  </button>
                </td>
                <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                  {u.username !== 'shanaka' && (
                    <button
                      onClick={() => handleDeleteUser(u.id)}
                      style={{ color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                      title="Delete User"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* SECTION 3: USER PERMISSION MANAGEMENT (WITH TOGGLE BUTTONS) */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e5e7eb',
        padding: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
          <Key size={20} color="#84cc16" />
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#111827', margin: 0 }}>
              User Permission Management
            </h2>
            <p style={{ fontSize: '12.5px', color: '#6b7280', margin: '2px 0 0' }}>
              Granular role-based capability toggles with live toggle switches
            </p>
          </div>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              <th style={{ padding: '12px 16px', fontSize: '12.5px', color: '#4b5563' }}>Role</th>
              <th style={{ padding: '12px 16px', fontSize: '12.5px', color: '#4b5563' }}>Permission Key</th>
              <th style={{ padding: '12px 16px', fontSize: '12.5px', color: '#4b5563' }}>Capability Description</th>
              <th style={{ padding: '12px 16px', fontSize: '12.5px', color: '#4b5563', textAlign: 'center' }}>Access Status</th>
              <th style={{ padding: '12px 16px', fontSize: '12.5px', color: '#4b5563', textAlign: 'center' }}>Toggle Switch</th>
            </tr>
          </thead>
          <tbody>
            {permissions.map(p => (
              <tr key={p.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '12px 16px', fontSize: '13.5px', fontWeight: 700 }}>
                  <span style={{
                    backgroundColor: p.role === 'Admin' ? '#f4fce8' : (p.role === 'Supervisor' ? '#eff6ff' : '#f3f4f6'),
                    color: p.role === 'Admin' ? '#166534' : (p.role === 'Supervisor' ? '#1e40af' : '#374151'),
                    padding: '3px 10px',
                    borderRadius: '6px',
                    fontSize: '12px'
                  }}>
                    {p.role}
                  </span>
                </td>
                <td style={{ padding: '12px 16px', fontSize: '13px', color: '#6b7280', fontFamily: 'monospace' }}>
                  {p.permission_key}
                </td>
                <td style={{ padding: '12px 16px', fontSize: '13.5px', color: '#111827', fontWeight: 500 }}>
                  {p.permission_label}
                </td>
                <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                  <span style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    color: p.is_enabled ? '#15803d' : '#9ca3af'
                  }}>
                    {p.is_enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </td>
                <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                  <button
                    onClick={() => handleTogglePermission(p.id, p.is_enabled)}
                    style={{
                      cursor: 'pointer',
                      border: 'none',
                      background: 'none',
                      color: p.is_enabled ? '#84cc16' : '#9ca3af',
                      display: 'inline-flex',
                      alignItems: 'center'
                    }}
                    title="Click to toggle permission"
                  >
                    {p.is_enabled ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
