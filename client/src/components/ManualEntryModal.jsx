import React, { useState, useEffect } from 'react';
import { X, Clock, Plus, Smartphone, CheckCircle2, AlertCircle } from 'lucide-react';

export default function ManualEntryModal({ isOpen, onClose, onSave, groups = [] }) {
  const formatCurrentTime = () => {
    const now = new Date();
    let hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'P.M.' : 'A.M.';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const formattedHours = String(hours).padStart(2, '0');
    return `${formattedHours}.${minutes} ${ampm}`;
  };

  const [shiftsList, setShiftsList] = useState(['Day', 'Night']);
  const [groupsList, setGroupsList] = useState(['Group A', 'Group B', 'Group C', 'Group D', 'Group AO']);
  
  const [empName, setEmpName] = useState('');
  const [shift, setShift] = useState('Day');
  const [group, setGroup] = useState('');
  const [issuedAt, setIssuedAt] = useState('7.30 A.M.');
  const [returnTime, setReturnTime] = useState('');
  const [returnDevice, setReturnDevice] = useState('');
  const [takingDevice, setTakingDevice] = useState('');
  const [handoverTo, setHandoverTo] = useState('');
  const [sign, setSign] = useState('Done');
  
  // Custom Shift / Group addition states
  const [showAddShift, setShowAddShift] = useState(false);
  const [newShiftInput, setNewShiftInput] = useState('');
  const [showAddGroup, setShowAddGroup] = useState(false);
  const [newGroupInput, setNewGroupInput] = useState('');

  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // Fetch shifts & groups on open
  useEffect(() => {
    if (isOpen) {
      fetch('/api/shifts')
        .then(r => r.json())
        .then(d => {
          if (d.success && d.data) {
            setShiftsList(d.data.map(s => s.shift_name));
          }
        })
        .catch(() => {});

      fetch('/api/groups')
        .then(r => r.json())
        .then(d => {
          if (d.success && d.data) {
            setGroupsList(d.data.map(g => g.group_name));
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAddNewShift = async () => {
    const s = newShiftInput.trim();
    if (!s) return;
    try {
      await fetch('/api/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shift_name: s })
      });
      setShiftsList(prev => [...prev, s]);
      setShift(s);
      setNewShiftInput('');
      setShowAddShift(false);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddNewGroup = async () => {
    const g = newGroupInput.trim();
    if (!g) return;
    try {
      await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ group_name: g })
      });
      setGroupsList(prev => [...prev, g]);
      setGroup(g);
      setNewGroupInput('');
      setShowAddGroup(false);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!empName.trim()) {
      setError('EMP. Name is required.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      await onSave({
        name: empName.trim(),
        shift: shift.trim() || 'Day',
        group: (group || '').trim(),
        issued_at: issuedAt.trim() || '7.30 A.M.',
        return_time: returnTime ? returnTime.trim() : '',
        return_device: returnDevice.trim(),
        taking_device: takingDevice.trim(),
        handover_to: handoverTo.trim(),
        sign: sign || 'Done'
      });

      // Reset
      setEmpName('');
      setReturnDevice('');
      setTakingDevice('');
      setHandoverTo('');
      setSign('Done');
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save record.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div
        className="modal-card"
        onClick={e => e.stopPropagation()}
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '20px',
          width: '100%',
          maxWidth: '680px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#f9fafb'
        }}>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#111827', margin: 0 }}>
              Add Mobile Management Record
            </h3>
            <p style={{ fontSize: '12.5px', color: '#6b7280', margin: '3px 0 0' }}>
              Rec. No. - Auto Increment | Mobile Device Issue &amp; Handover
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '9999px',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#6b7280'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {error && (
            <div style={{
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#b91c1c',
              padding: '10px 14px',
              borderRadius: '10px',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Row 1: EMP Name & Shift */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>
                EMP. Name <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Arjun Narayan"
                value={empName}
                onChange={e => setEmpName(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1.5px solid #d1d5db',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 700, color: '#374151' }}>
                  Shift
                </label>
                <button
                  type="button"
                  onClick={() => setShowAddShift(!showAddShift)}
                  style={{ fontSize: '11px', color: '#16a34a', fontWeight: 600, cursor: 'pointer' }}
                >
                  + Add Shift
                </button>
              </div>

              {showAddShift ? (
                <div style={{ display: 'flex', gap: '6px' }}>
                  <input
                    type="text"
                    placeholder="New shift name"
                    value={newShiftInput}
                    onChange={e => setNewShiftInput(e.target.value)}
                    style={{ flex: 1, padding: '8px 10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '12px' }}
                  />
                  <button
                    type="button"
                    onClick={handleAddNewShift}
                    style={{ backgroundColor: '#84cc16', color: '#000', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 700 }}
                  >
                    Save
                  </button>
                </div>
              ) : (
                <select
                  value={shift}
                  onChange={e => setShift(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1.5px solid #d1d5db',
                    fontSize: '14px',
                    outline: 'none',
                    backgroundColor: '#ffffff'
                  }}
                >
                  {shiftsList.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Row 2: Group & Times */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 700, color: '#374151' }}>
                  Group
                </label>
                <button
                  type="button"
                  onClick={() => setShowAddGroup(!showAddGroup)}
                  style={{ fontSize: '11px', color: '#16a34a', fontWeight: 600, cursor: 'pointer' }}
                >
                  + Add Group
                </button>
              </div>

              {showAddGroup ? (
                <div style={{ display: 'flex', gap: '6px' }}>
                  <input
                    type="text"
                    placeholder="New Group"
                    value={newGroupInput}
                    onChange={e => setNewGroupInput(e.target.value)}
                    style={{ flex: 1, padding: '8px 8px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '12px' }}
                  />
                  <button
                    type="button"
                    onClick={handleAddNewGroup}
                    style={{ backgroundColor: '#84cc16', color: '#000', padding: '6px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: 700 }}
                  >
                    Save
                  </button>
                </div>
              ) : (
                <select
                  value={group}
                  onChange={e => setGroup(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: '1.5px solid #d1d5db',
                    fontSize: '14px',
                    outline: 'none',
                    backgroundColor: '#ffffff'
                  }}
                >
                  <option value="">(None / Empty)</option>
                  {groupsList.map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 700, color: '#374151' }}>
                  Issued At
                </label>
                <button
                  type="button"
                  onClick={() => setIssuedAt(formatCurrentTime())}
                  style={{ fontSize: '11px', color: '#2563eb', cursor: 'pointer' }}
                >
                  Now
                </button>
              </div>
              <input
                type="text"
                placeholder="7.30 A.M."
                value={issuedAt}
                onChange={e => setIssuedAt(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  border: '1.5px solid #d1d5db',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>
                Return Time (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. 09.55 P.M. (or leave empty)"
                value={returnTime}
                onChange={e => setReturnTime(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  border: '1.5px solid #d1d5db',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          {/* TWO DISTINCT AREAS FOR DEVICE DETAILS matching user's exact specification */}
          <div style={{
            backgroundColor: '#f8fafc',
            border: '1.5px solid #e2e8f0',
            borderRadius: '14px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Smartphone size={16} color="#0284c7" />
              <span>Device Details (Return Area &amp; Taking Area)</span>
            </div>
            <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
              Specify returning device (if employee is returning a phone) and taking device (new phone being issued).
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              {/* Return Device Area */}
              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  Return Device(s) (Returning Phones)
                </label>
                <input
                  type="text"
                  placeholder="e.g. PN 56 or Cass 12, PN 14"
                  value={returnDevice}
                  onChange={e => setReturnDevice(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13.5px',
                    backgroundColor: '#ffffff'
                  }}
                />
                <span style={{ fontSize: '11px', color: '#64748b' }}>Return 1 or multiple phones (separated by comma)</span>
              </div>

              {/* Taking Device Area */}
              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  Taking Device(s) (Issued Phones)
                </label>
                <input
                  type="text"
                  placeholder="e.g. New 25 or PN 56, NEW 25"
                  value={takingDevice}
                  onChange={e => setTakingDevice(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13.5px',
                    backgroundColor: '#ffffff'
                  }}
                />
                <span style={{ fontSize: '11px', color: '#64748b' }}>Take 1 or multiple phones (separated by comma)</span>
              </div>
            </div>
          </div>

          {/* Row 4: Handover to & Sign */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>
                Handover to (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Meera Nair (Next shift receiver)"
                value={handoverTo}
                onChange={e => setHandoverTo(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1.5px solid #d1d5db',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
              <span style={{ fontSize: '11px', color: '#6b7280' }}>
                If employee handed over phone to incoming shift colleague
              </span>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>
                Sign Status
              </label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setSign('Done')}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '10px',
                    fontWeight: 700,
                    fontSize: '13.5px',
                    cursor: 'pointer',
                    border: sign === 'Done' ? '2px solid #16a34a' : '1px solid #d1d5db',
                    backgroundColor: sign === 'Done' ? '#f0fdf4' : '#ffffff',
                    color: sign === 'Done' ? '#16a34a' : '#4b5563'
                  }}
                >
                  Done
                </button>
                <button
                  type="button"
                  onClick={() => setSign('Pending')}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '10px',
                    fontWeight: 700,
                    fontSize: '13.5px',
                    cursor: 'pointer',
                    border: sign === 'Pending' ? '2px solid #ea580c' : '1px solid #d1d5db',
                    backgroundColor: sign === 'Pending' ? '#fff7ed' : '#ffffff',
                    color: sign === 'Pending' ? '#ea580c' : '#4b5563'
                  }}
                >
                  Pending
                </button>
              </div>
              <span style={{ fontSize: '11px', color: '#6b7280' }}>
                Pending triggers "Need an Update" counter
              </span>
            </div>
          </div>

          {/* Submit buttons */}
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px',
            marginTop: '10px',
            paddingTop: '16px',
            borderTop: '1px solid #e5e7eb'
          }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '10px 20px',
                borderRadius: '10px',
                border: '1px solid #d1d5db',
                backgroundColor: '#ffffff',
                color: '#374151',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              style={{
                padding: '10px 26px',
                borderRadius: '10px',
                border: 'none',
                backgroundColor: '#84cc16',
                color: '#000000',
                fontSize: '14px',
                fontWeight: 800,
                cursor: 'pointer'
              }}
            >
              {saving ? 'Saving...' : 'Add Record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
