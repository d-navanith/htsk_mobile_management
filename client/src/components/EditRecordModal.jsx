import React, { useState, useEffect } from 'react';
import { X, Edit2, Clock, Smartphone, CheckCircle2, UserCheck, ArrowRightLeft } from 'lucide-react';

export default function EditRecordModal({ isOpen, onClose, onUpdate, record }) {
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

  const [empName, setEmpName] = useState('');
  const [shift, setShift] = useState('Day');
  const [group, setGroup] = useState('Group D');
  const [issuedAt, setIssuedAt] = useState('7.30 A.M.');
  const [returnTime, setReturnTime] = useState('');
  const [returnDevice, setReturnDevice] = useState('');
  const [takingDevice, setTakingDevice] = useState('');
  const [handoverTo, setHandoverTo] = useState('');
  const [replaceEmpName, setReplaceEmpName] = useState(false);
  const [sign, setSign] = useState('Done');

  const [shiftsList, setShiftsList] = useState(['Day', 'Night']);
  const [groupsList, setGroupsList] = useState(['Group A', 'Group B', 'Group C', 'Group D', 'Group AO']);

  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (record) {
      setEmpName(record.name || '');
      setShift(record.shift || 'Day');
      setGroup(record.group_name || record.group || 'Group D');
      setIssuedAt(record.issued_at || record.time || '7.30 A.M.');
      setReturnTime(record.return_time !== undefined && record.return_time !== null ? record.return_time : '');
      setReturnDevice(record.return_device || '');
      setTakingDevice(record.taking_device || '');
      setHandoverTo(record.handover_to || '');
      setSign(record.sign || 'Done');
      setReplaceEmpName(false);
      setError('');
    }
  }, [record]);

  if (!isOpen || !record) return null;

  const handleSubmit = async e => {
    e.preventDefault();
    if (!empName.trim()) {
      setError('EMP. Name cannot be empty.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      await onUpdate(record.id, {
        name: empName.trim(),
        shift: shift.trim() || 'Day',
        group: group.trim() || 'Group D',
        issued_at: issuedAt.trim(),
        return_time: returnTime.trim(),
        return_device: returnDevice.trim(),
        taking_device: takingDevice.trim(),
        handover_to: handoverTo.trim(),
        sign: sign || 'Done',
        replaceEmpName: Boolean(replaceEmpName)
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to update record.');
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
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
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
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#111827', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Edit2 size={18} color="#eab308" />
              <span>Edit Record #{record.id}</span>
            </h3>
            <p style={{ fontSize: '12.5px', color: '#6b7280', margin: '3px 0 0' }}>
              Update employee device record, shifts, return/taking details, or complete shift handover
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

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {error && (
            <div style={{
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#b91c1c',
              padding: '10px 14px',
              borderRadius: '10px',
              fontSize: '13px'
            }}>
              {error}
            </div>
          )}

          {/* Row 1: EMP Name & Shift */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>
                EMP. Name
              </label>
              <input
                type="text"
                value={empName}
                onChange={e => setEmpName(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1.5px solid #d1d5db',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>
                Shift
              </label>
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
            </div>
          </div>

          {/* Row 2: Group & Times */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>
                Group
              </label>
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
                {groupsList.map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 700, color: '#374151' }}>
                  Return Time
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {returnTime ? (
                    <button
                      type="button"
                      onClick={() => setReturnTime('')}
                      style={{ fontSize: '11px', color: '#ef4444', cursor: 'pointer' }}
                    >
                      Clear
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => {
                      const t = formatCurrentTime();
                      setReturnTime(t);
                      setSign('Done');
                    }}
                    style={{ fontSize: '11px', color: '#16a34a', cursor: 'pointer' }}
                  >
                    Mark Returned
                  </button>
                </div>
              </div>
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

          {/* TWO DISTINCT AREAS FOR DEVICE DETAILS */}
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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              {/* Return Device Area */}
              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  Return Device
                </label>
                <input
                  type="text"
                  placeholder="e.g. PN 56 or Cass 12"
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
              </div>

              {/* Taking Device Area */}
              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  Taking Device
                </label>
                <input
                  type="text"
                  placeholder="e.g. New 25 or PN 105"
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
              </div>
            </div>
          </div>

          {/* Row 4: Handover to & Handover replacement */}
          <div style={{
            backgroundColor: '#f0fdf4',
            border: '1.5px solid #bbf7d0',
            borderRadius: '14px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}>
            <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#166534', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ArrowRightLeft size={16} color="#16a34a" />
              <span>Shift Handover Process</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#166534', marginBottom: '4px' }}>
                  Handover to (Recipient Colleague)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Meera Nair"
                  value={handoverTo}
                  onChange={e => setHandoverTo(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #86efac',
                    fontSize: '13.5px',
                    backgroundColor: '#ffffff'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#166534', marginBottom: '4px' }}>
                  Sign Status
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setSign('Done')}
                    style={{
                      flex: 1,
                      padding: '9px',
                      borderRadius: '8px',
                      fontWeight: 700,
                      fontSize: '13px',
                      cursor: 'pointer',
                      border: sign === 'Done' ? '2px solid #16a34a' : '1px solid #bbf7d0',
                      backgroundColor: sign === 'Done' ? '#dcfce7' : '#ffffff',
                      color: sign === 'Done' ? '#166534' : '#4b5563'
                    }}
                  >
                    Done
                  </button>
                  <button
                    type="button"
                    onClick={() => setSign('Pending')}
                    style={{
                      flex: 1,
                      padding: '9px',
                      borderRadius: '8px',
                      fontWeight: 700,
                      fontSize: '13px',
                      cursor: 'pointer',
                      border: sign === 'Pending' ? '2px solid #ea580c' : '1px solid #bbf7d0',
                      backgroundColor: sign === 'Pending' ? '#fff7ed' : '#ffffff',
                      color: sign === 'Pending' ? '#ea580c' : '#4b5563'
                    }}
                  >
                    Pending
                  </button>
                </div>
              </div>
            </div>

            {/* Checkbox to replace EMP name as requested in user scenario */}
            {handoverTo && (
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '12.5px',
                color: '#166534',
                fontWeight: 600,
                cursor: 'pointer',
                marginTop: '4px'
              }}>
                <input
                  type="checkbox"
                  checked={replaceEmpName}
                  onChange={e => setReplaceEmpName(e.target.checked)}
                  style={{ accentColor: '#16a34a', width: '16px', height: '16px' }}
                />
                <span>
                  Replace EMP. Name with <strong>"{handoverTo}"</strong> as the active custodian (Arjun shift complete → Meera active user)
                </span>
              </label>
            )}
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
              {saving ? 'Updating...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
