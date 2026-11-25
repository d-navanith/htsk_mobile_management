import React, { useState, useEffect, useMemo } from 'react';
import UserProfileMenu from './UserProfileMenu';
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
  EyeOff,
  Star,
  Filter,
  Lock,
  Search,
  X,
  ArrowRightLeft
} from 'lucide-react';

export default function UserManageSection({
  currentUser = 'shanaka',
  currentUserName = 'Shanaka',
  currentUserRole = 'Admin',
  currentUserEmail = 'shanaka@htsk.com',
  currentUserAvatar = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
  onOpenProfile = () => {},
  setActiveTab = () => {},
  onLogout = () => {}
}) {
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

  // Dashboard Animations
  const [animations, setAnimations] = useState([]);
  const [animSavedMessage, setAnimSavedMessage] = useState(false);

  // Roles Management (Admin can add more roles)
  const [roles, setRoles] = useState(['Admin', 'Supervisor', 'Staff', 'Developer', 'Viewer']);
  const [isAddingRole, setIsAddingRole] = useState(false);
  const [newRoleInput, setNewRoleInput] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');
  const [roleAddedMessage, setRoleAddedMessage] = useState(false);

  // User Accounts
  const [users, setUsers] = useState([]);
  const [newFullName, setNewFullName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState('Admin');
  const [newPassword, setNewPassword] = useState('Admin@123');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [userCreatedMessage, setUserCreatedMessage] = useState(false);

  // Permissions & Role Filtering
  const [permissions, setPermissions] = useState([]);
  const [selectedPermRole, setSelectedPermRole] = useState('All');
  const [userTableSearch, setUserTableSearch] = useState('');
  const [permissionTableSearch, setPermissionTableSearch] = useState('');

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

      // 6. Dashboard Animations (Image 10)
      const aRes = await fetch('/api/dashboard-animations');
      const aData = await aRes.json();
      if (aData.success) setAnimations(aData.data || []);

      // 7. System Roles
      const rRes = await fetch('/api/roles');
      const rData = await rRes.json();
      if (rData.success && rData.data) {
        setRoles(rData.data.map(r => r.role_name));
      }
    } catch (e) {
      console.error('Error loading settings:', e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('htsk_session_token');
    const role = currentUserRole || localStorage.getItem('htsk_user_role') || 'Admin';
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      'X-User-Role': role
    };
  };

  // Add New Role
  const handleSaveNewRole = async e => {
    if (e) e.preventDefault();
    const cleanRole = newRoleInput.trim();
    if (!cleanRole) return;
    try {
      const res = await fetch('/api/roles', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ role_name: cleanRole, description: newRoleDesc.trim() })
      });
      const data = await res.json();
      if (data.success) {
        if (data.data) {
          setRoles(data.data.map(r => r.role_name));
        } else {
          setRoles(prev => prev.includes(cleanRole) ? prev : [...prev, cleanRole]);
        }
        setNewRole(cleanRole);
        setNewRoleInput('');
        setNewRoleDesc('');
        setIsAddingRole(false);
        setRoleAddedMessage(true);
        setTimeout(() => setRoleAddedMessage(false), 3500);
        // Refresh permissions so the new role immediately has capability rows
        const pRes = await fetch('/api/permissions');
        const pData = await pRes.json();
        if (pData.success) setPermissions(pData.data || []);
      } else {
        alert(data.error || 'Failed to add role');
      }
    } catch (err) {
      console.error('Error creating role:', err);
    }
  };

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
        headers: getAuthHeaders(),
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
        headers: getAuthHeaders(),
        body: JSON.stringify({ is_active: currentStatus ? 0 : 1 })
      });
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  // Toggle User Animation Permission (Admin Control)
  const handleToggleUserAnimation = async (userId, newStatus) => {
    try {
      await fetch(`/api/users/${userId}/toggle-animation`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ animation_enabled: newStatus ? 1 : 0 })
      });
      loadData();
      window.dispatchEvent(new CustomEvent('htsk-animation-updated'));
    } catch (e) {
      console.error('Error toggling user animation:', e);
    }
  };

  // Toggle Dashboard Animation (Rule: Only 1 active at a time)
  const handleToggleAnimation = async (animId, newStatus) => {
    try {
      const res = await fetch(`/api/dashboard-animations/${animId}/toggle`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ is_enabled: newStatus })
      });
      const data = await res.json();
      if (data.success && data.data) {
        setAnimations(data.data);
      } else {
        loadData();
      }
      setAnimSavedMessage(true);
      setTimeout(() => setAnimSavedMessage(false), 3000);
      window.dispatchEvent(new CustomEvent('htsk-animation-updated'));
    } catch (e) {
      console.error('Error toggling dashboard animation:', e);
    }
  };

  // Delete User
  const handleDeleteUser = async userId => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  // Canonical Capabilities list matching user mockup & View Only capabilities
  const SYSTEM_CAPABILITIES = [
    { key: 'manage_devices', label: 'Add & Edit Mobile Devices' },
    { key: 'manage_groups_shifts', label: 'Add & Edit Shifts' },
    { key: 'view_devices', label: 'View Mobile Devices (Only View)' },
    { key: 'view_daily_tasks', label: 'View Daily Tasks (Only View)' },
    { key: 'view_inventory', label: 'View Inventory Stock (Only View)' },
    { key: 'view_attention_required', label: 'View Attention Required Alerts' },
    { key: 'handover_devices', label: 'Perform Shift Handover' },
    { key: 'return_devices', label: 'Accept Inventory Returns' },
    { key: 'manage_users', label: 'Create & Manage User Accounts' },
    { key: 'view_audit_logs', label: 'View System Audit Logs' },
    { key: 'delete_records', label: 'Delete Records' }
  ];

  // Derive roles ensuring Admin, Viewer, Developer lead first matching user mockup
  const displayRoles = useMemo(() => {
    const priority = ['Admin', 'Viewer', 'Developer'];
    const allRoles = Array.from(new Set([
      ...roles,
      ...permissions.map(p => p.role)
    ])).filter(Boolean);

    const leading = priority.filter(pr => allRoles.some(r => r.toLowerCase() === pr.toLowerCase()));
    const rest = allRoles.filter(r => !priority.some(pr => pr.toLowerCase() === r.toLowerCase()));
    return [...leading, ...rest];
  }, [roles, permissions]);

  // Lookup map: `${role.toLowerCase()}_${key}` => perm object
  const permLookup = useMemo(() => {
    const map = {};
    permissions.forEach(p => {
      const k = `${p.role?.toLowerCase()}_${p.permission_key}`;
      map[k] = p;
    });
    return map;
  }, [permissions]);

  // Toggle permission cell in the matrix
  const handleToggleCell = async (roleName, permKey) => {
    const lookupKey = `${roleName.toLowerCase()}_${permKey}`;
    const existing = permLookup[lookupKey];
    const currentStatus = existing ? existing.is_enabled : (roleName.toLowerCase() === 'admin' || roleName.toLowerCase() === 'developer' ? 1 : 0);
    const nextStatus = currentStatus ? 0 : 1;

    // Optimistic UI update
    setPermissions(prev => {
      const idx = prev.findIndex(p => p.role?.toLowerCase() === roleName.toLowerCase() && p.permission_key === permKey);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], is_enabled: nextStatus };
        return copy;
      } else {
        return [...prev, {
          id: 'temp_' + Date.now(),
          role: roleName,
          permission_key: permKey,
          permission_label: permKey,
          is_enabled: nextStatus
        }];
      }
    });

    try {
      if (existing && existing.id && typeof existing.id === 'number') {
        await fetch(`/api/permissions/${existing.id}/toggle`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify({ is_enabled: nextStatus })
        });
      } else {
        await fetch('/api/permissions/toggle', {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify({ role: roleName, permission_key: permKey, is_enabled: nextStatus })
        });
      }
    } catch (e) {
      console.error('Failed to toggle permission:', e);
      loadData();
    }
  };

  // Toggle Permission Switch
  const handleTogglePermission = async (permId, currentStatus) => {
    try {
      await fetch(`/api/permissions/${permId}/toggle`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ is_enabled: currentStatus ? 0 : 1 })
      });
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="responsive-section-container">
      {/* Top Header matching system theme */}
      <div className="responsive-header">
        <div>
          <h1 className="system-h1">
            Mobile Management
          </h1>
          <p className="system-breadcrumb">
            <span>Workspace / User manage</span>
            <span>•</span>
            <strong style={{ color: '#111827' }}>System Access &amp; Administrative Accounts</strong>
          </p>
        </div>

        <UserProfileMenu
          currentUser={currentUser}
          currentUserName={currentUserName}
          currentUserRole={currentUserRole}
          currentUserEmail={currentUserEmail}
          currentUserAvatar={currentUserAvatar}
          onOpenProfile={() => onOpenProfile('general')}
          onOpenSecurity={() => onOpenProfile('security')}
          onLogout={onLogout}
          setActiveTab={setActiveTab}
          onRefresh={() => window.location.reload()}
        />
      </div>

      {/* SECTION 1: DASHBOARD ANIMATION MANAGEMENT (Matching user screenshot) */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e5e7eb',
        padding: '24px',
        marginBottom: '28px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Star size={20} color="#84cc16" fill="#84cc16" />
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#111827', margin: 0 }}>
              Dashboard Animation Management
            </h2>
          </div>
          {animSavedMessage && (
            <span style={{ fontSize: '12.5px', color: '#15803d', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', padding: '4px 10px', borderRadius: '8px', fontWeight: 600 }}>
              ✓ Animation updated (One animation active at a time)
            </span>
          )}
        </div>

        <div className="responsive-table-wrapper" style={{ overflowX: 'auto', borderRadius: '12px' }}>
        <table style={{ width: '100%', minWidth: '400px', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              <th style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 600, color: '#4b5563', width: '45%' }}>
                Animation Type
              </th>
              <th style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 600, color: '#4b5563', width: '25%' }}>
                Status
              </th>
              <th style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 600, color: '#4b5563', width: '30%' }}>
                Toggle Switch
              </th>
            </tr>
          </thead>
          <tbody>
            {animations.map(anim => {
              const isEnabled = anim.is_active === 1 || anim.status === 'Enable';
              return (
                <tr key={anim.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '13px 16px', fontSize: '13.5px', fontWeight: 600, color: '#111827' }}>
                    {anim.animation_name}
                  </td>
                  <td style={{ padding: '13px 16px', fontSize: '13px', fontWeight: 700, color: isEnabled ? '#15803d' : '#6b7280' }}>
                    {isEnabled ? 'Enable' : 'Disable'}
                  </td>
                  <td style={{ padding: '13px 16px' }}>
                    <button
                      type="button"
                      onClick={() => handleToggleAnimation(anim.id, !isEnabled)}
                      title={isEnabled ? 'Click to Disable animation' : 'Click to Enable animation (Only 1 active at a time)'}
                      style={{
                        width: '46px',
                        height: '24px',
                        borderRadius: '12px',
                        backgroundColor: isEnabled ? '#84cc16' : '#e5e7eb',
                        border: 'none',
                        cursor: 'pointer',
                        position: 'relative',
                        padding: 0,
                        transition: 'background-color 0.2s ease',
                        display: 'inline-flex',
                        alignItems: 'center'
                      }}
                    >
                      <span
                        style={{
                          width: '18px',
                          height: '18px',
                          borderRadius: '50%',
                          backgroundColor: '#ffffff',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                          transform: isEnabled ? 'translateX(24px)' : 'translateX(3px)',
                          transition: 'transform 0.2s ease'
                        }}
                      />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
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

        {roleAddedMessage && (
          <div style={{
            backgroundColor: '#f0fdf4',
            border: '1px solid #bbf7d0',
            color: '#15803d',
            padding: '10px 14px',
            borderRadius: '10px',
            fontSize: '13px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <CheckCircle2 size={16} /> New role added successfully and permissions initialized!
          </div>
        )}

        <form onSubmit={handleCreateUser} className="user-create-form">
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151' }}>
                Role *
              </label>
              <button
                type="button"
                onClick={() => setIsAddingRole(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#65a30d',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  padding: 0,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '2px'
                }}
                title="Add a new custom role"
              >
                + Add Role
              </button>
            </div>
            <select
              value={newRole}
              onChange={e => {
                if (e.target.value === '__ADD_NEW__') {
                  setIsAddingRole(true);
                } else {
                  setNewRole(e.target.value);
                }
              }}
              style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '13px', backgroundColor: '#fff', cursor: 'pointer' }}
            >
              {roles.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
              <option value="__ADD_NEW__" style={{ fontWeight: 700, color: '#16a34a', backgroundColor: '#f0fdf4' }}>
                + Add Role Option...
              </option>
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
              className="btn-primary-lime"
            >
              Create User
            </button>
          </div>
        </form>

        {/* Existing Users Table Search Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#374151' }}>
            System User Accounts ({users.length})
          </span>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: '#f3f4f6',
            border: userTableSearch ? '1.5px solid #84cc16' : '1px solid #e5e7eb',
            borderRadius: '9999px',
            padding: '6px 14px',
            width: '250px',
            boxSizing: 'border-box'
          }}>
            <Search size={14} color={userTableSearch ? '#65a30d' : '#9ca3af'} />
            <input
              type="text"
              placeholder="Search users table..."
              value={userTableSearch}
              onChange={e => setUserTableSearch(e.target.value)}
              style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '12.5px', color: '#111827', width: '100%' }}
            />
            {userTableSearch && (
              <button
                type="button"
                onClick={() => setUserTableSearch('')}
                style={{ background: 'transparent', border: 'none', padding: '1px', cursor: 'pointer', display: 'inline-flex', color: '#6b7280' }}
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Existing Users Table */}
        <div className="responsive-table-wrapper" style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
          <div className="table-scroll-hint">
            <span>Swipe horizontally to view all user details</span>
            <ArrowRightLeft size={13} />
          </div>
          <table style={{ width: '100%', minWidth: '650px', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              <th style={{ padding: '10px 14px', fontSize: '12.5px', color: '#4b5563' }}>Full Name</th>
              <th style={{ padding: '10px 14px', fontSize: '12.5px', color: '#4b5563' }}>Username</th>
              <th style={{ padding: '10px 14px', fontSize: '12.5px', color: '#4b5563' }}>Email</th>
              <th style={{ padding: '10px 14px', fontSize: '12.5px', color: '#4b5563' }}>Role</th>
              <th style={{ padding: '10px 14px', fontSize: '12.5px', color: '#4b5563', textAlign: 'center' }}>Status</th>
              <th style={{ padding: '10px 14px', fontSize: '12.5px', color: '#4b5563', textAlign: 'center' }}>Animation Visibility</th>
              <th style={{ padding: '10px 14px', fontSize: '12.5px', color: '#4b5563', textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users
              .filter(u => {
                const term = userTableSearch.trim().toLowerCase();
                if (!term) return true;
                return (
                  (u.full_name || '').toLowerCase().includes(term) ||
                  (u.username || '').toLowerCase().includes(term) ||
                  (u.email || '').toLowerCase().includes(term) ||
                  (u.role || '').toLowerCase().includes(term)
                );
              })
              .map(u => {
              const isAnimAllowed = u.animation_enabled === 1 || u.animation_enabled === true;
              return (
                <tr key={u.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '12px 14px', fontSize: '13.5px', fontWeight: 600 }}>{u.full_name}</td>
                  <td style={{ padding: '12px 14px', fontSize: '13px', color: '#6b7280' }}>{u.username}</td>
                  <td style={{ padding: '12px 14px', fontSize: '13px', color: '#6b7280' }}>{u.email || '—'}</td>
                  <td style={{ padding: '12px 14px', fontSize: '13px', fontWeight: 600 }}>{u.role}</td>
                  <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                    {u.role?.toLowerCase() === 'admin' || u.username?.toLowerCase() === 'shanaka' ? (
                      <span
                        style={{
                          backgroundColor: '#dcfce7',
                          color: '#15803d',
                          padding: '3px 12px',
                          borderRadius: '9999px',
                          fontSize: '12px',
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          cursor: 'not-allowed',
                          border: '1px solid #bbf7d0',
                          userSelect: 'none'
                        }}
                        title="Admin status cannot be set to Inactive"
                      >
                        <Lock size={11} strokeWidth={2.5} />
                        Active
                      </span>
                    ) : (
                      <button
                        onClick={() => handleToggleUser(u.id, u.is_active)}
                        style={{
                          backgroundColor: u.is_active ? '#dcfce7' : '#fee2e2',
                          color: u.is_active ? '#15803d' : '#b91c1c',
                          padding: '3px 10px',
                          borderRadius: '9999px',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          border: 'none'
                        }}
                      >
                        {u.is_active ? 'Active' : 'Inactive'}
                      </button>
                    )}
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{
                        fontSize: '11.5px',
                        fontWeight: 700,
                        color: isAnimAllowed ? '#15803d' : '#6b7280',
                        backgroundColor: isAnimAllowed ? '#dcfce7' : '#f3f4f6',
                        padding: '2px 8px',
                        borderRadius: '9999px'
                      }}>
                        {isAnimAllowed ? 'Allowed' : 'Disabled'}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleToggleUserAnimation(u.id, !isAnimAllowed)}
                        title={isAnimAllowed ? 'Click to disable dashboard animations for this user' : 'Click to allow dashboard animations for this user'}
                        style={{
                          width: '40px',
                          height: '22px',
                          borderRadius: '11px',
                          backgroundColor: isAnimAllowed ? '#84cc16' : '#e5e7eb',
                          border: 'none',
                          cursor: 'pointer',
                          position: 'relative',
                          padding: 0,
                          transition: 'background-color 0.2s ease',
                          display: 'inline-flex',
                          alignItems: 'center'
                        }}
                      >
                        <span
                          style={{
                            width: '16px',
                            height: '16px',
                            borderRadius: '50%',
                            backgroundColor: '#ffffff',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
                            transform: isAnimAllowed ? 'translateX(21px)' : 'translateX(3px)',
                            transition: 'transform 0.2s ease'
                          }}
                        />
                      </button>
                    </div>
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                    {u.username !== 'shanaka' && (
                      <button
                        onClick={() => handleDeleteUser(u.id)}
                        style={{ color: '#ef4444', cursor: 'pointer', padding: '4px', background: 'none', border: 'none' }}
                        title="Delete User"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      </div>

      {/* SECTION 3: USER PERMISSION MANAGEMENT (CAPABILITY MATRIX MATCHING MOCKUP) */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e5e7eb',
        padding: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Key size={20} color="#84cc16" />
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#111827', margin: 0 }}>
              User Permission Management
            </h2>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: '#f3f4f6',
            border: permissionTableSearch ? '1.5px solid #84cc16' : '1px solid #e5e7eb',
            borderRadius: '9999px',
            padding: '6px 14px',
            width: '260px',
            boxSizing: 'border-box'
          }}>
            <Search size={14} color={permissionTableSearch ? '#65a30d' : '#9ca3af'} />
            <input
              type="text"
              placeholder="Search capabilities..."
              value={permissionTableSearch}
              onChange={e => setPermissionTableSearch(e.target.value)}
              style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '12.5px', color: '#111827', width: '100%' }}
            />
            {permissionTableSearch && (
              <button
                type="button"
                onClick={() => setPermissionTableSearch('')}
                style={{ background: 'transparent', border: 'none', padding: '1px', cursor: 'pointer', display: 'inline-flex', color: '#6b7280' }}
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        <div className="responsive-table-wrapper" style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
          <div className="table-scroll-hint">
            <span>Swipe horizontally to view all role permissions</span>
            <ArrowRightLeft size={13} />
          </div>
          <table style={{ width: '100%', minWidth: '600px', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                <th style={{ padding: '14px 18px', fontSize: '13px', fontWeight: 600, color: '#6b7280', width: '38%' }}>
                  Capability Description
                </th>
                {displayRoles.map(roleName => (
                  <th key={roleName} style={{ padding: '14px 16px', fontSize: '13px', fontWeight: 700, color: '#374151', textAlign: 'center', minWidth: '100px' }}>
                    {roleName}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SYSTEM_CAPABILITIES
                .filter(cap => {
                  const term = permissionTableSearch.trim().toLowerCase();
                  if (!term) return true;
                  return cap.label.toLowerCase().includes(term) || cap.key.toLowerCase().includes(term);
                })
                .map(cap => (
                <tr
                  key={cap.key}
                  style={{
                    borderBottom: '1px solid #f3f4f6',
                    transition: 'background-color 0.12s ease'
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#fafafa'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <td style={{ padding: '14px 18px', fontSize: '13.5px', color: '#111827', fontWeight: 600 }}>
                    {cap.label}
                  </td>
                  {displayRoles.map(roleName => {
                    const lookupKey = `${roleName.toLowerCase()}_${cap.key}`;
                    const existing = permLookup[lookupKey];
                    const isEnabled = existing ? Boolean(existing.is_enabled) : (roleName.toLowerCase() === 'admin' || roleName.toLowerCase() === 'developer');

                    return (
                      <td key={roleName} style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => handleToggleCell(roleName, cap.key)}
                          style={{
                            width: '38px',
                            height: '20px',
                            borderRadius: '9999px',
                            backgroundColor: isEnabled ? '#84cc16' : '#d1d5db',
                            border: 'none',
                            padding: '2px',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            position: 'relative',
                            transition: 'background-color 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                            outline: 'none'
                          }}
                          title={`Click to ${isEnabled ? 'disable' : 'enable'} for ${roleName}`}
                        >
                          <span
                            style={{
                              width: '16px',
                              height: '16px',
                              borderRadius: '50%',
                              backgroundColor: '#ffffff',
                              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.25)',
                              transform: isEnabled ? 'translateX(18px)' : 'translateX(0px)',
                              transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                            }}
                          />
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add Custom Role */}
      {isAddingRole && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.45)',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          backdropFilter: 'blur(3px)'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            padding: '24px',
            width: '100%',
            maxWidth: '420px',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#ecfccb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Users size={20} color="#65a30d" />
              </div>
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#111827', margin: 0 }}>
                  Add New Role
                </h3>
                <p style={{ fontSize: '12px', color: '#6b7280', margin: '2px 0 0' }}>
                  Create a new role for user accounts and permission sets
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveNewRole}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                  Role Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Manager, Auditor, Technician"
                  value={newRoleInput}
                  onChange={e => setNewRoleInput(e.target.value)}
                  required
                  autoFocus
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1.5px solid #d1d5db', fontSize: '13.5px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                  Description (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Brief description of this role's responsibilities"
                  value={newRoleDesc}
                  onChange={e => setNewRoleDesc(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1.5px solid #d1d5db', fontSize: '13.5px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingRole(false);
                    setNewRoleInput('');
                    setNewRoleDesc('');
                  }}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: '1px solid #d1d5db',
                    backgroundColor: '#f3f4f6',
                    color: '#374151',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '8px 20px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#84cc16',
                    color: '#111827',
                    fontSize: '13px',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  Add Role
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
