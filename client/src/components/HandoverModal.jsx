import React, { useState } from 'react';
import { X, ArrowRightLeft, Shield, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';

export default function HandoverModal({ isOpen, onClose, record, onSuccess, allEmployees = [] }) {
  if (!isOpen || !record) return null;

  const currentShift = record.shift || 'Morning Shift';
  const targetShift = currentShift === 'Morning Shift' ? 'Night Shift' : 'Morning Shift';

  const [outgoingName, setOutgoingName] = useState(record.current_custodian || record.name);
  const [outgoingId, setOutgoingId] = useState('EMP-' + String(record.id).padStart(4, '0'));
  const [incomingName, setIncomingName] = useState(targetShift === 'Night Shift' ? 'Shehan Perera' : '');
  const [incomingId, setIncomingId] = useState(targetShift === 'Night Shift' ? 'EMP-0842' : '');
  const [incomingGroup, setIncomingGroup] = useState(record.group || record.group_name || '');
  const [handoverTime, setHandoverTime] = useState(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  const [deviceCondition, setDeviceCondition] = useState(record.device_condition || 'Working');
  const [deviceIssues, setDeviceIssues] = useState(record.device_issues === 'None' ? '' : (record.device_issues || ''));
  const [accessories, setAccessories] = useState(record.accessories || 'Original Charger, Protective Case');
  const [handoverNotes, setHandoverNotes] = useState('Shift transition handover verified in person.');
  const [outgoingConfirmed, setOutgoingConfirmed] = useState(true);
  const [incomingConfirmed, setIncomingConfirmed] = useState(true);
  const [adminConfirmed, setAdminConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!incomingName.trim()) {
      setErrorMsg('Please enter or select the incoming employee who will receive the phone.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/handover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recordId: record.id,
          outgoingEmployee: outgoingName.trim(),
          incomingEmployee: incomingName.trim(),
          incomingGroup: incomingGroup.trim(),
          deviceIdCode: record.device_id_code,
          handoverTime,
          condition: deviceCondition,
          issuesRemarks: deviceIssues.trim() || 'None',
          accessories,
          handoverNotes,
          outgoingConfirmed,
          incomingConfirmed,
          adminConfirmed,
          adminApprover: adminConfirmed ? 'Admin Supervisor' : null
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to complete handover');
      }

      onSuccess(data);
      onClose();
    } catch (err) {
      console.error('Handover error:', err);
      setErrorMsg(err.message || 'An error occurred during handover.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card" style={{ maxWidth: '680px' }}>
        <div className="modal-header" style={{ backgroundColor: '#f4fce8', borderBottom: '1px solid #d9f99d' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#8fe022', color: '#1a6e3c', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ArrowRightLeft size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#1a6e3c' }}>
                Shift-Based Device Handover
              </h3>
              <p style={{ margin: 0, fontSize: '12px', color: '#4d7c0f' }}>
                Chain of custody transfer: {record.device_id_code} ({record.device_model})
              </p>
            </div>
          </div>
          <button onClick={onClose} className="modal-close-btn">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ gap: '20px' }}>
            {errorMsg && (
              <div style={{ padding: '12px 14px', borderRadius: '10px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Outgoing & Incoming Two-Column Card */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', backgroundColor: '#f9fafb', padding: '16px', borderRadius: '14px', border: '1px solid #e5e7eb' }}>
              {/* Outgoing Employee */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                  <span className="badge badge-amber" style={{ fontSize: '11px' }}>OUTGOING ({currentShift})</span>
                </div>
                <div className="form-group" style={{ marginBottom: '8px' }}>
                  <label style={{ fontSize: '11px' }}>Outgoing Custodian</label>
                  <input
                    type="text"
                    value={outgoingName}
                    readOnly
                    style={{ backgroundColor: '#f3f4f6', fontWeight: 600, color: '#1f2937' }}
                  />
                </div>
                <div className="form-group">
                  <label style={{ fontSize: '11px' }}>Current Device ID</label>
                  <input
                    type="text"
                    value={`${record.device_id_code} (${record.device_model})`}
                    readOnly
                    style={{ backgroundColor: '#f3f4f6', fontSize: '12px' }}
                  />
                </div>
              </div>

              {/* Incoming Employee */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                  <span className="badge badge-purple" style={{ fontSize: '11px' }}>INCOMING ({targetShift})</span>
                </div>
                <div className="form-group" style={{ marginBottom: '8px' }}>
                  <label style={{ fontSize: '11px' }}>Incoming Employee *</label>
                  <input
                    type="text"
                    placeholder="e.g. Shehan Perera"
                    value={incomingName}
                    onChange={e => setIncomingName(e.target.value)}
                    required
                    style={{ fontWeight: 600 }}
                  />
                </div>
                <div className="form-group">
                  <label style={{ fontSize: '11px' }}>Department / Group</label>
                  <select
                    value={incomingGroup}
                    onChange={e => setIncomingGroup(e.target.value)}
                  >
                    <option value="Group A">Group A</option>
                    <option value="Group B">Group B</option>
                    <option value="Group C">Group C</option>
                    <option value="Group D">Group D</option>
                    <option value="Group AO">Group AO</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Handover Details */}
            <div className="form-row">
              <div className="form-group">
                <label>Actual Handover Time</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    value={handoverTime}
                    onChange={e => setHandoverTime(e.target.value)}
                    placeholder="06:05 PM"
                  />
                  <Clock size={16} style={{ position: 'absolute', right: '12px', top: '12px', color: '#9ca3af' }} />
                </div>
              </div>

              <div className="form-group">
                <label>Physical Device Condition</label>
                <select
                  value={deviceCondition}
                  onChange={e => setDeviceCondition(e.target.value)}
                >
                  <option value="Working">Working (Normal Operating State)</option>
                  <option value="Damaged">Damaged (Requires Repair / Attention)</option>
                  <option value="Under Maintenance">Under Maintenance</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Device Issues / Remarks (Separate from Model)</label>
                <input
                  type="text"
                  placeholder="e.g. Bank blocked, Screen scratches, None"
                  value={deviceIssues}
                  onChange={e => setDeviceIssues(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Accessories Transferred</label>
                <input
                  type="text"
                  placeholder="e.g. Charger, Case, SIM pin"
                  value={accessories}
                  onChange={e => setAccessories(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Handover Notes / Audit Remarks</label>
              <textarea
                rows={2}
                value={handoverNotes}
                onChange={e => setHandoverNotes(e.target.value)}
                placeholder="Shift handover observations, battery level, etc."
              />
            </div>

            {/* Two-Party Acknowledgement Section */}
            <div style={{ backgroundColor: '#fcfdfa', border: '1px solid #e2ebd8', borderRadius: '14px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#1a6e3c', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Shield size={16} />
                <span>Mandatory Physical Acknowledgements</span>
              </div>

              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '12.5px', color: '#374151', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={outgoingConfirmed}
                  onChange={e => setOutgoingConfirmed(e.target.checked)}
                  style={{ marginTop: '3px' }}
                />
                <span>
                  <strong>Outgoing Confirmation:</strong> {outgoingName} confirms physical handover of {record.device_id_code} in the stated condition.
                </span>
              </label>

              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '12.5px', color: '#374151', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={incomingConfirmed}
                  onChange={e => setIncomingConfirmed(e.target.checked)}
                  style={{ marginTop: '3px' }}
                />
                <span>
                  <strong>Incoming Confirmation:</strong> {incomingName || 'Receiver'} confirms physical receipt and inspection of {record.device_id_code}.
                  {!incomingConfirmed && (
                    <span style={{ display: 'block', color: '#c2410c', fontSize: '11.5px', marginTop: '2px' }}>
                      (If unchecked, handover remains "Handover Pending" and outgoing employee remains documented custodian)
                    </span>
                  )}
                </span>
              </label>

              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '12.5px', color: '#4b5563', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={adminConfirmed}
                  onChange={e => setAdminConfirmed(e.target.checked)}
                  style={{ marginTop: '3px' }}
                />
                <span>
                  <strong>Supervisor / Admin Verification:</strong> Documented shift handover verified by administrator.
                </span>
              </label>
            </div>
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
              <span>{submitting ? 'Recording Handover...' : (incomingConfirmed ? 'Complete & Confirm Handover' : 'Initiate Handover (Pending Receipt)')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
