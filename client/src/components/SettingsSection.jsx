import React, { useState, useEffect } from 'react';
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
  EyeOff
} from 'lucide-react';

export default function SettingsSection({
  currentUser = 'shanaka',
  currentUserName = 'Shanaka',
  currentUserRole = 'Admin',
  currentUserEmail = 'shanaka@htsk.com',
  currentUserAvatar = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
  onOpenProfile = () => {},
  setActiveTab = () => {},
  onLogout = () => {},
  canManageUsers = true
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
    <div className="responsive-section-container">
      {/* Top Header matching system theme */}
      <div className="responsive-header">
        <div>
          <h1 className="system-h1">
            Mobile Management
          </h1>
          <p className="system-breadcrumb">
            <span>Workspace / Settings</span>
            <span>•</span>
            <strong style={{ color: '#111827' }}>System &amp; Shift Configuration</strong>
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
          canManageUsers={canManageUsers}
        />
      </div>

      {/* 2-Column Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.25fr 1fr', gap: '40px', marginBottom: '40px' }}>
        {/* LEFT COLUMN: System & Shift Settings */}
        <div>
          <div style={{ marginBottom: '22px' }}>
            <h2 className="system-h2">
              System &amp; Shift Settings
            </h2>
            <div style={{ fontSize: '13px', color: '#9ca3af', marginTop: '4px' }}>
              Workspace / Administration / Shift Configuration
            </div>
          </div>

          {shiftSavedMessage && (
            <div style={{
              backgroundColor: '#f0fdf4',
              border: '1px solid #bbf7d0',
              color: '#15803d',
              padding: '10px 14px',
              borderRadius: '10px',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '16px'
            }}>
              <CheckCircle2 size={16} />
              <span>Shift configuration saved successfully!</span>
            </div>
          )}

          <form onSubmit={handleSaveShiftSettings} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Card 1: 12-Hour Shift Timing Configuration */}
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              border: '1px solid #e5e7eb',
              padding: '24px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
                <Clock size={20} color="#84cc16" />
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#111827', margin: 0 }}>
                    12-Hour Shift Timing Configuration
                  </h3>
                  <p style={{ fontSize: '12px', color: '#9ca3af', margin: '2px 0 0' }}>
                    Configure working hours, shift handover window, and grace periods
                  </p>
                </div>
              </div>

              {/* Yellow and Purple Boxes */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '18px' }}>
                {/* Morning Shift (Day) */}
                <div style={{
                  backgroundColor: '#fefce8',
                  borderRadius: '14px',
                  border: '1px solid #fef08a',
                  padding: '16px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px', color: '#854d0e', fontWeight: 700, fontSize: '13px' }}>
                    <Sun size={15} />
                    <span>Morning Shift (Day)</span>
                  </div>

                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ display: 'block', fontSize: '11.5px', color: '#713f12', marginBottom: '4px' }}>
                      Start Time
                    </label>
                    <input
                      type="text"
                      value={morningStart}
                      onChange={e => setMorningStart(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid #fde047',
                        backgroundColor: '#ffffff',
                        fontSize: '13.5px',
                        outline: 'none'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11.5px', color: '#713f12', marginBottom: '4px' }}>
                      End / Expected Return Time
                    </label>
                    <input
                      type="text"
                      value={morningEnd}
                      onChange={e => setMorningEnd(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid #fde047',
                        backgroundColor: '#ffffff',
                        fontSize: '13.5px',
                        outline: 'none'
                      }}
                    />
                  </div>
                </div>

                {/* Night Shift (Night) */}
                <div style={{
                  backgroundColor: '#f5f3ff',
                  borderRadius: '14px',
                  border: '1px solid #ddd6fe',
                  padding: '16px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px', color: '#5b21b6', fontWeight: 700, fontSize: '13px' }}>
                    <Moon size={15} />
                    <span>Night Shift (Night)</span>
                  </div>

                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ display: 'block', fontSize: '11.5px', color: '#4c1d95', marginBottom: '4px' }}>
                      Start Time
                    </label>
                    <input
                      type="text"
                      value={nightStart}
                      onChange={e => setNightStart(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid #c4b5fd',
                        backgroundColor: '#ffffff',
                        fontSize: '13.5px',
                        outline: 'none'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11.5px', color: '#4c1d95', marginBottom: '4px' }}>
                      End / Expected Return Time
                    </label>
                    <input
                      type="text"
                      value={nightEnd}
                      onChange={e => setNightEnd(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid #c4b5fd',
                        backgroundColor: '#ffffff',
                        fontSize: '13.5px',
                        outline: 'none'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Bottom Inputs: Default Duration & Grace Period */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                    Default Shift Duration (Hours)
                  </label>
                  <input
                    type="number"
                    value={shiftDurationHours}
                    onChange={e => setShiftDurationHours(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #d1d5db',
                      fontSize: '13.5px'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                    Applicable Handover Grace Period (Minutes)
                  </label>
                  <select
                    value={gracePeriodMinutes}
                    onChange={e => setGracePeriodMinutes(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #d1d5db',
                      fontSize: '13.5px',
                      backgroundColor: '#ffffff'
                    }}
                  >
                    <option value={15}>15 Minutes</option>
                    <option value={30}>30 Minutes (Recommended)</option>
                    <option value={45}>45 Minutes</option>
                    <option value={60}>60 Minutes</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Card 2: Accountability & Discrepancy Safeguards */}
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              border: '1px solid #e5e7eb',
              padding: '24px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                <Shield size={20} color="#84cc16" />
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#111827', margin: 0 }}>
                    Accountability &amp; Discrepancy Safeguards
                  </h3>
                  <p style={{ fontSize: '12px', color: '#9ca3af', margin: '2px 0 0' }}>
                    Enforce chain-of-custody rules and missing handover detection
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#374151', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={flagDiscrepancy}
                    onChange={e => setFlagDiscrepancy(e.target.checked)}
                    style={{ accentColor: '#84cc16', width: '17px', height: '17px' }}
                  />
                  <span>Flag discrepancy immediately if shift ends without confirmed return or handover</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#374151', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={preventAvailable}
                    onChange={e => setPreventAvailable(e.target.checked)}
                    style={{ accentColor: '#84cc16', width: '17px', height: '17px' }}
                  />
                  <span>Prevent devices from becoming Available without verified physical acceptance into inventory</span>
                </label>
              </div>
            </div>

            {/* Save Button */}
            <div>
              <button
                type="submit"
                className="btn-primary-lime"
              >
                Save Shift Configuration
              </button>
            </div>
          </form>
        </div>

        {/* RIGHT COLUMN: Group Settings (Image 2) */}
        <div>
          <div style={{ marginBottom: '22px' }}>
            <h2 className="system-h2">
              Group Settings
            </h2>
            <div style={{ fontSize: '13px', color: '#9ca3af', marginTop: '4px' }}>
              Workspace / Administration / Group Settings
            </div>
          </div>

          {groupSavedMessage && (
            <div style={{
              backgroundColor: '#f0fdf4',
              border: '1px solid #bbf7d0',
              color: '#15803d',
              padding: '10px 14px',
              borderRadius: '10px',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '16px'
            }}>
              <CheckCircle2 size={16} />
              <span>Group added successfully!</span>
            </div>
          )}

          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e5e7eb',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px'
          }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#111827', margin: 0 }}>
              Add a group or edit a group
            </h3>

            <form onSubmit={handleAddGroup} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                  Group Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Group E or Finance Team"
                  value={newGroupName}
                  onChange={e => setNewGroupName(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #d1d5db',
                    fontSize: '13.5px'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                  Description (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Daytime station units"
                  value={newGroupDesc}
                  onChange={e => setNewGroupDesc(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #d1d5db',
                    fontSize: '13.5px'
                  }}
                />
              </div>

              <div>
                <button
                  type="submit"
                  className="btn-primary-lime"
                >
                  Save Group
                </button>
              </div>
            </form>

            {/* List of current groups */}
            <div style={{ marginTop: '10px' }}>
              <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#4b5563', marginBottom: '8px' }}>
                Active System Groups:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {groups.map(g => (
                  <span
                    key={g.id || g.group_name}
                    style={{
                      backgroundColor: '#f3f4f6',
                      color: '#1f2937',
                      padding: '5px 12px',
                      borderRadius: '9999px',
                      fontSize: '12.5px',
                      fontWeight: 600
                    }}
                  >
                    {g.group_name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
