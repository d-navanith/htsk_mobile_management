import React, { useState } from 'react';
import { X, ArrowDownLeft, ShieldCheck, CheckCircle2 } from 'lucide-react';

export default function ReturnInventoryModal({ isOpen, onClose, record, onSuccess }) {
  if (!isOpen || !record) return null;

  const [returnTime, setReturnTime] = useState(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  const [deviceCondition, setDeviceCondition] = useState(record.device_condition || 'Working');
  const [remarks, setRemarks] = useState('Routine return to central inventory. Physical inspection completed.');
  const [adminName, setAdminName] = useState('IT Admin / Inventory Supervisor');
  const [adminAccepted, setAdminAccepted] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!adminAccepted) {
      setErrorMsg('Device cannot become Available until administrator confirms physical acceptance.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/records/return-inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recordId: record.id,
          returnedBy: record.current_custodian || record.name,
          returnTime,
          condition: deviceCondition,
          remarks: remarks.trim() || 'None',
          adminName
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to process return');
      }

      onSuccess(data);
      onClose();
    } catch (err) {
      console.error('Return error:', err);
      setErrorMsg(err.message || 'An error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card" style={{ maxWidth: '600px' }}>
        <div className="modal-header" style={{ backgroundColor: '#eff6ff', borderBottom: '1px solid #dbeafe' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#dbeafe', color: '#1e40af', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ArrowDownLeft size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#1e40af' }}>
                Return Device to Company Inventory
              </h3>
              <p style={{ margin: 0, fontSize: '12px', color: '#3b82f6' }}>
                End employee custody: {record.device_id_code} ({record.device_model})
              </p>
            </div>
          </div>
          <button onClick={onClose} className="modal-close-btn">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ gap: '16px' }}>
            {errorMsg && (
              <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', fontSize: '13px' }}>
                {errorMsg}
              </div>
            )}

            <div style={{ padding: '12px 14px', backgroundColor: '#f0fdf4', borderRadius: '10px', border: '1px solid #bbf7d0', fontSize: '12.5px', color: '#166534' }}>
              <strong>Inventory Acceptance Rule:</strong> Arjun's custody ends and the device becomes <strong>Available</strong> in company stock only upon physical acceptance.
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Returning Employee</label>
                <input
                  type="text"
                  value={record.current_custodian || record.name}
                  readOnly
                  style={{ backgroundColor: '#f3f4f6', fontWeight: 700 }}
                />
              </div>

              <div className="form-group">
                <label>Device ID</label>
                <input
                  type="text"
                  value={`${record.device_id_code} - ${record.device_model}`}
                  readOnly
                  style={{ backgroundColor: '#f3f4f6' }}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Actual Return Time</label>
                <input
                  type="text"
                  value={returnTime}
                  onChange={e => setReturnTime(e.target.value)}
                  placeholder="07:55 PM"
                />
              </div>

              <div className="form-group">
                <label>Returned Condition</label>
                <select
                  value={deviceCondition}
                  onChange={e => setDeviceCondition(e.target.value)}
                >
                  <option value="Working">Working (Normal Functional)</option>
                  <option value="Damaged">Damaged (Requires Tech Check)</option>
                  <option value="Under Maintenance">Under Maintenance</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Receiving Administrator / Tech Staff *</label>
              <input
                type="text"
                value={adminName}
                onChange={e => setAdminName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Inspection Remarks</label>
              <textarea
                rows={2}
                value={remarks}
                onChange={e => setRemarks(e.target.value)}
                placeholder="Physical condition, screen, charger status..."
              />
            </div>

            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '13px', color: '#1e40af', backgroundColor: '#eff6ff', padding: '12px', borderRadius: '10px', border: '1px solid #bfdbfe', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={adminAccepted}
                onChange={e => setAdminAccepted(e.target.checked)}
                style={{ marginTop: '2px' }}
              />
              <span>
                <strong>Administrator Physical Confirmation:</strong> I confirm physical acceptance and verification of this mobile unit into storage.
              </span>
            </label>
          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary-lime"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <CheckCircle2 size={16} />
              <span>{submitting ? 'Processing Return...' : 'Accept Return & Mark Available'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
