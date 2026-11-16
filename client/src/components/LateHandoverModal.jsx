import React, { useState } from 'react';
import { X, Clock, ShieldCheck, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function LateHandoverModal({ isOpen, onClose, record, onSuccess }) {
  if (!isOpen || !record) return null;

  const [actualReceiver, setActualReceiver] = useState('');
  const [receiverGroup, setReceiverGroup] = useState(record.group || 'Group B');
  const [actualHandoverTime, setActualHandoverTime] = useState('06:05 PM');
  const [reason, setReason] = useState('Physical device was handed over at shift change, but both employees forgot to log into system at 06:00 PM.');
  const [enteredBy, setEnteredBy] = useState('Admin (IT Support)');
  const [approvedBy, setApprovedBy] = useState('Operations Manager');
  const [notes, setNotes] = useState('Confirmed physically with both Arjun Narayan and Shehan Perera during shift debrief.');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!actualReceiver.trim()) {
      setErrorMsg('Please specify the employee who physically received the device.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/records/late-handover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recordId: record.id,
          actualTime: actualHandoverTime,
          actualReceiver: actualReceiver.trim(),
          receiverGroup,
          reason: reason.trim(),
          enteredBy: enteredBy.trim(),
          approvedBy: approvedBy.trim(),
          notes: notes.trim()
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to record late handover');
      }

      onSuccess(data);
      onClose();
    } catch (err) {
      console.error('Late handover error:', err);
      setErrorMsg(err.message || 'An error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card" style={{ maxWidth: '640px' }}>
        <div className="modal-header" style={{ backgroundColor: '#fffbeb', borderBottom: '1px solid #fef3c7' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#fef3c7', color: '#b45309', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#92400e' }}>
                Record Approved Late Handover
              </h3>
              <p style={{ margin: 0, fontSize: '12px', color: '#b45309' }}>
                Traceable administrative correction for {record.device_id_code} ({record.device_model})
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

            <div style={{ padding: '12px 16px', backgroundColor: '#eff6ff', borderRadius: '10px', border: '1px solid #bfdbfe', fontSize: '12.5px', color: '#1e40af' }}>
              <strong>Audit Policy:</strong> Original custody record for <strong>{record.current_custodian}</strong> is strictly preserved. This action inserts an approved correction record with administrative sign-off without silently overwriting history.
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Last Documented Custodian (Outgoing)</label>
                <input
                  type="text"
                  value={record.current_custodian}
                  readOnly
                  style={{ backgroundColor: '#f3f4f6', fontWeight: 700 }}
                />
              </div>

              <div className="form-group">
                <label>Actual Physical Receiver *</label>
                <input
                  type="text"
                  placeholder="e.g. Shehan Perera"
                  value={actualReceiver}
                  onChange={e => setActualReceiver(e.target.value)}
                  required
                  style={{ fontWeight: 600 }}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Actual Handover Time (Estimated / Known)</label>
                <input
                  type="text"
                  value={actualHandoverTime}
                  onChange={e => setActualHandoverTime(e.target.value)}
                  placeholder="06:05 PM"
                />
              </div>

              <div className="form-group">
                <label>Receiver Group / Department</label>
                <select
                  value={receiverGroup}
                  onChange={e => setReceiverGroup(e.target.value)}
                >
                  <option value="Group A">Group A</option>
                  <option value="Group B">Group B</option>
                  <option value="Group C">Group C</option>
                  <option value="Group D">Group D</option>
                  <option value="Group AO">Group AO</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Reason for Missing Original Record *</label>
              <textarea
                rows={2}
                value={reason}
                onChange={e => setReason(e.target.value)}
                required
                placeholder="Explain why the handover was not registered in real-time"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Person Entering Correction *</label>
                <input
                  type="text"
                  value={enteredBy}
                  onChange={e => setEnteredBy(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Approving Administrator *</label>
                <input
                  type="text"
                  value={approvedBy}
                  onChange={e => setApprovedBy(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Supporting Investigation Remarks</label>
              <textarea
                rows={2}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Additional facts verified during administrative investigation"
              />
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
              <ShieldCheck size={16} />
              <span>{submitting ? 'Recording...' : 'Submit Approved Late Handover'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
