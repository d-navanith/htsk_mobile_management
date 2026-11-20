import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import UpdateSection from './components/UpdateSection';
import HistorySection from './components/HistorySection';
import ManualEntryModal from './components/ManualEntryModal';
import EditRecordModal from './components/EditRecordModal';
import AdminLogin from './components/AdminLogin';
import SettingsSection from './components/SettingsSection';
import UserManageSection from './components/UserManageSection';
import DailyTaskSection from './components/DailyTaskSection';
import InventorySection from './components/InventorySection';
import ProfileModal from './components/ProfileModal';
import UserProfileMenu from './components/UserProfileMenu';
import { Menu } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'system-ui, sans-serif' }}>
          <h2 style={{ color: '#ef4444', fontSize: '20px', fontWeight: 800 }}>Section Error</h2>
          <p style={{ color: '#6b7280', margin: '8px 0' }}>{this.state.error?.message || 'Error loading content.'}</p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{ marginTop: '12px', padding: '8px 20px', borderRadius: '8px', backgroundColor: '#84cc16', color: '#000', fontWeight: 800, border: 'none', cursor: 'pointer' }}
          >
            Reload Section
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(() => {
    const auth = localStorage.getItem('htsk_admin_authenticated');
    const token = localStorage.getItem('htsk_session_token');
    return auth === 'true' && Boolean(token);
  });
  const [currentUser, setCurrentUser] = useState(() => {
    return localStorage.getItem('htsk_current_user') || '';
  });
  const [currentUserName, setCurrentUserName] = useState(() => {
    return localStorage.getItem('htsk_user_name') || '';
  });
  const [currentUserRole, setCurrentUserRole] = useState(() => {
    return localStorage.getItem('htsk_user_role') || '';
  });
  const [currentUserEmail, setCurrentUserEmail] = useState(() => {
    return localStorage.getItem('htsk_user_email') || 'shanaka@htsk.com';
  });
  const [currentUserAvatar, setCurrentUserAvatar] = useState(() => {
    return localStorage.getItem('htsk_user_avatar') || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80';
  });
  const [userPermissions, setUserPermissions] = useState(() => {
    try {
      const saved = localStorage.getItem('htsk_user_permissions');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Role Capability Checks
  const isViewer = currentUserRole === 'Viewer';
  const isAdmin = currentUserRole === 'Admin';
  const canEdit = isAdmin || Boolean(userPermissions.manage_devices);
  const canDelete = isAdmin || Boolean(userPermissions.delete_records);
  const canManageUsers = isAdmin || Boolean(userPermissions.manage_users);

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileModalTab, setProfileModalTab] = useState('general');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [records, setRecords] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addModalContext, setAddModalContext] = useState({});
  const [editingRecord, setEditingRecord] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const handleOpenProfile = (tab = 'general') => {
    setProfileModalTab(tab);
    setIsProfileModalOpen(true);
  };

  const handleUpdateProfile = (updatedUser) => {
    if (!updatedUser) return;
    if (updatedUser.username) {
      setCurrentUser(updatedUser.username);
      localStorage.setItem('htsk_current_user', updatedUser.username);
    }
    if (updatedUser.full_name) {
      setCurrentUserName(updatedUser.full_name);
      localStorage.setItem('htsk_user_name', updatedUser.full_name);
    }
    if (updatedUser.avatar_url) {
      setCurrentUserAvatar(updatedUser.avatar_url);
      localStorage.setItem('htsk_user_avatar', updatedUser.avatar_url);
    }
    if (updatedUser.email) {
      setCurrentUserEmail(updatedUser.email);
      localStorage.setItem('htsk_user_email', updatedUser.email);
    }
    if (updatedUser.role) {
      setCurrentUserRole(updatedUser.role);
      localStorage.setItem('htsk_user_role', updatedUser.role);
    }
    showToast('Profile updated successfully!', 'success');
  };

  const handleAdminLogin = (loginData) => {
    const token = loginData?.token || ('session_' + Date.now());
    const userObj = loginData?.user || (typeof loginData === 'object' ? loginData : {});
    const username = userObj.username || (typeof loginData === 'string' ? loginData : 'shanaka');
    const fullName = userObj.full_name || (username ? username.charAt(0).toUpperCase() + username.slice(1) : 'Shanaka');
    const role = userObj.role || 'Admin';
    const avatar = userObj.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80';
    const email = userObj.email || `${username}@htsk.com`;
    const permissions = loginData?.permissions || userObj?.permissions || {};

    localStorage.setItem('htsk_admin_authenticated', 'true');
    localStorage.setItem('htsk_session_token', token);
    localStorage.setItem('htsk_current_user', username);
    localStorage.setItem('htsk_user_name', fullName);
    localStorage.setItem('htsk_user_role', role);
    localStorage.setItem('htsk_user_avatar', avatar);
    localStorage.setItem('htsk_user_email', email);
    localStorage.setItem('htsk_user_permissions', JSON.stringify(permissions));

    setCurrentUser(username);
    setCurrentUserName(fullName);
    setCurrentUserRole(role);
    setCurrentUserAvatar(avatar);
    setCurrentUserEmail(email);
    setUserPermissions(permissions);
    setIsAdminLoggedIn(true);

    showToast(`Welcome back, ${fullName}! Signed in as ${role}.`, 'success');
  };

  const handleAdminLogout = async () => {
    const token = localStorage.getItem('htsk_session_token');
    if (token) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token })
        });
      } catch (err) {
        // silent
      }
    }
    localStorage.removeItem('htsk_admin_authenticated');
    localStorage.removeItem('htsk_session_token');
    localStorage.removeItem('htsk_current_user');
    localStorage.removeItem('htsk_user_name');
    localStorage.removeItem('htsk_user_role');
    localStorage.removeItem('htsk_user_avatar');
    localStorage.removeItem('htsk_user_email');
    localStorage.removeItem('htsk_user_permissions');
    setIsAdminLoggedIn(false);
    setCurrentUser('');
    setCurrentUserName('');
    setCurrentUserRole('');
    setUserPermissions({});
    setCurrentUserAvatar('https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80');
    setCurrentUserEmail('');
    setRecords([]);
    showToast('You have been securely signed out.', 'info');
  };

  const showToast = (text, type = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  // Fetch all records
  const fetchRecords = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/records');
      const data = await res.json();
      if (data.success) {
        setRecords(data.data || []);
      }
    } catch (err) {
      console.error('Error loading records:', err);
      showToast('Failed to load records from server', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Fetch distinct groups
  const fetchGroups = async () => {
    try {
      const res = await fetch('/api/groups');
      const data = await res.json();
      if (data.success) {
        setGroups(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching groups:', err);
    }
  };

  // On mount and auth state change: only load data if authenticated, and verify session
  useEffect(() => {
    if (!isAdminLoggedIn) {
      return;
    }

    const token = localStorage.getItem('htsk_session_token');
    if (token) {
      fetch('/api/auth/verify', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          if (data.success && data.user) {
            setCurrentUser(data.user.username);
            setCurrentUserName(data.user.full_name || data.user.username);
            setCurrentUserRole(data.user.role || 'Admin');
            if (data.user.avatar_url) {
              setCurrentUserAvatar(data.user.avatar_url);
              localStorage.setItem('htsk_user_avatar', data.user.avatar_url);
            }
            if (data.user.email) {
              setCurrentUserEmail(data.user.email);
              localStorage.setItem('htsk_user_email', data.user.email);
            }
            if (data.permissions || data.user.permissions) {
              const perms = data.permissions || data.user.permissions;
              setUserPermissions(perms);
              localStorage.setItem('htsk_user_permissions', JSON.stringify(perms));
            }
          } else {
            // Session expired or revoked
            handleAdminLogout();
          }
        })
        .catch(() => {
          // If offline or network issue, maintain current local session
        });
    }

    fetchRecords();
    fetchGroups();
  }, [isAdminLoggedIn]);

  // Sync role-based permissions dynamically
  useEffect(() => {
    if (currentUserRole) {
      fetch(`/api/user-permissions?role=${encodeURIComponent(currentUserRole)}`)
        .then(res => res.json())
        .then(data => {
          if (data.success && data.permissions) {
            setUserPermissions(data.permissions);
            localStorage.setItem('htsk_user_permissions', JSON.stringify(data.permissions));
          }
        })
        .catch(() => {});
    }
  }, [currentUserRole]);

  // Protect User Management view for unauthorized roles (View only roles)
  useEffect(() => {
    if (!canManageUsers && activeTab === 'usermanage') {
      setActiveTab('dashboard');
    }
  }, [canManageUsers, activeTab]);

  // Save manual record
  const handleSaveManualRecord = async recordData => {
    if (!canEdit) {
      showToast('You do not have permission to add records (View only).', 'error');
      return;
    }
    const token = localStorage.getItem('htsk_session_token');
    const res = await fetch('/api/records', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        'X-User-Role': currentUserRole
      },
      body: JSON.stringify(recordData)
    });
    const result = await res.json();
    if (!result.success) {
      throw new Error(result.error || 'Failed to save');
    }
    showToast(result.message || `Saved record for ${recordData.name} successfully!`);
    fetchRecords();
    fetchGroups();
  };

  // Update existing record
  const handleUpdateRecord = async (id, updatedFields) => {
    if (!canEdit) {
      showToast('You do not have permission to edit records (View only).', 'error');
      return;
    }
    const token = localStorage.getItem('htsk_session_token');
    const res = await fetch(`/api/records/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        'X-User-Role': currentUserRole
      },
      body: JSON.stringify(updatedFields)
    });
    const result = await res.json();
    if (!result.success) {
      throw new Error(result.error || 'Failed to update');
    }
    showToast(`Updated record #${id} successfully!`);
    fetchRecords();
    fetchGroups();
  };

  // Delete record
  const handleDeleteRecord = async id => {
    if (!canDelete) {
      showToast('You do not have permission to delete records.', 'error');
      return;
    }
    if (!window.confirm(`Are you sure you want to delete record #${id}?`)) return;

    try {
      const token = localStorage.getItem('htsk_session_token');
      const res = await fetch(`/api/records/${id}`, {
        method: 'DELETE',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          'X-User-Role': currentUserRole
        }
      });
      const result = await res.json();
      if (result.success) {
        showToast('Record deleted successfully');
        fetchRecords();
      }
    } catch (err) {
      console.error('Error deleting:', err);
      showToast('Failed to delete record', 'error');
    }
  };

  // Quick mark return & Done
  const handleQuickReturn = async item => {
    const now = new Date();
    let hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'P.M.' : 'A.M.';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const formatted = `${String(hours).padStart(2, '0')}.${minutes} ${ampm}`;

    try {
      await handleUpdateRecord(item.id, {
        return_time: item.return_time || formatted,
        sign: 'Done'
      });
      showToast(`Process completed for ${item.name} (Return: ${item.return_time || formatted}, Sign: Done)`);
    } catch (e) {
      showToast('Error marking return and sign', 'error');
    }
  };

  // Download clean Excel template
  const handleDownloadTemplate = () => {
    window.location.href = '/api/template';
  };

  // Export current records to Excel
  const handleExportExcel = () => {
    window.location.href = '/api/export';
  };

  // Callback when sheet upload is confirmed in UpdateSection
  const handleImportSuccess = count => {
    fetchRecords();
    fetchGroups();
    setActiveTab('dashboard');
  };

  if (!isAdminLoggedIn) {
    return <AdminLogin onLogin={handleAdminLogin} />;
  }

  return (
    <div className="app-layout">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '24px',
            zIndex: 100,
            backgroundColor: toastMessage.type === 'error' ? '#ef4444' : '#111827',
            color: '#ffffff',
            padding: '12px 20px',
            borderRadius: '10px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.15)',
            fontSize: '14px',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            animation: 'fadeIn 0.2s ease-out'
          }}
        >
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Mobile Top Header */}
      <header className="mobile-header">
        <button
          className="mobile-menu-btn"
          onClick={() => setIsMobileSidebarOpen(true)}
          title="Open Menu"
        >
          <Menu size={24} />
        </button>
        <div className="mobile-brand">HTSK</div>
        <div>
          <UserProfileMenu
            currentUser={currentUser}
            currentUserName={currentUserName}
            currentUserRole={currentUserRole}
            currentUserEmail={currentUserEmail}
            currentUserAvatar={currentUserAvatar}
            onOpenProfile={() => handleOpenProfile('general')}
            onOpenSecurity={() => handleOpenProfile('security')}
            onLogout={handleAdminLogout}
            setActiveTab={setActiveTab}
            onRefresh={fetchRecords}
            canManageUsers={canManageUsers}
          />
        </div>
      </header>

      {/* Clean Sidebar matching mockups */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={handleAdminLogout}
        isMobileOpen={isMobileSidebarOpen}
        setIsMobileOpen={setIsMobileSidebarOpen}
        canManageUsers={canManageUsers}
      />

      {/* Main Workspace View */}
      <main className="main-content">
        <ErrorBoundary>
          {activeTab === 'dashboard' && (
            <Dashboard
              records={records}
              loading={loading}
              onOpenAddModal={ctx => {
                setAddModalContext(ctx || {});
                setIsAddModalOpen(true);
              }}
              onOpenEditModal={record => setEditingRecord(record)}
              onDeleteRecord={handleDeleteRecord}
              onQuickReturn={handleQuickReturn}
              onDownloadTemplate={handleDownloadTemplate}
              onExportExcel={handleExportExcel}
              groups={groups}
              refreshRecords={fetchRecords}
              setActiveTab={setActiveTab}
              currentUser={currentUser}
              currentUserName={currentUserName}
              currentUserRole={currentUserRole}
              currentUserEmail={currentUserEmail}
              currentUserAvatar={currentUserAvatar}
              onOpenProfile={handleOpenProfile}
              onLogout={handleAdminLogout}
              canEdit={canEdit}
              canDelete={canDelete}
              canManageUsers={canManageUsers}
            />
          )}

          {activeTab === 'update' && (
            <UpdateSection
              onImportSuccess={handleImportSuccess}
              onDownloadTemplate={handleDownloadTemplate}
              setActiveTab={setActiveTab}
              groups={groups}
              currentUser={currentUser}
              currentUserName={currentUserName}
              currentUserRole={currentUserRole}
              currentUserEmail={currentUserEmail}
              currentUserAvatar={currentUserAvatar}
              onOpenProfile={handleOpenProfile}
              onLogout={handleAdminLogout}
            />
          )}

          {activeTab === 'history' && (
            <HistorySection
              currentUser={currentUser}
              currentUserName={currentUserName}
              currentUserRole={currentUserRole}
              currentUserEmail={currentUserEmail}
              currentUserAvatar={currentUserAvatar}
              onOpenProfile={handleOpenProfile}
              setAppTab={setActiveTab}
              onLogout={handleAdminLogout}
              canManageUsers={canManageUsers}
            />
          )}

          {activeTab === 'usermanage' && (
            <UserManageSection
              currentUser={currentUser}
              currentUserName={currentUserName}
              currentUserRole={currentUserRole}
              currentUserEmail={currentUserEmail}
              currentUserAvatar={currentUserAvatar}
              onOpenProfile={handleOpenProfile}
              setActiveTab={setActiveTab}
              onLogout={handleAdminLogout}
            />
          )}

          {activeTab === 'dailytask' && (
            <DailyTaskSection
              onOpenAddModal={() => setIsAddModalOpen(true)}
              onOpenEditModal={record => setEditingRecord(record)}
              onDeleteRecord={handleDeleteRecord}
              groups={groups}
              refreshRecords={fetchRecords}
              setActiveTab={setActiveTab}
              currentUser={currentUser}
              currentUserName={currentUserName}
              currentUserRole={currentUserRole}
              currentUserEmail={currentUserEmail}
              currentUserAvatar={currentUserAvatar}
              onOpenProfile={handleOpenProfile}
              onLogout={handleAdminLogout}
              canEdit={canEdit}
              canDelete={canDelete}
              canManageUsers={canManageUsers}
            />
          )}

          {activeTab === 'inventory' && (
            <InventorySection
              currentUser={currentUser}
              currentUserName={currentUserName}
              currentUserRole={currentUserRole}
              currentUserEmail={currentUserEmail}
              currentUserAvatar={currentUserAvatar}
              onOpenProfile={handleOpenProfile}
              setActiveTab={setActiveTab}
              onLogout={handleAdminLogout}
              canEdit={canEdit}
              canDelete={canDelete}
              canManageUsers={canManageUsers}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsSection
              currentUser={currentUser}
              currentUserName={currentUserName}
              currentUserRole={currentUserRole}
              currentUserEmail={currentUserEmail}
              currentUserAvatar={currentUserAvatar}
              onOpenProfile={handleOpenProfile}
              setActiveTab={setActiveTab}
              onLogout={handleAdminLogout}
              canManageUsers={canManageUsers}
            />
          )}
        </ErrorBoundary>
      </main>

      {/* Profile Management Modal */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        currentUser={currentUser}
        currentUserName={currentUserName}
        currentUserEmail={currentUserEmail}
        currentUserAvatar={currentUserAvatar}
        currentUserRole={currentUserRole}
        onUpdateProfile={handleUpdateProfile}
        initialTab={profileModalTab}
      />

      {/* Manual Entry Modal */}
      <ManualEntryModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={handleSaveManualRecord}
        groups={groups}
        initialContext={addModalContext}
      />

      {/* Edit Record Modal */}
      <EditRecordModal
        isOpen={Boolean(editingRecord)}
        onClose={() => setEditingRecord(null)}
        onUpdate={handleUpdateRecord}
        onDelete={handleDeleteRecord}
        record={editingRecord}
      />
    </div>
  );
}
