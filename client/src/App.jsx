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
    return localStorage.getItem('htsk_admin_authenticated') !== 'false';
  });
  const [activeTab, setActiveTab] = useState('dashboard');
  const [records, setRecords] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const handleAdminLogin = () => {
    localStorage.setItem('htsk_admin_authenticated', 'true');
    setIsAdminLoggedIn(true);
  };

  const handleAdminLogout = () => {
    localStorage.setItem('htsk_admin_authenticated', 'false');
    setIsAdminLoggedIn(false);
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

  useEffect(() => {
    fetchRecords();
    fetchGroups();
  }, []);

  // Save manual record
  const handleSaveManualRecord = async recordData => {
    const res = await fetch('/api/records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
    const res = await fetch(`/api/records/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
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
    if (!window.confirm(`Are you sure you want to delete record #${id}?`)) return;

    try {
      const res = await fetch(`/api/records/${id}`, { method: 'DELETE' });
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
        <div
          onClick={handleAdminLogout}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
          title="Logout"
        >
          <img
            src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"
            alt="Shanaka"
            className="mobile-avatar"
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
      />

      {/* Main Workspace View */}
      <main className="main-content">
        <ErrorBoundary>
          {activeTab === 'dashboard' && (
            <Dashboard
              records={records}
              loading={loading}
              onOpenAddModal={() => setIsAddModalOpen(true)}
              onOpenEditModal={record => setEditingRecord(record)}
              onDeleteRecord={handleDeleteRecord}
              onQuickReturn={handleQuickReturn}
              onDownloadTemplate={handleDownloadTemplate}
              onExportExcel={handleExportExcel}
              groups={groups}
              refreshRecords={fetchRecords}
              onLogout={handleAdminLogout}
            />
          )}

          {activeTab === 'update' && (
            <UpdateSection
              onImportSuccess={handleImportSuccess}
              onDownloadTemplate={handleDownloadTemplate}
              setActiveTab={setActiveTab}
              groups={groups}
            />
          )}

          {activeTab === 'history' && <HistorySection />}

          {activeTab === 'usermanage' && <UserManageSection />}

          {activeTab === 'dailytask' && (
            <DailyTaskSection
              onOpenAddModal={() => setIsAddModalOpen(true)}
              onOpenEditModal={record => setEditingRecord(record)}
              onDeleteRecord={handleDeleteRecord}
              groups={groups}
              refreshRecords={fetchRecords}
              onLogout={handleAdminLogout}
            />
          )}

          {activeTab === 'inventory' && <InventorySection onLogout={handleAdminLogout} />}

          {activeTab === 'settings' && <SettingsSection />}
        </ErrorBoundary>
      </main>

      {/* Manual Entry Modal */}
      <ManualEntryModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={handleSaveManualRecord}
        groups={groups}
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
