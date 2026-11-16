import React, { useState, useEffect } from 'react';
import { X, History, Shield, Smartphone, Clock, User, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';

export default function CustodyModal({ isOpen, onClose, deviceIdCode, record }) {
  if (!isOpen) return null;

  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      try {
        const idToQuery = deviceIdCode || (record && record.device_id_code) || 'Pn 34';
        const res = await fetch(`/api/custody/${encodeURIComponent(idToQuery)}`);
        const data = await res.json();
        if (data.success) {
          setHistory(data.data || []);
        }
      } catch (err) {
        console.error('Error fetching custody history:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [deviceIdCode, record]);

  const targetDeviceId = deviceIdCode || (record && record.device_id_code) || 'Pn 34';
  const targetModel = record ? record.device_model : 'Mobile Device';

  return (
    <div className="modal-backdrop">
      <div className="modal-card" style={{ maxWidth: '820px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#e0f2fe', color: '#0369a1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <History size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#111827' }}>
                Complete Chain of Custody History
              </h3>
              <p style={{ margin: 0, fontSize: '12px', color: '#6b7280' }}>
                Audit trail for Device {targetDeviceId} ({targetModel}) across shifts
              </p>
            </div>
          </div>
          <button onClick={onClose} className="modal-close-btn">
            <X size={20} />
          </button>
        </div>

        <div className="modal-body" style={{ gap: '16px', maxHeight: '70vh' }}>
          {/* Device Current Overview Card */}
          {record && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', backgroundColor: '#f8fafc', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <div>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>DEVICE ID</div>
                <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>{record.device_id_code}</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>CURRENT CUSTODIAN</div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#16a34a' }}>{record.current_custodian}</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>ACTIVE SHIFT</div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#2563eb' }}>{record.shift}</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>STATUS</div>
                <span className={`badge ${record.device_status === 'In Use' ? 'badge-green' : record.device_status === 'Available' ? 'badge-blue' : 'badge-amber'}`}>
                  {record.device_status}
                </span>
              </div>
            </div>
          )}

          {/* Custody Chain History Table */}
          <div className="table-card" style={{ boxShadow: 'none', border: '1px solid #e5e7eb' }}>
            <div className="data-table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '130px' }}>Date / Time</th>
                    <th>Documented Custodian</th>
                    <th>Action</th>
                    <th>Shift</th>
                    <th>Condition</th>
                    <th>Remarks &amp; Audit Notes</th>
                    <th>Acknowledgements</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: '#9ca3af' }}>
                        Loading custody audit history...
                      </td>
                    </tr>
                  ) : history.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: '#9ca3af' }}>
                        No previous shift custody records found for {targetDeviceId}.
                      </td>
                    </tr>
                  ) : (
                    history.map((h, i) => (
                      <tr key={h.id || i}>
                        <td className="col-center" style={{ fontSize: '12px', whiteSpace: 'nowrap', color: '#4b5563' }}>
                          {new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          <div style={{ fontSize: '10.5px', color: '#9ca3af' }}>{new Date(h.timestamp).toLocaleDateString()}</div>
                        </td>
                        <td style={{ fontWeight: 700, color: '#111827' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <User size={13} style={{ color: '#2563eb' }} />
                            <span>{h.employee_name}</span>
                          </div>
                        </td>
                        <td>
                          <span style={{ fontWeight: 600, color: '#374151', fontSize: '12.5px' }}>
                            {h.action}
                          </span>
                        </td>
                        <td className="col-center">
                          <span className={`badge ${h.shift === 'Morning Shift' ? 'badge-morning' : 'badge-night'}`} style={{ fontSize: '11px' }}>
                            {h.shift || 'Morning Shift'}
                          </span>
                        </td>
                        <td className="col-center">
                          <span className={`badge ${h.condition === 'Working' ? 'badge-green' : 'badge-amber'}`} style={{ fontSize: '11px' }}>
                            {h.condition || 'Working'}
                          </span>
                        </td>
                        <td style={{ fontSize: '12px', color: '#4b5563', maxWidth: '240px' }}>
                          <div>{h.notes || h.issues_remarks || 'Normal shift transfer'}</div>
                          {h.outgoing_employee && h.incoming_employee && (
                            <div style={{ fontSize: '11px', color: '#0369a1', marginTop: '2px', fontWeight: 600 }}>
                              {h.outgoing_employee} ➔ {h.incoming_employee}
                            </div>
                          )}
                        </td>
                        <td className="col-center" style={{ fontSize: '11.5px' }}>
                          {h.outgoing_confirmed && h.incoming_confirmed ? (
                            <span style={{ color: '#16a34a', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                              <CheckCircle2 size={13} /> Both Confirmed
                            </span>
                          ) : h.outgoing_confirmed ? (
                            <span style={{ color: '#d97706', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                              <Clock size={13} /> Outgoing Only
                            </span>
                          ) : (
                            <span style={{ color: '#dc2626', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                              <AlertTriangle size={13} /> Unconfirmed
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" onClick={onClose} className="btn-secondary">
            Close Audit View
          </button>
        </div>
      </div>
    </div>
  );
}
