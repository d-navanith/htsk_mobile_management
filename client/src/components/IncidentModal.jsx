import React, { useState } from 'react';
import { X, AlertOctagon, HelpCircle, ShieldAlert, CheckCircle2 } from 'lucide-react';

export default function IncidentModal({ isOpen, onClose, record, onSuccess }) {
  if (!isOpen || !record) return null;

  const [incidentType, setIncidentType] = useState('Missing');
  const [reportedBy, setReportedBy] = useState('Floor Supervisor');
  const [shiftDiscovered, setShiftDiscovered] = useState(record.shift === 'Morning Shift' ? 'Night Shift' : 'Morning Shift');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const lastCustodian = record.current_custodian || record.name;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/records/missing-investigation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recordId: record.id,
          deviceIdCode: record.device_id_code,
          reportedBy,
          shift: shiftDiscovered,
          notes: `${incidentType}: ${details || 'Reported during shift audit.'}`
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to report incident');
      }

      onSuccess(data);
      onClose();
    } catch (err) {
      console.error('Incident report error:', err);
      setErrorMsg(err.message || 'An error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card" style={{ maxWidth: '640px' }}>
        <div className="modal-header" style={{ backgroundColor: '#fef2f2', borderBottom: '1px solid #fee2e2' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#fee2e2', color: '#b91c1c', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShieldAlert size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#991b1b' }}>
                Flag Discrepancy &amp; Open Investigation
              </h3>
              <p style={{ margin: 0, fontSize: '12px', color: '#b91c1c' }}>
                Accountability assessment for {record.device_id_code} ({record.device_model})
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

            {/* Critical Accountability Banner */}
            <div style={{ padding: '14px 16px', backgroundColor: '#fff7ed', borderRadius: '12px', border: '1px solid #fed7aa', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#c2410c', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertOctagon size={16} />
                <span>Chain of Custody Discrepancy Warning</span>
              </div>
              <p style={{ fontSize: '12.5px', color: '#9a3412', lineHeight: '1.4', margin: 0 }}>
                No confirmed handover record exists between <strong>{record.shift}</strong> and <strong>{shiftDiscovered}</strong>. The last documented custodian was <strong>{lastCustodian}</strong>.
              </p>
              <p style={{ fontSize: '11.5px', color: '#7c2d12', margin: 0, fontStyle: 'italic' }}>
                * System Rule: This flag does not automatically declare {lastCustodian} guilty. An administrative investigation is established to verify physical movements.
              </p>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Incident Classification</label>
                <select
                  value={incidentType}
                  onChange={e => setIncidentType(e.target.value)}
                >
                  <option value="Missing">Device Missing (No Handover Recorded)</option>
                  <option value="Bank application blocked">Bank Application Blocked</option>
                  <option value="Screen damaged">Screen Damaged / Unusable</option>
                  <option value="Battery problem">Battery Problem / Swelling</option>
                  <option value="Network / SIM problem">Network / SIM Problem</option>
                  <option value="Unreturned at Shift End">Unreturned at Shift End</option>
                </select>
              </div>

              <div className="form-group">
                <label>Discovered In Shift</label>
                <select
                  value={shiftDiscovered}
                  onChange={e => setShiftDiscovered(e.target.value)}
                >
                  <option value="Night Shift">Night Shift</option>
                  <option value="Morning Shift">Morning Shift</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Last Confirmed Custodian</label>
                <input
                  type="text"
                  value={lastCustodian}
                  readOnly
                  style={{ backgroundColor: '#f3f4f6', fontWeight: 700 }}
                />
              </div>

              <div className="form-group">
                <label>Reported By (Auditor / Supervisor)</label>
                <input
                  type="text"
                  value={reportedBy}
                  onChange={e => setReportedBy(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Investigation Notes &amp; Physical Search Details</label>
              <textarea
                rows={3}
                value={details}
                onChange={e => setDetails(e.target.value)}
                placeholder="Where was device last seen? Who had access to the station? Any witness statements?"
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
              style={{ backgroundColor: '#dc2626', borderColor: '#b91c1c', color: '#ffffff', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <AlertOctagon size={16} />
              <span>{submitting ? 'Opening Investigation...' : 'Start Investigation & Flag Discrepancy'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
