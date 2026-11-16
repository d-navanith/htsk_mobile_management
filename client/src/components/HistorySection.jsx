import React, { useState, useEffect } from 'react';
import {
  History,
  Smartphone,
  ShieldCheck,
  RefreshCw,
  Search,
  CheckCircle2,
  Clock,
  User,
  Activity
} from 'lucide-react';

export default function HistorySection() {
  const [activeTab, setActiveTab] = useState('activeDevices'); // 'activeDevices', 'activityHistory', 'auditLogins'
  const [activeDevices, setActiveDevices] = useState([]);
  const [historyLogs, setHistoryLogs] = useState([]);
  const [auditLogins, setAuditLogins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchHistoryData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/history');
      const data = await res.json();
      if (data.success) {
        setActiveDevices(data.activeDevices || []);
        setHistoryLogs(data.historyLogs || []);
        setAuditLogins(data.auditLogins || []);
      }
    } catch (e) {
      console.error('Error fetching history:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistoryData();
  }, []);

  // Filtered lists
  const filteredActiveDevices = activeDevices.filter(d => {
    const term = searchTerm.toLowerCase();
    return (
      (d.name || '').toLowerCase().includes(term) ||
      (d.active_user || '').toLowerCase().includes(term) ||
      (d.device_id || '').toLowerCase().includes(term) ||
      (d.group_name || '').toLowerCase().includes(term) ||
      (d.shift || '').toLowerCase().includes(term)
    );
  });

  const filteredHistoryLogs = historyLogs.filter(l => {
    const term = searchTerm.toLowerCase();
    return (
      (l.emp_name || '').toLowerCase().includes(term) ||
      (l.action || '').toLowerCase().includes(term) ||
      (l.details || '').toLowerCase().includes(term) ||
      (l.admin_user || '').toLowerCase().includes(term)
    );
  });

  const filteredAuditLogins = auditLogins.filter(log => {
    const term = searchTerm.toLowerCase();
    return (
      (log.username || '').toLowerCase().includes(term) ||
      (log.role || '').toLowerCase().includes(term) ||
      (log.status || '').toLowerCase().includes(term)
    );
  });

  return (
    <div style={{ maxWidth: '1360px', margin: '0 auto', paddingBottom: '40px' }}>
      {/* Page Header matching Image 1 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: 700, color: '#111827', margin: 0, letterSpacing: '-0.02em' }}>
            Mobile Management
          </h1>
          <div style={{ fontSize: '13px', color: '#9ca3af', marginTop: '4px', fontWeight: 500 }}>
            Workspace / History
          </div>
        </div>

        <button
          onClick={fetchHistoryData}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '9px 18px',
            borderRadius: '10px',
            border: '1px solid #d1d5db',
            backgroundColor: '#ffffff',
            color: '#374151',
            fontSize: '13.5px',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          <RefreshCw size={15} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '14px' }}>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => setActiveTab('activeDevices')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              borderRadius: '9999px',
              fontSize: '13.5px',
              fontWeight: 700,
              cursor: 'pointer',
              border: activeTab === 'activeDevices' ? 'none' : '1px solid #e5e7eb',
              backgroundColor: activeTab === 'activeDevices' ? '#a3e635' : '#ffffff',
              color: activeTab === 'activeDevices' ? '#000000' : '#4b5563'
            }}
          >
            <Smartphone size={16} />
            <span>Active Devices &amp; Current Users ({activeDevices.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('activityHistory')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              borderRadius: '9999px',
              fontSize: '13.5px',
              fontWeight: 700,
              cursor: 'pointer',
              border: activeTab === 'activityHistory' ? 'none' : '1px solid #e5e7eb',
              backgroundColor: activeTab === 'activityHistory' ? '#a3e635' : '#ffffff',
              color: activeTab === 'activityHistory' ? '#000000' : '#4b5563'
            }}
          >
            <History size={16} />
            <span>Audit Activity History ({historyLogs.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('auditLogins')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              borderRadius: '9999px',
              fontSize: '13.5px',
              fontWeight: 700,
              cursor: 'pointer',
              border: activeTab === 'auditLogins' ? 'none' : '1px solid #e5e7eb',
              backgroundColor: activeTab === 'auditLogins' ? '#a3e635' : '#ffffff',
              color: activeTab === 'auditLogins' ? '#000000' : '#4b5563'
            }}
          >
            <ShieldCheck size={16} />
            <span>Audit Login Logs ({auditLogins.length})</span>
          </button>
        </div>

        {/* Search Input */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          backgroundColor: '#f3f4f6',
          borderRadius: '9999px',
          padding: '8px 16px',
          width: '280px'
        }}>
          <Search size={15} color="#9ca3af" />
          <input
            type="text"
            placeholder="Search records..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{
              border: 'none',
              background: 'transparent',
              outline: 'none',
              fontSize: '13px',
              color: '#374151',
              width: '100%'
            }}
          />
        </div>
      </div>

      {/* TAB 1: ACTIVE DEVICES & WHO IS ACTIVELY USING EACH DEVICE */}
      {activeTab === 'activeDevices' && (
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e5e7eb',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
        }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#111827', margin: 0 }}>
              Active Mobile Phones &amp; Current Documented Custodians
            </h3>
            <p style={{ fontSize: '12px', color: '#6b7280', margin: '3px 0 0' }}>
              Shows each physical mobile unit and the exact employee actively holding and using it
            </p>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                <th style={{ padding: '14px 16px', fontSize: '12.5px', fontWeight: 700, color: '#4b5563' }}>Rec. #</th>
                <th style={{ padding: '14px 16px', fontSize: '12.5px', fontWeight: 700, color: '#4b5563' }}>Device ID (Taking)</th>
                <th style={{ padding: '14px 16px', fontSize: '12.5px', fontWeight: 700, color: '#4b5563' }}>Current Active User</th>
                <th style={{ padding: '14px 16px', fontSize: '12.5px', fontWeight: 700, color: '#4b5563' }}>Original Assignee</th>
                <th style={{ padding: '14px 16px', fontSize: '12.5px', fontWeight: 700, color: '#4b5563' }}>Shift</th>
                <th style={{ padding: '14px 16px', fontSize: '12.5px', fontWeight: 700, color: '#4b5563' }}>Group</th>
                <th style={{ padding: '14px 16px', fontSize: '12.5px', fontWeight: 700, color: '#4b5563' }}>Issued At</th>
                <th style={{ padding: '14px 16px', fontSize: '12.5px', fontWeight: 700, color: '#4b5563' }}>Handover To</th>
                <th style={{ padding: '14px 16px', fontSize: '12.5px', fontWeight: 700, color: '#4b5563', textAlign: 'center' }}>Sign</th>
              </tr>
            </thead>
            <tbody>
              {filteredActiveDevices.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: '36px', textAlign: 'center', color: '#9ca3af', fontSize: '14px' }}>
                    No active devices recorded.
                  </td>
                </tr>
              ) : (
                filteredActiveDevices.map((d, idx) => (
                  <tr key={d.record_id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '14px 16px', fontSize: '13px', fontWeight: 700, color: '#111827' }}>
                      {idx + 1}.
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{
                        backgroundColor: '#f1f5f9',
                        color: '#0f172a',
                        fontWeight: 700,
                        padding: '3px 10px',
                        borderRadius: '6px',
                        fontSize: '12.5px'
                      }}>
                        {d.device_id}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '13.5px', fontWeight: 700, color: '#16a34a' }}>
                      {d.active_user || d.name}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '13px', color: '#4b5563' }}>
                      {d.name}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '13px', color: '#374151' }}>
                      {d.shift}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '13px', color: '#374151' }}>
                      {d.group_name}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '13px', color: '#4b5563' }}>
                      {d.issued_at}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '13px', color: '#4b5563' }}>
                      {d.handover_to || '—'}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                      <span style={{
                        fontSize: '12.5px',
                        fontWeight: 700,
                        color: (d.sign || '').toLowerCase() === 'done' ? '#16a34a' : '#ea580c'
                      }}>
                        {d.sign}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 2: AUDIT ACTIVITY HISTORY */}
      {activeTab === 'activityHistory' && (
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e5e7eb',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
        }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#111827', margin: 0 }}>
              Audit Activity History
            </h3>
            <p style={{ fontSize: '12px', color: '#6b7280', margin: '3px 0 0' }}>
              Full chronological log of every device issue, return, edit, and shift handover
            </p>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                <th style={{ padding: '14px 16px', fontSize: '12.5px', fontWeight: 700, color: '#4b5563', width: '160px' }}>Timestamp</th>
                <th style={{ padding: '14px 16px', fontSize: '12.5px', fontWeight: 700, color: '#4b5563' }}>Employee</th>
                <th style={{ padding: '14px 16px', fontSize: '12.5px', fontWeight: 700, color: '#4b5563' }}>Action Taken</th>
                <th style={{ padding: '14px 16px', fontSize: '12.5px', fontWeight: 700, color: '#4b5563' }}>Devices</th>
                <th style={{ padding: '14px 16px', fontSize: '12.5px', fontWeight: 700, color: '#4b5563' }}>Handover To</th>
                <th style={{ padding: '14px 16px', fontSize: '12.5px', fontWeight: 700, color: '#4b5563' }}>Admin</th>
                <th style={{ padding: '14px 16px', fontSize: '12.5px', fontWeight: 700, color: '#4b5563' }}>Details / Remarks</th>
              </tr>
            </thead>
            <tbody>
              {filteredHistoryLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '36px', textAlign: 'center', color: '#9ca3af', fontSize: '14px' }}>
                    No audit logs available.
                  </td>
                </tr>
              ) : (
                filteredHistoryLogs.map(log => (
                  <tr key={log.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '14px 16px', fontSize: '12px', color: '#6b7280', whiteSpace: 'nowrap' }}>
                      {log.timestamp}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '13px', fontWeight: 700, color: '#111827' }}>
                      {log.emp_name}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{
                        backgroundColor: '#f0fdf4',
                        color: '#166534',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 600
                      }}>
                        {log.action}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '12.5px', color: '#374151' }}>
                      {log.taking_device ? <span>Taking: <strong>{log.taking_device}</strong></span> : ''}
                      {log.return_device ? <span style={{ marginLeft: '6px' }}>Return: {log.return_device}</span> : ''}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '13px', color: '#111827' }}>
                      {log.handover_to || '—'}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '12.5px', color: '#4b5563' }}>
                      {log.admin_user || 'Shanaka'}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '12.5px', color: '#6b7280' }}>
                      {log.details}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 3: AUDIT LOGIN LOGS */}
      {activeTab === 'auditLogins' && (
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e5e7eb',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
        }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#111827', margin: 0 }}>
              System Login Audit History
            </h3>
            <p style={{ fontSize: '12px', color: '#6b7280', margin: '3px 0 0' }}>
              Tracks administrator and user system authentication events
            </p>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                <th style={{ padding: '14px 16px', fontSize: '12.5px', fontWeight: 700, color: '#4b5563' }}>Timestamp</th>
                <th style={{ padding: '14px 16px', fontSize: '12.5px', fontWeight: 700, color: '#4b5563' }}>Username</th>
                <th style={{ padding: '14px 16px', fontSize: '12.5px', fontWeight: 700, color: '#4b5563' }}>Role</th>
                <th style={{ padding: '14px 16px', fontSize: '12.5px', fontWeight: 700, color: '#4b5563' }}>Action</th>
                <th style={{ padding: '14px 16px', fontSize: '12.5px', fontWeight: 700, color: '#4b5563' }}>IP Address</th>
                <th style={{ padding: '14px 16px', fontSize: '12.5px', fontWeight: 700, color: '#4b5563', textAlign: 'center' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredAuditLogins.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '36px', textAlign: 'center', color: '#9ca3af', fontSize: '14px' }}>
                    No login records.
                  </td>
                </tr>
              ) : (
                filteredAuditLogins.map(login => (
                  <tr key={login.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '14px 16px', fontSize: '12.5px', color: '#6b7280' }}>
                      {login.timestamp}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '13px', fontWeight: 700, color: '#111827' }}>
                      {login.username}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '12.5px', color: '#374151' }}>
                      {login.role}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '12.5px', color: '#374151' }}>
                      {login.action || 'Login'}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '12.5px', color: '#6b7280' }}>
                      {login.ip_address || '127.0.0.1'}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                      <span style={{
                        backgroundColor: '#dcfce7',
                        color: '#15803d',
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '12px'
                      }}>
                        {login.status || 'Success'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
